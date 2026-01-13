-- Get user's groups (joined users only, debug added) - NEW VERSION
CREATE OR REPLACE FUNCTION get_my_bubbles_v2(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    status TEXT,
    max_size INTEGER,
    members JSON,
    user_status TEXT,
    invited_at TIMESTAMPTZ,
    creator JSON
) AS $$
DECLARE
  v_group_count INTEGER;
  v_member_count INTEGER;
BEGIN
  -- Debug logging
  RAISE NOTICE '[get_my_bubbles_v2] Called for user: %', p_user_id;

  -- Count total groups for this user
  SELECT COUNT(*) INTO v_group_count
  FROM groups g
  JOIN group_members gm ON g.id = gm.group_id
  WHERE gm.user_id = p_user_id AND gm.status IN ('joined', 'invited');

  RAISE NOTICE '[get_my_bubbles_v2] Found % groups for user', v_group_count;

  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.status,
    g.max_size,
    -- Create member list for each group as JSON array - ALL members including joined and invited
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
          AND gm2.status IN ('joined', 'invited')  -- Include both joined and invited members
        ORDER BY
          CASE WHEN gm2.user_id = p_user_id THEN 1 ELSE 2 END,  -- Put requesting user first
          gm2.joined_at ASC  -- Then order by join time
      ),
      '[]'::json
    ) as members,
    gm.status as user_status,
    gm.invited_at,
    -- Add group creator info
    COALESCE(
      (
        SELECT json_build_object(
          'id', creator_user.id,
          'first_name', creator_user.first_name,
          'last_name', creator_user.last_name,
          'avatar_url', (
            SELECT ui.image_url
            FROM user_images ui
            WHERE ui.user_id = creator_user.id
            ORDER BY ui.position ASC
            LIMIT 1
          )
        )
        FROM users creator_user
        WHERE creator_user.id = g.creator_id
      ),
      '{}'::json
    ) as creator
  FROM
    groups g
  JOIN
    group_members gm ON g.id = gm.group_id
  WHERE
    gm.user_id = p_user_id
    AND gm.status IN ('joined', 'invited')
  ORDER BY
    CASE gm.status
      WHEN 'joined' THEN 1
      WHEN 'invited' THEN 2
    END,
    g.created_at DESC;

  -- Debug: Log what we're returning
  GET DIAGNOSTICS v_member_count = ROW_COUNT;
  RAISE NOTICE '[get_my_bubbles_v2] Returning % rows', v_member_count;
END;
$$ LANGUAGE plpgsql;
