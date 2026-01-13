-- Get group member status
CREATE OR REPLACE FUNCTION get_group_member_statuses(p_group_id UUID)
RETURNS TABLE (
  user_id UUID,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT gm.user_id, gm.status
  FROM group_members gm
  WHERE gm.group_id = p_group_id;
END;
$$ LANGUAGE plpgsql;
