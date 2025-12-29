-- Function to get groups that have liked the current user's group
CREATE OR REPLACE FUNCTION get_incoming_likes(
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
  v_total_incoming INTEGER;
BEGIN
  -- Get current group info
  SELECT * INTO v_current_group
  FROM groups WHERE id = p_group_id;

  -- Debug: Log current group info
  RAISE NOTICE 'Getting incoming likes for group: id=%, name=%, group_gender=%, preferred_gender=%, status=%',
    v_current_group.id, v_current_group.name, v_current_group.group_gender,
    v_current_group.preferred_gender, v_current_group.status;

  -- Count total incoming likes (excluding already matched groups)
  SELECT COUNT(*) INTO v_total_incoming
  FROM likes l
  JOIN groups g ON l.from_group_id = g.id
  WHERE l.to_group_id = p_group_id
    AND g.status = 'full'
    -- Exclude groups we already matched with
    AND NOT EXISTS (
      SELECT 1 FROM matches m
      WHERE (m.group_1_id = l.from_group_id AND m.group_2_id = p_group_id)
         OR (m.group_1_id = p_group_id AND m.group_2_id = l.from_group_id)
    )
    -- Exclude groups we passed on
    AND NOT EXISTS (
      SELECT 1 FROM group_passes gp
      WHERE gp.from_group_id = p_group_id AND gp.to_group_id = l.from_group_id
    );

  RAISE NOTICE 'Total incoming likes available: %', v_total_incoming;

  -- Return groups that liked this group
  RETURN QUERY
  SELECT
    g.id as group_id,
    g.name as group_name,
    g.group_gender,
    g.preferred_gender,
    85 as match_score  -- Fixed high score since they already liked us
  FROM likes l
  JOIN groups g ON l.from_group_id = g.id
  WHERE l.to_group_id = p_group_id
    AND g.status = 'full'
    -- Exclude groups we already matched with
    AND NOT EXISTS (
      SELECT 1 FROM matches m
      WHERE (m.group_1_id = l.from_group_id AND m.group_2_id = p_group_id)
         OR (m.group_1_id = p_group_id AND m.group_2_id = l.from_group_id)
    )
    -- Exclude groups we passed on
    AND NOT EXISTS (
      SELECT 1 FROM group_passes gp
      WHERE gp.from_group_id = p_group_id AND gp.to_group_id = l.from_group_id
    )
  ORDER BY l.created_at DESC  -- Most recent likes first
  LIMIT p_limit
  OFFSET p_offset;

  RAISE NOTICE 'Returned incoming likes with limit=%, offset=%', p_limit, p_offset;

END;
$$ LANGUAGE plpgsql;
