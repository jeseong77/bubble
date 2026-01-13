-- Get specific group info (joined users only)
DROP FUNCTION IF EXISTS get_bubble(uuid);

CREATE OR REPLACE FUNCTION get_bubble(p_group_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  max_size INTEGER,
  members JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.max_size,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', gm.user_id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'age', CASE
            WHEN u.birth_date IS NOT NULL
            THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.birth_date))::INTEGER
            ELSE NULL
          END,
          'avatar_url', (
            SELECT ui.image_url
            FROM user_images ui
            WHERE ui.user_id = gm.user_id
            ORDER BY ui.position ASC
            LIMIT 1
          )
        )
      ) FILTER (WHERE gm.user_id IS NOT NULL),
      '[]'::jsonb
    ) as members
  FROM groups g
  JOIN group_members gm ON g.id = gm.group_id
  JOIN users u ON gm.user_id = u.id
  WHERE g.id = p_group_id
    AND gm.status = 'joined'
  GROUP BY g.id, g.name, g.max_size;
END;
$$;
