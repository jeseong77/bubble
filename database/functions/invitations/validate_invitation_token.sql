-- Function to validate and consume invitation token
CREATE OR REPLACE FUNCTION validate_invitation_token(
  p_group_id UUID,
  p_token TEXT
)
RETURNS JSON AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  RAISE NOTICE '[validate_invitation_token] 🔍 Validating token: % for group: %', p_token, p_group_id;

  -- Find and validate token
  SELECT
    id, group_id, token, created_by, expires_at, used_at, used_by, is_active
  INTO v_token_record
  FROM invitation_tokens
  WHERE token = p_token AND group_id = p_group_id;

  IF NOT FOUND THEN
    RAISE NOTICE '[validate_invitation_token] ❌ Token not found';
    RETURN json_build_object(
      'valid', false,
      'error', 'TOKEN_NOT_FOUND',
      'message', 'Invalid invitation link'
    );
  END IF;

  -- Check if token is active
  IF NOT v_token_record.is_active THEN
    RAISE NOTICE '[validate_invitation_token] ❌ Token is inactive';
    RETURN json_build_object(
      'valid', false,
      'error', 'TOKEN_INACTIVE',
      'message', 'This invitation link has been deactivated'
    );
  END IF;

  -- Check if token has expired
  IF NOW() > v_token_record.expires_at THEN
    RAISE NOTICE '[validate_invitation_token] ❌ Token expired: %', v_token_record.expires_at;
    RETURN json_build_object(
      'valid', false,
      'error', 'TOKEN_EXPIRED',
      'message', 'This invitation link has expired'
    );
  END IF;

  -- Check if token has already been used
  IF v_token_record.used_at IS NOT NULL THEN
    RAISE NOTICE '[validate_invitation_token] ❌ Token already used at: %', v_token_record.used_at;
    RETURN json_build_object(
      'valid', false,
      'error', 'TOKEN_USED',
      'message', 'This invitation link has already been used'
    );
  END IF;

  RAISE NOTICE '[validate_invitation_token] ✅ Token is valid';
  RETURN json_build_object(
    'valid', true,
    'token_id', v_token_record.id,
    'created_by', v_token_record.created_by,
    'expires_at', v_token_record.expires_at
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[validate_invitation_token] ❌ Exception: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN json_build_object(
      'valid', false,
      'error', 'INTERNAL_ERROR',
      'message', 'Error validating invitation token'
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_invitation_token(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_invitation_token(UUID, TEXT) TO authenticated;
