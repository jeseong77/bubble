-- Find matching groups
CREATE OR REPLACE FUNCTION find_matching_group(
  p_group_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  group_gender TEXT,
  preferred_gender TEXT,
  match_score INTEGER
) AS $$
DECLARE
  v_current_group record;
  v_total_groups INTEGER;
  v_matching_groups INTEGER;
BEGIN
  -- Get current group info
  SELECT * INTO v_current_group
  FROM groups WHERE id = p_group_id;

  -- Debug: Log current group info
  RAISE NOTICE 'Current group: id=%, name=%, group_gender=%, preferred_gender=%, status=%, max_size=%',
    v_current_group.id, v_current_group.name, v_current_group.group_gender,
    v_current_group.preferred_gender, v_current_group.status, v_current_group.max_size;

  -- Debug: Count total available groups (ONLY FULL groups)
  SELECT COUNT(*) INTO v_total_groups
  FROM groups g
  WHERE g.id != p_group_id
    AND g.status = 'full';

  RAISE NOTICE 'Total available groups (excluding current): %', v_total_groups;

  -- Debug: Count groups that match exact opposite preferences AND same size (ONLY FULL groups)
  SELECT COUNT(*) INTO v_matching_groups
  FROM groups g
  WHERE g.id != p_group_id
    AND g.status = 'full'
    AND g.max_size = v_current_group.max_size  -- Same group size only
    AND (
      -- Exact opposite match only: my group gender = their preference AND their group gender = my preference
      g.group_gender = v_current_group.preferred_gender
      AND v_current_group.group_gender = g.preferred_gender
    );

  RAISE NOTICE 'Groups matching gender preferences and size: %', v_matching_groups;

  -- Return matching groups based on exact opposite matching rules AND same size
  RETURN QUERY
  SELECT
    g.id as group_id,
    g.name as group_name,
    g.group_gender,
    g.preferred_gender,
    100 as match_score  -- All matches are equal since we only show exact matches
  FROM groups g
  WHERE g.id != p_group_id
    AND g.status = 'full'  -- Only show fully formed groups
    AND g.max_size = v_current_group.max_size  -- Same group size only
    AND g.id NOT IN (
      SELECT DISTINCT group_1_id FROM matches WHERE group_2_id = p_group_id
      UNION
      SELECT DISTINCT group_2_id FROM matches WHERE group_1_id = p_group_id
    )
    AND (
      -- Exact opposite match only: my group gender = their preference AND their group gender = my preference
      g.group_gender = v_current_group.preferred_gender
      AND v_current_group.group_gender = g.preferred_gender
    )
  ORDER BY g.created_at ASC  -- Order by creation time since all matches are equal
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
