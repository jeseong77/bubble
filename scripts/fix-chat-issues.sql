-- Fix Chat and Matching Issues
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Create get_my_matches RPC function for chat list
CREATE OR REPLACE FUNCTION get_my_matches()
RETURNS TABLE (
  match_id UUID,
  chat_room_id UUID,
  other_group_name TEXT,
  other_group_id UUID,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  current_user_group_id UUID;
BEGIN
  -- Get current user ID from auth context
  current_user_id := auth.uid();
  
  -- Get user's current group
  SELECT active_group_id INTO current_user_group_id
  FROM users 
  WHERE id = current_user_id;
  
  -- If no active group, try to find any joined group
  IF current_user_group_id IS NULL THEN
    SELECT gm.group_id INTO current_user_group_id
    FROM group_members gm
    WHERE gm.user_id = current_user_id 
      AND gm.status = 'joined'
    LIMIT 1;
  END IF;
  
  -- Return empty if user has no group
  IF current_user_group_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return matches for the user's group
  RETURN QUERY
  SELECT 
    m.id as match_id,
    cr.id as chat_room_id,
    CASE 
      WHEN m.group1_id = current_user_group_id THEN g2.name
      ELSE g1.name
    END as other_group_name,
    CASE 
      WHEN m.group1_id = current_user_group_id THEN m.group2_id
      ELSE m.group1_id
    END as other_group_id,
    (
      SELECT cm.content
      FROM chat_messages cm
      WHERE cm.room_id = cr.id
      ORDER BY cm.created_at DESC
      LIMIT 1
    ) as last_message,
    (
      SELECT cm.created_at
      FROM chat_messages cm
      WHERE cm.room_id = cr.id
      ORDER BY cm.created_at DESC
      LIMIT 1
    ) as last_message_time,
    m.created_at
  FROM matches m
  JOIN chat_rooms cr ON m.id = cr.match_id
  JOIN groups g1 ON m.group1_id = g1.id
  JOIN groups g2 ON m.group2_id = g2.id
  WHERE (m.group1_id = current_user_group_id OR m.group2_id = current_user_group_id)
    AND m.status = 'active'
  ORDER BY COALESCE(
    (SELECT cm.created_at FROM chat_messages cm WHERE cm.room_id = cr.id ORDER BY cm.created_at DESC LIMIT 1),
    m.created_at
  ) DESC;
END;
$$;

-- 2. Fix the like_group function with proper group-to-group matching
CREATE OR REPLACE FUNCTION like_group(
  p_from_group_id UUID,
  p_to_group_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_like_id UUID;
  v_reverse_like_id UUID;
  v_match_id UUID;
  v_chat_room_id UUID;
  v_result JSON;
  current_user_id UUID;
BEGIN
  -- Get current user ID from auth context
  current_user_id := auth.uid();
  
  -- Verify user is member of the from_group
  IF NOT EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = p_from_group_id 
      AND user_id = current_user_id 
      AND status = 'joined'
  ) THEN
    RETURN json_build_object(
      'status', 'error',
      'message', 'User is not a member of the sending group.'
    );
  END IF;

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
    WHERE (group1_id = p_from_group_id AND group2_id = p_to_group_id)
       OR (group1_id = p_to_group_id AND group2_id = p_from_group_id);

    -- Create match if it doesn't exist
    IF v_match_id IS NULL THEN
      INSERT INTO matches (group1_id, group2_id, status, created_at)
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

    -- Return matched status with chat room ID
    v_result := json_build_object(
      'status', 'matched',
      'chat_room_id', v_chat_room_id,
      'match_id', v_match_id
    );
  ELSE
    -- Return liked status (no match yet)
    v_result := json_build_object(
      'status', 'liked',
      'like_id', v_existing_like_id
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

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION get_my_matches() TO anon;
GRANT EXECUTE ON FUNCTION get_my_matches() TO authenticated;
GRANT EXECUTE ON FUNCTION like_group(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION like_group(UUID, UUID) TO authenticated;

-- 4. Add some group members for testing (if needed)
-- Note: This might fail due to RLS policies, run manually if needed
INSERT INTO group_members (group_id, user_id, status, joined_at)
VALUES 
  ((SELECT id FROM groups WHERE name = 'TestF2'), (SELECT id FROM users WHERE first_name = 'Miyeon'), 'joined', NOW()),
  ((SELECT id FROM groups WHERE name = 'TestF3'), (SELECT id FROM users WHERE first_name = 'Natty'), 'joined', NOW())
ON CONFLICT (group_id, user_id) DO UPDATE SET 
  status = 'joined',
  joined_at = NOW();