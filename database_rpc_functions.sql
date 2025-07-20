-- 11. 내가 참여한 버블 목록 조회 RPC (joined 상태만)
CREATE OR REPLACE FUNCTION get_my_bubbles(
  p_user_id UUID
) RETURNS TABLE (
  id UUID,
  name TEXT,
  status TEXT,
  members JSON,
  user_status TEXT,
  invited_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.status,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', (
              SELECT image_url 
              FROM user_images 
              WHERE user_id = u.id 
              ORDER BY position 
              LIMIT 1
            ),
            'status', gm2.status
          )
        )
        FROM group_members gm2
        JOIN users u ON gm2.user_id = u.id
        WHERE gm2.group_id = g.id
      ),
      '[]'::json
    ) as members,
    gm.status as user_status,  -- 현재 유저의 상태 추가
    gm.invited_at  -- 초대 시간 추가
  FROM groups g
  JOIN group_members gm ON g.id = gm.group_id
  WHERE gm.user_id = p_user_id 
    AND gm.status IN ('joined', 'invited')  -- joined와 invited 모두 포함
  ORDER BY 
    CASE gm.status 
      WHEN 'joined' THEN 1 
      WHEN 'invited' THEN 2 
    END,
    g.created_at DESC;
END;
$$; 