-- Set user's active group
CREATE OR REPLACE FUNCTION set_user_active_bubble(p_user_id UUID, p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_exists BOOLEAN;
  group_exists BOOLEAN;
  user_in_group BOOLEAN;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RETURN FALSE;
  END IF;

  -- Check if group exists
  SELECT EXISTS(SELECT 1 FROM groups WHERE id = p_group_id) INTO group_exists;
  IF NOT group_exists THEN
    RETURN FALSE;
  END IF;

  -- Check if user belongs to the group
  SELECT EXISTS(
    SELECT 1 FROM group_members
    WHERE user_id = p_user_id
    AND group_id = p_group_id
    AND status = 'joined'
  ) INTO user_in_group;

  IF NOT user_in_group THEN
    RETURN FALSE;
  END IF;

  -- Set active group
  UPDATE users
  SET active_group_id = p_group_id,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;
