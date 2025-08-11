-- =====================================================
-- BUBBLE DATING APP - RPC FUNCTIONS
-- =====================================================

-- 사용자가 속한 그룹 조회 (joined 상태 유저만, 디버그 추가)
CREATE OR REPLACE FUNCTION get_my_bubbles(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    status TEXT,
    members JSON,
    user_status TEXT,
    invited_at TIMESTAMPTZ,
    creator JSON
) AS $$
DECLARE
  v_group_count INTEGER;
  v_member_count INTEGER;
BEGIN
  -- Debug logging
  RAISE NOTICE '[get_my_bubbles] Called for user: %', p_user_id;
  
  -- Count total groups for this user
  SELECT COUNT(*) INTO v_group_count
  FROM groups g
  JOIN group_members gm ON g.id = gm.group_id
  WHERE gm.user_id = p_user_id AND gm.status IN ('joined', 'invited');
  
  RAISE NOTICE '[get_my_bubbles] Found % groups for user', v_group_count;
  
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.status,
    -- 각 그룹의 멤버 목록을 JSON 배열로 만듭니다 - ALL members including joined and invited
    COALESCE(
      (
        SELECT json_agg(
          -- 각 멤버 정보를 JSON 객체로 만듭니다.
          json_build_object(
            'id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'status', gm2.status,
            -- 각 멤버의 이미지 목록을 다시 JSON 배열로 만듭니다.
            'images', (
              SELECT COALESCE(json_agg(
                json_build_object(
                  'id', ui.id,
                  -- 직접 공개 URL 사용 (storage.get_public_url() 제거)
                  'image_url', ui.image_url,
                  'position', ui.position
                ) ORDER BY ui.position
              ), '[]'::json)
              FROM user_images ui
              WHERE ui.user_id = u.id
            )
          )
        )
        FROM group_members gm2
        JOIN users u ON gm2.user_id = u.id
        WHERE gm2.group_id = g.id
          AND gm2.status IN ('joined', 'invited')  -- Include both joined and invited members
      ),
      '[]'::json
    ) as members,
    gm.status as user_status,
    gm.invited_at,
    -- 그룹 생성자 정보 추가
    COALESCE(
      (
        SELECT json_build_object(
          'id', creator_user.id,
          'first_name', creator_user.first_name,
          'last_name', creator_user.last_name,
          'avatar_url', (
            SELECT ui.image_url
            FROM user_images ui
            WHERE ui.user_id = creator_user.id
            ORDER BY ui.position ASC
            LIMIT 1
          )
        )
        FROM users creator_user
        WHERE creator_user.id = g.creator_id
      ),
      '{}'::json
    ) as creator
  FROM
    groups g
  JOIN
    group_members gm ON g.id = gm.group_id
  WHERE
    gm.user_id = p_user_id
    AND gm.status IN ('joined', 'invited')
  ORDER BY
    CASE gm.status
      WHEN 'joined' THEN 1
      WHEN 'invited' THEN 2
    END,
    g.created_at DESC;
    
  -- Debug: Log what we're returning
  GET DIAGNOSTICS v_member_count = ROW_COUNT;
  RAISE NOTICE '[get_my_bubbles] Returning % rows', v_member_count;
END;
$$ LANGUAGE plpgsql;

-- 매칭 그룹 찾기
CREATE OR REPLACE FUNCTION find_matching_group(
  p_group_id UUID, 
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  group_gender TEXT,
  preferred_gender TEXT,
  match_score INTEGER
) AS $$
DECLARE
  v_current_group record;
  v_total_groups INTEGER;
  v_matching_groups INTEGER;
BEGIN
  -- Get current group info
  SELECT * INTO v_current_group 
  FROM groups WHERE id = p_group_id;
  
  -- Debug: Log current group info
  RAISE NOTICE 'Current group: id=%, name=%, group_gender=%, preferred_gender=%, status=%', 
    v_current_group.id, v_current_group.name, v_current_group.group_gender, 
    v_current_group.preferred_gender, v_current_group.status;
  
  -- Debug: Count total available groups
  SELECT COUNT(*) INTO v_total_groups
  FROM groups g
  WHERE g.id != p_group_id
    AND g.status IN ('forming', 'full');
  
  RAISE NOTICE 'Total available groups (excluding current): %', v_total_groups;
  
  -- Debug: Count groups that match gender preferences
  SELECT COUNT(*) INTO v_matching_groups
  FROM groups g
  WHERE g.id != p_group_id
    AND g.status IN ('forming', 'full')
    AND (
      -- Exact match
      (g.group_gender = v_current_group.preferred_gender 
       AND v_current_group.group_gender = g.preferred_gender)
      OR
      -- Any preference matches
      (g.preferred_gender = 'any' 
       AND v_current_group.group_gender = g.group_gender)
      OR
      (v_current_group.preferred_gender = 'any' 
       AND g.group_gender = v_current_group.group_gender)
    );
  
  RAISE NOTICE 'Groups matching gender preferences: %', v_matching_groups;
  
  -- Return matching groups based on rules
  RETURN QUERY
  SELECT 
    g.id as group_id,
    g.name as group_name,
    g.group_gender,
    g.preferred_gender,
    CASE 
      WHEN g.group_gender = v_current_group.preferred_gender 
        AND v_current_group.group_gender = g.preferred_gender THEN 100
      WHEN g.preferred_gender = 'any' 
        AND v_current_group.group_gender = g.group_gender THEN 80
      WHEN v_current_group.preferred_gender = 'any' 
        AND g.group_gender = v_current_group.group_gender THEN 80
      ELSE 0
    END as match_score
  FROM groups g
  WHERE g.id != p_group_id
    AND g.status IN ('forming', 'full')  -- 'forming'과 'full' 모두 포함
    AND g.id NOT IN (
      SELECT DISTINCT group_1_id FROM matches WHERE group_2_id = p_group_id
      UNION
      SELECT DISTINCT group_2_id FROM matches WHERE group_1_id = p_group_id
    )
    AND (
      -- Exact match
      (g.group_gender = v_current_group.preferred_gender 
       AND v_current_group.group_gender = g.preferred_gender)
      OR
      -- Any preference matches
      (g.preferred_gender = 'any' 
       AND v_current_group.group_gender = g.group_gender)
      OR
      (v_current_group.preferred_gender = 'any' 
       AND g.group_gender = v_current_group.group_gender)
    )
  ORDER BY match_score DESC, g.created_at ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 특정 그룹 정보 조회 (joined 상태 유저만)
DROP FUNCTION IF EXISTS get_bubble(uuid);

CREATE OR REPLACE FUNCTION get_bubble(p_group_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  members JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', gm.user_id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'avatar_url', (
            SELECT ui.image_url
            FROM user_images ui
            WHERE ui.user_id = gm.user_id
            ORDER BY ui.position ASC
            LIMIT 1
          )
        )
      ) FILTER (WHERE gm.user_id IS NOT NULL),
      '[]'::jsonb
    ) as members
  FROM groups g
  JOIN group_members gm ON g.id = gm.group_id
  JOIN users u ON gm.user_id = u.id
  WHERE g.id = p_group_id
    AND gm.status = 'joined'
  GROUP BY g.id, g.name;
END;
$$;

-- 사용자 상세 정보 조회
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
    u.about_me as bio,
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

-- 그룹 좋아요
CREATE OR REPLACE FUNCTION like_group(p_user_id UUID, p_target_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO group_likes (user_id, target_group_id, created_at)
  VALUES (p_user_id, p_target_group_id, NOW())
  ON CONFLICT (user_id, target_group_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 초대 수락
CREATE OR REPLACE FUNCTION accept_invitation(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  joined_count INTEGER;
  max_group_size INTEGER;
BEGIN
  -- Update member status to joined
  UPDATE group_members 
  SET status = 'joined', joined_at = NOW()
  WHERE group_id = p_group_id AND user_id = p_user_id;
  
  -- Check if group is now full
  SELECT COUNT(*) INTO joined_count
  FROM group_members 
  WHERE group_id = p_group_id AND status = 'joined';
  
  SELECT max_size INTO max_group_size
  FROM groups
  WHERE id = p_group_id;
  
  -- If group is full, update status to 'full'
  IF joined_count >= max_group_size THEN
    UPDATE groups 
    SET status = 'full', updated_at = NOW()
    WHERE id = p_group_id;
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 초대 거절
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

-- 초대 전송
CREATE OR REPLACE FUNCTION send_invitation(p_group_id UUID, p_invited_user_id UUID, p_invited_by_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO group_members (group_id, user_id, status, invited_by, invited_at)
  VALUES (p_group_id, p_invited_user_id, 'invited', p_invited_by_user_id, NOW())
  ON CONFLICT (group_id, user_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 그룹 생성
CREATE OR REPLACE FUNCTION create_group(p_creator_id UUID, p_max_size INTEGER, p_group_name TEXT, p_preferred_gender TEXT)
RETURNS UUID AS $$
DECLARE
  new_group_id UUID;
  creator_gender TEXT;
  mapped_group_gender TEXT;
BEGIN
  -- Get creator's gender for group_gender setting
  SELECT gender INTO creator_gender FROM users WHERE id = p_creator_id;
  
  -- Raise detailed error if user not found
  IF creator_gender IS NULL THEN
    RAISE EXCEPTION 'User with ID % not found in users table', p_creator_id;
  END IF;
  
  -- Map user gender to group gender values that match database constraint
  CASE creator_gender
    WHEN 'Man' THEN mapped_group_gender := 'male';
    WHEN 'Woman' THEN mapped_group_gender := 'female';
    WHEN 'Nonbinary', 'Other' THEN mapped_group_gender := 'mixed';
    ELSE 
      RAISE EXCEPTION 'Unsupported gender value: %. Expected Man, Woman, Nonbinary, or Other', creator_gender;
  END CASE;
  
  -- Create the group with proper creator_id column and mapped group_gender
  INSERT INTO groups (name, max_size, preferred_gender, creator_id, group_gender)
  VALUES (p_group_name, p_max_size, p_preferred_gender, p_creator_id, mapped_group_gender)
  RETURNING id INTO new_group_id;
  
  -- Raise detailed error if group creation failed
  IF new_group_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create group - INSERT returned NULL';
  END IF;
  
  -- Add creator as a joined member with proper timestamp
  INSERT INTO group_members (group_id, user_id, status, joined_at)
  VALUES (new_group_id, p_creator_id, 'joined', NOW());
  
  RETURN new_group_id;
END;
$$ LANGUAGE plpgsql;

-- 사용자 검색
CREATE OR REPLACE FUNCTION search_users(p_search_term TEXT, p_exclude_user_id UUID, p_exclude_group_id UUID)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  birth_date DATE,
  height_cm INTEGER,
  mbti TEXT,
  gender TEXT,
  bio TEXT,
  location TEXT
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
    u.about_me as bio,
    u.location
  FROM users u
  WHERE u.id != p_exclude_user_id
    AND u.profile_setup_completed = TRUE
    AND (
      u.first_name ILIKE '%' || p_search_term || '%'
      OR u.last_name ILIKE '%' || p_search_term || '%'
      OR (u.first_name || ' ' || u.last_name) ILIKE '%' || p_search_term || '%'
    )
    AND (p_exclude_group_id IS NULL OR u.id NOT IN (
      SELECT user_id FROM group_members WHERE group_id = p_exclude_group_id
    ));
END;
$$ LANGUAGE plpgsql;

-- 그룹 멤버 상태 조회
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

-- 테스트용 그룹 생성 (개발용)
CREATE OR REPLACE FUNCTION test_create_group()
RETURNS UUID AS $$
DECLARE
  test_user_id UUID := '9b87bc6e-5ebc-4745-a0d9-6c223b38f530';
  new_group_id UUID;
BEGIN
  INSERT INTO groups (name, max_size, preferred_gender, creator_id)
  VALUES ('Test Group', 4, 'any', test_user_id)
  RETURNING id INTO new_group_id;
  
  INSERT INTO group_members (group_id, user_id, status, joined_at)
  VALUES (new_group_id, test_user_id, 'joined', NOW());
  
  RETURN new_group_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 그룹 나가기 관련 RPC 함수들
-- =====================================================

-- 사용자가 그룹에서 나가기 (버블 터뜨리기)
-- Note: "Popping" a bubble destroys it for ALL members
CREATE OR REPLACE FUNCTION leave_group(p_user_id UUID, p_group_id UUID)
RETURNS JSON AS $$
DECLARE
  v_group_name TEXT;
  v_popper_name TEXT;
  v_affected_users UUID[];
BEGIN
  -- Debug logging
  RAISE NOTICE '[leave_group] User % popping group %', p_user_id, p_group_id;
  
  -- Check if user is actually in the group
  IF NOT EXISTS (
    SELECT 1 FROM group_members 
    WHERE user_id = p_user_id AND group_id = p_group_id AND status = 'joined'
  ) THEN
    RAISE NOTICE '[leave_group] User is not a member of this group';
    RETURN json_build_object('success', false, 'message', 'User is not a member of this group');
  END IF;
  
  -- Get group name and popper's name for notifications
  SELECT g.name, u.first_name 
  INTO v_group_name, v_popper_name
  FROM groups g, users u
  WHERE g.id = p_group_id AND u.id = p_user_id;
  
  -- Get list of all users who will be affected (for notifications)
  SELECT array_agg(DISTINCT user_id) INTO v_affected_users
  FROM group_members 
  WHERE group_id = p_group_id AND status = 'joined' AND user_id != p_user_id;
  
  RAISE NOTICE '[leave_group] Group "%" popped by "%", affecting % other users', 
    COALESCE(v_group_name, 'Unnamed'), v_popper_name, array_length(v_affected_users, 1);
  
  -- POPPING BEHAVIOR: Always destroy the entire bubble for everyone
  
  -- Step 1: Clear active_group_id for ALL users pointing to this group
  UPDATE users 
  SET active_group_id = NULL 
  WHERE active_group_id = p_group_id;
  
  RAISE NOTICE '[leave_group] Cleared active_group_id for all affected users';
  
  -- Step 2: Remove ALL group members
  DELETE FROM group_members WHERE group_id = p_group_id;
  
  RAISE NOTICE '[leave_group] Removed all group members';
  
  -- Step 3: Delete the group itself
  DELETE FROM groups WHERE id = p_group_id;
  
  RAISE NOTICE '[leave_group] Bubble completely destroyed';
  
  -- Return success with notification data
  RETURN json_build_object(
    'success', true,
    'message', 'Bubble popped successfully',
    'group_name', COALESCE(v_group_name, 'Unnamed Bubble'),
    'popper_name', v_popper_name,
    'affected_users', COALESCE(v_affected_users, '{}')
  );
  
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE NOTICE '[leave_group] Foreign key violation: %', SQLERRM;
    RETURN json_build_object('success', false, 'message', 'Database constraint error');
  WHEN OTHERS THEN
    RAISE NOTICE '[leave_group] Unexpected error: %', SQLERRM;
    RETURN json_build_object('success', false, 'message', 'Unexpected error occurred');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 활성 그룹 관련 RPC 함수들
-- =====================================================

-- 사용자의 활성 그룹 조회
CREATE OR REPLACE FUNCTION get_user_active_bubble(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    status TEXT,
    members JSON,
    user_status TEXT,
    invited_at TIMESTAMPTZ
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
    -- 각 그룹의 멤버 목록을 JSON 배열로 만듭니다 (joined 상태만)
    COALESCE(
      (
        SELECT json_agg(
          -- 각 멤버 정보를 JSON 객체로 만듭니다.
          json_build_object(
            'id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'status', gm2.status,
            -- 각 멤버의 이미지 목록을 다시 JSON 배열로 만듭니다.
            'images', (
              SELECT COALESCE(json_agg(
                json_build_object(
                  'id', ui.id,
                  -- 직접 공개 URL 사용 (storage.get_public_url() 제거)
                  'image_url', ui.image_url,
                  'position', ui.position
                ) ORDER BY ui.position
              ), '[]'::json)
              FROM user_images ui
              WHERE ui.user_id = u.id
            )
          )
        )
        FROM group_members gm2
        JOIN users u ON gm2.user_id = u.id
        WHERE gm2.group_id = g.id
          AND gm2.status = 'joined'
      ),
      '[]'::json
    ) as members,
    gm.status as user_status,
    gm.invited_at
  FROM
    groups g
  JOIN
    group_members gm ON g.id = gm.group_id
  JOIN
    users u ON u.id = p_user_id
  WHERE
    gm.user_id = p_user_id
    AND gm.status = 'joined'
    AND g.id = u.active_group_id;
END;
$$;

-- 사용자의 활성 그룹 설정
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
  -- 사용자가 존재하는지 확인
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RETURN FALSE;
  END IF;

  -- 그룹이 존재하는지 확인
  SELECT EXISTS(SELECT 1 FROM groups WHERE id = p_group_id) INTO group_exists;
  IF NOT group_exists THEN
    RETURN FALSE;
  END IF;

  -- 사용자가 해당 그룹에 속해있는지 확인
  SELECT EXISTS(
    SELECT 1 FROM group_members 
    WHERE user_id = p_user_id 
    AND group_id = p_group_id 
    AND status = 'joined'
  ) INTO user_in_group;
  
  IF NOT user_in_group THEN
    RETURN FALSE;
  END IF;

  -- 활성 그룹 설정
  UPDATE users 
  SET active_group_id = p_group_id, 
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$; 