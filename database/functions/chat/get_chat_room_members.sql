-- Get all members from both groups in a chat room for profile display
CREATE OR REPLACE FUNCTION get_chat_room_members(p_chat_room_id UUID)
RETURNS JSON AS $$
DECLARE
  v_match_id UUID;
  v_group_1_id UUID;
  v_group_2_id UUID;
  v_my_group_id UUID;
  v_other_group_id UUID;
  v_current_user_id UUID;
  result JSON;
  member_count INTEGER;
  member_record RECORD;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO v_current_user_id;

  RAISE NOTICE '[get_chat_room_members] Called for chat room: % by user: %', p_chat_room_id, v_current_user_id;

  -- Get match info from chat room
  SELECT cr.match_id, m.group_1_id, m.group_2_id
  INTO v_match_id, v_group_1_id, v_group_2_id
  FROM chat_rooms cr
  JOIN matches m ON cr.match_id = m.id
  WHERE cr.id = p_chat_room_id;

  IF v_match_id IS NULL THEN
    RAISE NOTICE '[get_chat_room_members] Chat room not found or no match';
    RETURN json_build_object(
      'success', false,
      'error', 'Chat room not found or no associated match',
      'all_members', '[]'::json,
      'total_members', 0
    );
  END IF;

  RAISE NOTICE '[get_chat_room_members] Group 1: %, Group 2: %', v_group_1_id, v_group_2_id;

  -- Debug: Show ALL members from both groups regardless of status
  FOR member_record IN
    SELECT u.first_name, u.last_name, gm.status, gm.group_id
    FROM group_members gm
    JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id IN (v_group_1_id, v_group_2_id)
  LOOP
    RAISE NOTICE '[get_chat_room_members] Found member: % % (status: %, group: %)',
      member_record.first_name, member_record.last_name, member_record.status, member_record.group_id;
  END LOOP;

  -- Simply get ALL members from BOTH groups with status = 'joined'
  SELECT json_build_object(
    'success', true,
    'match_id', v_match_id,
    'all_members', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', u.id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'birth_date', u.birth_date,
          'age', EXTRACT(YEAR FROM age(CURRENT_DATE, u.birth_date)),
          'gender', u.gender,
          'bio', u.bio,
          'group_id', gm.group_id,
          'images', (
            SELECT COALESCE(json_agg(
              json_build_object(
                'id', ui.id,
                'image_url', ui.image_url,
                'position', ui.position
              ) ORDER BY ui.position
            ), '[]'::json)
            FROM user_images ui
            WHERE ui.user_id = u.id
          ),
          'primary_image', (
            SELECT ui.image_url
            FROM user_images ui
            WHERE ui.user_id = u.id
            ORDER BY ui.position ASC
            LIMIT 1
          )
        ) ORDER BY gm.joined_at ASC
      ), '[]'::json)
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id IN (v_group_1_id, v_group_2_id)
        AND gm.status = 'joined'
    ),
    'total_members', (
      SELECT COUNT(*)
      FROM group_members gm
      WHERE gm.group_id IN (v_group_1_id, v_group_2_id)
        AND gm.status = 'joined'
    )
  ) INTO result;

  RAISE NOTICE '[get_chat_room_members] Returning result for % total members',
    (SELECT COUNT(*) FROM group_members WHERE group_id IN (v_group_1_id, v_group_2_id) AND status = 'joined');

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[get_chat_room_members] Exception: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'all_members', '[]'::json,
      'total_members', 0
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_chat_room_members(UUID) TO authenticated;
