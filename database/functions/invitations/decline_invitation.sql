-- Decline invitation
CREATE OR REPLACE FUNCTION decline_invitation(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE group_members
  SET status = 'declined', declined_at = NOW()
  WHERE group_id = p_group_id AND user_id = p_user_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
