-- User leaves group (bubble popping)
-- Note: "Popping" a bubble destroys it for ALL members
CREATE OR REPLACE FUNCTION leave_group(p_user_id UUID, p_group_id UUID)
RETURNS JSON AS $$
DECLARE
  v_group_name TEXT;
  v_popper_name TEXT;
  v_affected_users UUID[];
  v_users_cleared INTEGER;
  v_members_deleted INTEGER;
  v_creator_id UUID;
BEGIN
  -- Start transaction for atomic bubble popping
  -- Debug logging
  RAISE NOTICE '[leave_group] User % popping group %', p_user_id, p_group_id;

  -- Check if user is actually in the group
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE user_id = p_user_id AND group_id = p_group_id AND status = 'joined'
  ) THEN
    RAISE NOTICE '[leave_group] User is not a member of this group';
    RETURN json_build_object('success', false, 'message', 'User is not a member of this group');
  END IF;

  -- Get group details including creator
  SELECT g.name, g.creator_id, u.first_name
  INTO v_group_name, v_creator_id, v_popper_name
  FROM groups g, users u
  WHERE g.id = p_group_id AND u.id = p_user_id;

  -- Get list of all users who will be affected (for notifications)
  SELECT array_agg(DISTINCT user_id) INTO v_affected_users
  FROM group_members
  WHERE group_id = p_group_id AND status = 'joined' AND user_id != p_user_id;

  RAISE NOTICE '[leave_group] Group "%" (creator: %) popped by "%", affecting % other users',
    COALESCE(v_group_name, 'Unnamed'), v_creator_id, v_popper_name, array_length(v_affected_users, 1);

  -- POPPING BEHAVIOR: Always destroy the entire bubble for everyone

  -- Step 1: Clear active_group_id for ALL users pointing to this group (including creator)
  UPDATE users
  SET active_group_id = NULL
  WHERE active_group_id = p_group_id;

  GET DIAGNOSTICS v_users_cleared = ROW_COUNT;
  RAISE NOTICE '[leave_group] Cleared active_group_id for % users', v_users_cleared;

  -- Step 2: Remove ALL group members (this also removes foreign key references)
  DELETE FROM group_members WHERE group_id = p_group_id;

  GET DIAGNOSTICS v_members_deleted = ROW_COUNT;
  RAISE NOTICE '[leave_group] Removed % group members', v_members_deleted;

  -- Step 3: Clear any other potential foreign key references
  -- Clear from likes table
  DELETE FROM likes WHERE from_group_id = p_group_id OR to_group_id = p_group_id;

  -- Clear from matches table
  DELETE FROM matches WHERE group_1_id = p_group_id OR group_2_id = p_group_id;

  RAISE NOTICE '[leave_group] Cleared related records (likes, matches)';

  -- Step 4: Finally delete the group itself
  DELETE FROM groups WHERE id = p_group_id;

  -- Verify deletion succeeded
  IF NOT FOUND THEN
    RAISE NOTICE '[leave_group] Group deletion failed - group may not exist';
    RETURN json_build_object('success', false, 'message', 'Group deletion failed');
  END IF;

  RAISE NOTICE '[leave_group] Bubble completely destroyed';

  -- Return success with notification data
  RETURN json_build_object(
    'success', true,
    'message', 'Bubble popped successfully',
    'group_name', COALESCE(v_group_name, 'Unnamed Bubble'),
    'popper_name', v_popper_name,
    'affected_users', COALESCE(v_affected_users, '{}'),
    'debug_info', json_build_object(
      'users_cleared', v_users_cleared,
      'members_deleted', v_members_deleted,
      'creator_id', v_creator_id
    )
  );

EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE NOTICE '[leave_group] Foreign key violation: %. SQLSTATE: %, Detail: %', SQLERRM, SQLSTATE, SQLERRM;
    RETURN json_build_object(
      'success', false,
      'message', 'Database constraint error',
      'error_detail', SQLERRM,
      'error_code', SQLSTATE
    );
  WHEN OTHERS THEN
    RAISE NOTICE '[leave_group] Unexpected error: %. SQLSTATE: %', SQLERRM, SQLSTATE;
    RETURN json_build_object(
      'success', false,
      'message', 'Unexpected error occurred',
      'error_detail', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;
