-- Search users
CREATE OR REPLACE FUNCTION search_users(p_search_term TEXT, p_exclude_user_id UUID, p_exclude_group_id UUID)
RETURNS TABLE (
  id UUID,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  birth_date DATE,
  height_cm INTEGER,
  mbti TEXT,
  gender TEXT,
  bio TEXT,
  location TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.first_name,
    u.last_name,
    u.birth_date,
    u.height_cm,
    u.mbti,
    u.gender,
    u.bio,
    u.location,
    (
      SELECT ui.image_url
      FROM user_images ui
      WHERE ui.user_id = u.id
      ORDER BY ui.position ASC
      LIMIT 1
    ) as avatar_url
  FROM users u
  WHERE u.id != p_exclude_user_id
    AND u.profile_setup_completed = TRUE
    AND u.username ILIKE '%' || p_search_term || '%'
    AND (p_exclude_group_id IS NULL OR u.id NOT IN (
      SELECT user_id FROM group_members WHERE group_id = p_exclude_group_id
    ));
END;
$$ LANGUAGE plpgsql;
