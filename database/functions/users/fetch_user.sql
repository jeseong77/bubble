-- Get user detail info
CREATE OR REPLACE FUNCTION fetch_user(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  birth_date DATE,
  height_cm INTEGER,
  mbti TEXT,
  gender TEXT,
  bio TEXT,
  location TEXT,
  profile_setup_completed BOOLEAN,
  images JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.birth_date,
    u.height_cm,
    u.mbti,
    u.gender,
    u.bio,
    u.location,
    u.profile_setup_completed,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'image_url', ui.image_url,
          'position', ui.position
        )
      ) FILTER (WHERE ui.image_url IS NOT NULL),
      '[]'::jsonb
    ) as images
  FROM users u
  LEFT JOIN user_images ui ON u.id = ui.user_id
  WHERE u.id = p_user_id
  GROUP BY u.id, u.first_name, u.last_name, u.birth_date, u.height_cm, u.mbti, u.gender, u.about_me, u.location, u.profile_setup_completed;
END;
$$ LANGUAGE plpgsql;
