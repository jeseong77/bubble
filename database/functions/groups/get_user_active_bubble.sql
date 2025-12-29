-- Get user's active group
CREATE OR REPLACE FUNCTION get_user_active_bubble(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    status TEXT,
    members JSON,
    user_status TEXT,
    invited_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.status,
    -- Create member list for each group as JSON array (joined status only)
    COALESCE(
      (
        SELECT json_agg(
          -- Create each member info as JSON object.
          json_build_object(
            'id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'status', gm2.status,
            -- Create image list for each member as JSON array again.
            'images', (
              SELECT COALESCE(json_agg(
                json_build_object(
                  'id', ui.id,
                  -- Use public URL directly (remove storage.get_public_url())
                  'image_url', ui.image_url,
                  'position', ui.position
                ) ORDER BY ui.position
              ), '[]'::json)
              FROM user_images ui
              WHERE ui.user_id = u.id
            )
          )
        )
        FROM group_members gm2
        JOIN users u ON gm2.user_id = u.id
        WHERE gm2.group_id = g.id
          AND gm2.status = 'joined'
      ),
      '[]'::json
    ) as members,
    gm.status as user_status,
    gm.invited_at
  FROM
    groups g
  JOIN
    group_members gm ON g.id = gm.group_id
  JOIN
    users u ON u.id = p_user_id
  WHERE
    gm.user_id = p_user_id
    AND gm.status = 'joined'
    AND g.id = u.active_group_id;
END;
$$;
