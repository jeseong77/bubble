-- Updated like_group function with swipe limits
CREATE OR REPLACE FUNCTION like_group(
  p_from_group_id UUID,
  p_to_group_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_swipe_limit_info JSON;
  v_can_swipe BOOLEAN;
  v_existing_like_id UUID;
  v_reverse_like_id UUID;
  v_match_id UUID;
  v_chat_room_id UUID;
  v_result JSON;
BEGIN
  -- Check daily swipe limit first
  SELECT check_daily_swipe_limit(p_from_group_id) INTO v_swipe_limit_info;
  v_can_swipe := (v_swipe_limit_info->>'can_swipe')::BOOLEAN;

  -- Return limit exceeded error if no swipes remaining
  IF NOT v_can_swipe THEN
    RETURN json_build_object(
      'status', 'limit_exceeded',
      'message', 'Daily swipe limit reached',
      'swipe_info', v_swipe_limit_info
    );
  END IF;

  -- Increment swipe count
  SELECT increment_daily_swipe_count(p_from_group_id) INTO v_swipe_limit_info;

  -- Check if this like already exists
  SELECT id INTO v_existing_like_id
  FROM likes
  WHERE from_group_id = p_from_group_id
    AND to_group_id = p_to_group_id;

  -- If like doesn't exist, create it
  IF v_existing_like_id IS NULL THEN
    INSERT INTO likes (from_group_id, to_group_id, created_at)
    VALUES (p_from_group_id, p_to_group_id, NOW())
    RETURNING id INTO v_existing_like_id;
  END IF;

  -- Check if the target group already liked us back (mutual like)
  SELECT id INTO v_reverse_like_id
  FROM likes
  WHERE from_group_id = p_to_group_id
    AND to_group_id = p_from_group_id;

  -- If mutual like exists, create a match and chat room
  IF v_reverse_like_id IS NOT NULL THEN
    -- Check if match already exists
    SELECT id INTO v_match_id
    FROM matches
    WHERE (group_1_id = p_from_group_id AND group_2_id = p_to_group_id)
       OR (group_1_id = p_to_group_id AND group_2_id = p_from_group_id);

    -- Create match if it doesn't exist
    IF v_match_id IS NULL THEN
      INSERT INTO matches (group_1_id, group_2_id, status, created_at)
      VALUES (p_from_group_id, p_to_group_id, 'active', NOW())
      RETURNING id INTO v_match_id;
    END IF;

    -- Check if chat room already exists
    SELECT id INTO v_chat_room_id
    FROM chat_rooms
    WHERE match_id = v_match_id;

    -- Create chat room if it doesn't exist
    IF v_chat_room_id IS NULL THEN
      INSERT INTO chat_rooms (match_id, created_at)
      VALUES (v_match_id, NOW())
      RETURNING id INTO v_chat_room_id;
    END IF;

    -- Return matched status with chat room ID and updated swipe info
    v_result := json_build_object(
      'status', 'matched',
      'chat_room_id', v_chat_room_id,
      'match_id', v_match_id,
      'swipe_info', v_swipe_limit_info
    );
  ELSE
    -- Return liked status (no match yet) with updated swipe info
    v_result := json_build_object(
      'status', 'liked',
      'like_id', v_existing_like_id,
      'swipe_info', v_swipe_limit_info
    );
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error status
    RETURN json_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION like_group(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION like_group(UUID, UUID) TO authenticated;
