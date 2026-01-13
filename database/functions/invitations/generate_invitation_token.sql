-- Function to generate secure invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token(
  p_group_id UUID,
  p_created_by UUID,
  p_expires_hours INTEGER DEFAULT 168 -- Default 7 days (168 hours)
)
RETURNS JSON AS $$
DECLARE
  v_token TEXT;
  v_token_id UUID;
  v_group_name TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  RAISE NOTICE '[generate_invitation_token] 🎫 Generating token for group: %, created_by: %', p_group_id, p_created_by;

  -- Check if group exists and user is a member
  SELECT name INTO v_group_name
  FROM groups g
  WHERE g.id = p_group_id
  AND EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = p_group_id
    AND gm.user_id = p_created_by
    AND gm.status = 'joined'
  );

  IF NOT FOUND THEN
    RAISE NOTICE '[generate_invitation_token] ❌ Group not found or user not a member';
    RETURN json_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'You must be a member of this bubble to generate invitations'
    );
  END IF;

  -- Generate unique token (8-character alphanumeric)
  v_token := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_expires_at := NOW() + (p_expires_hours * INTERVAL '1 hour');

  -- Deactivate any existing tokens for this group (optional - allows only one active token per group)
  UPDATE invitation_tokens
  SET is_active = false
  WHERE group_id = p_group_id AND is_active = true;

  -- Insert new token
  INSERT INTO invitation_tokens (group_id, token, created_by, expires_at)
  VALUES (p_group_id, v_token, p_created_by, v_expires_at)
  RETURNING id INTO v_token_id;

  RAISE NOTICE '[generate_invitation_token] ✅ Token generated: % (expires: %)', v_token, v_expires_at;

  RETURN json_build_object(
    'success', true,
    'token_id', v_token_id,
    'token', v_token,
    'group_id', p_group_id,
    'group_name', v_group_name,
    'expires_at', v_expires_at,
    'invite_link', format('bubble://join/%s/%s', p_group_id::text, v_token)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[generate_invitation_token] ❌ Exception: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN json_build_object(
      'success', false,
      'error', 'INTERNAL_ERROR',
      'message', 'Failed to generate invitation token',
      'sql_error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_invitation_token(UUID, UUID, INTEGER) TO authenticated;
