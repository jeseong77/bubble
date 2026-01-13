-- Accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(p_group_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_group_status TEXT;
  v_max_size INTEGER;
  v_joined_count INTEGER;
  v_cleaned_up_count INTEGER := 0;
  v_group_name TEXT;
  v_user_name TEXT;
  v_result JSON;
BEGIN
  -- Start transaction and lock the group row to prevent race conditions
  SELECT status, max_size, name INTO v_group_status, v_max_size, v_group_name
  FROM groups
  WHERE id = p_group_id
  FOR UPDATE;

  -- Check if group exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'GROUP_NOT_FOUND',
      'message', 'Group does not exist'
    );
  END IF;

  -- Check if group is still accepting members
  IF v_group_status != 'forming' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'GROUP_NOT_FORMING',
      'message', 'This bubble is no longer accepting new members',
      'group_status', v_group_status
    );
  END IF;

  -- Check if user has a pending invitation
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id AND status = 'invited'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'NO_PENDING_INVITATION',
      'message', 'You do not have a pending invitation to this group'
    );
  END IF;

  -- Count current joined members
  SELECT COUNT(*) INTO v_joined_count
  FROM group_members
  WHERE group_id = p_group_id AND status = 'joined';

  -- Check if there's space available
  IF v_joined_count >= v_max_size THEN
    RETURN json_build_object(
      'success', false,
      'error', 'GROUP_FULL',
      'message', 'This bubble is already full',
      'max_size', v_max_size,
      'current_size', v_joined_count
    );
  END IF;

  -- Accept the invitation (update member status) and increment current_num_users atomically
  UPDATE group_members
  SET status = 'joined', joined_at = NOW()
  WHERE group_id = p_group_id AND user_id = p_user_id;

  -- Increment current_num_users atomically
  UPDATE groups
  SET current_num_users = current_num_users + 1, updated_at = NOW()
  WHERE id = p_group_id;

  -- Get user name for response
  SELECT CONCAT(first_name, ' ', last_name) INTO v_user_name
  FROM users WHERE id = p_user_id;

  -- Get updated current_num_users from groups table (more efficient than counting)
  SELECT current_num_users INTO v_joined_count
  FROM groups
  WHERE id = p_group_id;

  -- Debug logging
  RAISE NOTICE '[accept_invitation] Group %, Max size: %, Current num users: %', p_group_id, v_max_size, v_joined_count;
  RAISE NOTICE '[accept_invitation] Checking if % >= % to update to full', v_joined_count, v_max_size;

  -- Check if group is now full after this acceptance
  IF v_joined_count >= v_max_size THEN
    -- Update group status to 'full'
    UPDATE groups
    SET status = 'full', updated_at = NOW()
    WHERE id = p_group_id;

    -- Debug logging for group status update
    RAISE NOTICE '[accept_invitation] ✅ Group % status updated to FULL', p_group_id;

    -- Clean up all remaining pending invitations
    DELETE FROM group_members
    WHERE group_id = p_group_id AND status = 'invited';

    GET DIAGNOSTICS v_cleaned_up_count = ROW_COUNT;

    -- Debug logging for cleanup
    RAISE NOTICE '[accept_invitation] 🧹 Cleaned up % pending invitations', v_cleaned_up_count;

    RETURN json_build_object(
      'success', true,
      'message', 'Invitation accepted successfully',
      'group_id', p_group_id,
      'group_name', v_group_name,
      'user_name', v_user_name,
      'group_full', true,
      'new_group_status', 'full',
      'final_size', v_joined_count,
      'max_size', v_max_size,
      'cleaned_up_invitations', v_cleaned_up_count
    );
  ELSE
    -- Debug logging when group is not yet full
    RAISE NOTICE '[accept_invitation] ⏳ Group % not yet full (%/%)', p_group_id, v_joined_count, v_max_size;

    RETURN json_build_object(
      'success', true,
      'message', 'Invitation accepted successfully',
      'group_id', p_group_id,
      'group_name', v_group_name,
      'user_name', v_user_name,
      'group_full', false,
      'new_group_status', 'forming',
      'current_size', v_joined_count,
      'max_size', v_max_size,
      'cleaned_up_invitations', 0
    );
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INTERNAL_ERROR',
      'message', 'An internal error occurred',
      'sql_error', SQLERRM,
      'sql_state', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;
