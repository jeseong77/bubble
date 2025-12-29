-- Updated direct join function with token validation
CREATE OR REPLACE FUNCTION join_bubble_direct(
  p_group_id UUID,
  p_user_id UUID,
  p_invite_token TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_group_record RECORD;
  v_user_record RECORD;
  v_joined_count INTEGER;
  v_cleaned_up_count INTEGER := 0;
  v_final_joined_count INTEGER;
  v_token_validation JSON;
  v_token_id UUID;
BEGIN
  RAISE NOTICE '[join_bubble_direct] 🎯 Direct join attempt: user=%, group=%, token=%', p_user_id, p_group_id, p_invite_token;

  -- If token is provided, validate it first
  IF p_invite_token IS NOT NULL THEN
    RAISE NOTICE '[join_bubble_direct] 🔐 Validating invitation token';
    SELECT validate_invitation_token(p_group_id, p_invite_token) INTO v_token_validation;

    RAISE NOTICE '[join_bubble_direct] Token validation result: %', v_token_validation;

    IF NOT (v_token_validation->>'valid')::BOOLEAN THEN
      RAISE NOTICE '[join_bubble_direct] ❌ Token validation failed';
      RETURN json_build_object(
        'success', false,
        'error', v_token_validation->>'error',
        'message', v_token_validation->>'message'
      );
    END IF;

    -- Extract token_id for later use
    v_token_id := (v_token_validation->>'token_id')::UUID;
    RAISE NOTICE '[join_bubble_direct] ✅ Token validated successfully, token_id: %', v_token_id;
  END IF;

  -- Lock group row to prevent race conditions
  SELECT id, name, status, max_size, creator_id INTO v_group_record
  FROM groups
  WHERE id = p_group_id
  FOR UPDATE;

  -- Check if group exists
  IF NOT FOUND THEN
    RAISE NOTICE '[join_bubble_direct] ❌ Group not found: %', p_group_id;
    RETURN json_build_object(
      'success', false,
      'error', 'GROUP_NOT_FOUND',
      'message', 'This bubble no longer exists'
    );
  END IF;

  RAISE NOTICE '[join_bubble_direct] 📋 Group found: name=%, status=%, max_size=%',
    v_group_record.name, v_group_record.status, v_group_record.max_size;

  -- Check if group is still accepting members
  IF v_group_record.status != 'forming' THEN
    RAISE NOTICE '[join_bubble_direct] ❌ Group not forming: status=%', v_group_record.status;
    RETURN json_build_object(
      'success', false,
      'error', 'GROUP_NOT_FORMING',
      'message', 'This bubble is no longer accepting new members',
      'group_status', v_group_record.status
    );
  END IF;

  -- Get user info
  SELECT id, first_name, last_name, gender INTO v_user_record
  FROM users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE NOTICE '[join_bubble_direct] ❌ User not found: %', p_user_id;
    RETURN json_build_object(
      'success', false,
      'error', 'USER_NOT_FOUND',
      'message', 'User does not exist'
    );
  END IF;

  RAISE NOTICE '[join_bubble_direct] 👤 User found: name=% %, gender=%',
    v_user_record.first_name, v_user_record.last_name, v_user_record.gender;

  -- Check if user is already a member of this group
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id
    AND status IN ('joined', 'invited')
  ) THEN
    RAISE NOTICE '[join_bubble_direct] ⚠️ User already member of group';
    RETURN json_build_object(
      'success', false,
      'error', 'ALREADY_MEMBER',
      'message', 'You are already a member of this bubble'
    );
  END IF;

  -- Check if user is already in another active group
  IF EXISTS (
    SELECT 1 FROM users WHERE id = p_user_id AND active_group_id IS NOT NULL
  ) THEN
    RAISE NOTICE '[join_bubble_direct] ⚠️ User already in another active group';
    RETURN json_build_object(
      'success', false,
      'error', 'ALREADY_IN_GROUP',
      'message', 'You can only be in one bubble at a time. Please leave your current bubble first.'
    );
  END IF;

  -- Count current joined members
  SELECT COUNT(*) INTO v_joined_count
  FROM group_members
  WHERE group_id = p_group_id AND status = 'joined';

  RAISE NOTICE '[join_bubble_direct] 📊 Current members: %/%, creator_id=%',
    v_joined_count, v_group_record.max_size, v_group_record.creator_id;

  -- Check if group is already full
  IF v_joined_count >= v_group_record.max_size THEN
    RAISE NOTICE '[join_bubble_direct] ❌ Group is full: %/%', v_joined_count, v_group_record.max_size;
    RETURN json_build_object(
      'success', false,
      'error', 'GROUP_FULL',
      'message', 'This bubble is already full',
      'current_size', v_joined_count,
      'max_size', v_group_record.max_size
    );
  END IF;

  -- All checks passed - add user to group with 'joined' status directly
  INSERT INTO group_members (group_id, user_id, status, joined_at)
  VALUES (p_group_id, p_user_id, 'joined', NOW())
  ON CONFLICT (group_id, user_id) DO UPDATE
  SET status = 'joined', joined_at = NOW();

  RAISE NOTICE '[join_bubble_direct] ✅ User added to group successfully';

  -- Update user's active_group_id
  UPDATE users
  SET active_group_id = p_group_id
  WHERE id = p_user_id;

  RAISE NOTICE '[join_bubble_direct] ✅ User active_group_id updated';

  -- Mark token as used if it was provided
  IF v_token_id IS NOT NULL THEN
    UPDATE invitation_tokens
    SET used_at = NOW(), used_by = p_user_id, is_active = false
    WHERE id = v_token_id;
    RAISE NOTICE '[join_bubble_direct] 🎫 Token marked as used: %', v_token_id;
  END IF;

  -- Count final joined members
  SELECT COUNT(*) INTO v_final_joined_count
  FROM group_members
  WHERE group_id = p_group_id AND status = 'joined';

  RAISE NOTICE '[join_bubble_direct] 📊 Final member count: %/%', v_final_joined_count, v_group_record.max_size;

  -- Check if group is now full
  IF v_final_joined_count >= v_group_record.max_size THEN
    -- Update group status to 'full'
    UPDATE groups
    SET status = 'full', updated_at = NOW()
    WHERE id = p_group_id;

    RAISE NOTICE '[join_bubble_direct] 🎉 Group is now FULL! Status updated.';

    -- Clean up any remaining pending invitations
    DELETE FROM group_members
    WHERE group_id = p_group_id AND status = 'invited';

    GET DIAGNOSTICS v_cleaned_up_count = ROW_COUNT;
    RAISE NOTICE '[join_bubble_direct] 🧹 Cleaned up % pending invitations', v_cleaned_up_count;

    RETURN json_build_object(
      'success', true,
      'message', format('Successfully joined "%s"! The bubble is now full! 🎉', v_group_record.name),
      'group_id', p_group_id,
      'group_name', v_group_record.name,
      'user_name', format('%s %s', v_user_record.first_name, v_user_record.last_name),
      'group_full', true,
      'new_group_status', 'full',
      'final_size', v_final_joined_count,
      'max_size', v_group_record.max_size,
      'cleaned_up_invitations', v_cleaned_up_count,
      'join_type', 'direct'
    );
  ELSE
    RAISE NOTICE '[join_bubble_direct] ⏳ Group not yet full (%/%)', v_final_joined_count, v_group_record.max_size;

    RETURN json_build_object(
      'success', true,
      'message', format('Successfully joined "%s"!', v_group_record.name),
      'group_id', p_group_id,
      'group_name', v_group_record.name,
      'user_name', format('%s %s', v_user_record.first_name, v_user_record.last_name),
      'group_full', false,
      'new_group_status', 'forming',
      'current_size', v_final_joined_count,
      'max_size', v_group_record.max_size,
      'cleaned_up_invitations', 0,
      'join_type', 'direct'
    );
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[join_bubble_direct] ❌ Exception: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN json_build_object(
      'success', false,
      'error', 'INTERNAL_ERROR',
      'message', 'An internal error occurred while joining the bubble',
      'sql_error', SQLERRM,
      'sql_state', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION join_bubble_direct(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION join_bubble_direct(UUID, UUID, TEXT) TO authenticated;
