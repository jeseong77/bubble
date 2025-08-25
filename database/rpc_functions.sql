-- =====================================================
-- BUBBLE DATING APP - RPC FUNCTIONS
-- =====================================================

-- =====================================================
-- DATABASE MIGRATION: Add current_num_users column
-- =====================================================
-- Run this first to add the column to existing groups table:
-- ALTER TABLE groups ADD COLUMN IF NOT EXISTS current_num_users INTEGER DEFAULT 1;
-- ALTER TABLE groups ADD CONSTRAINT groups_current_num_users_check CHECK (current_num_users <= max_size);
-- 
-- Update existing groups to have correct current_num_users:
-- UPDATE groups SET current_num_users = (
--   SELECT COUNT(*) FROM group_members 
--   WHERE group_members.group_id = groups.id AND group_members.status = 'joined'
-- );
--
-- Fix existing groups with wrong status:
-- UPDATE groups SET status = 'full' 
-- WHERE current_num_users >= max_size AND status = 'forming';
-- =====================================================

-- 사용자가 속한 그룹 조회 (joined 상태 유저만, 디버그 추가) - NEW VERSION
CREATE OR REPLACE FUNCTION get_my_bubbles_v2(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    status TEXT,
    max_size INTEGER,
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
  RAISE NOTICE '[get_my_bubbles_v2] Called for user: %', p_user_id;
  
  -- Count total groups for this user
  SELECT COUNT(*) INTO v_group_count
  FROM groups g
  JOIN group_members gm ON g.id = gm.group_id
  WHERE gm.user_id = p_user_id AND gm.status IN ('joined', 'invited');
  
  RAISE NOTICE '[get_my_bubbles_v2] Found % groups for user', v_group_count;
  
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.status,
    g.max_size,
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
        ORDER BY 
          CASE WHEN gm2.user_id = p_user_id THEN 1 ELSE 2 END,  -- Put requesting user first
          gm2.joined_at ASC  -- Then order by join time
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
  RAISE NOTICE '[get_my_bubbles_v2] Returning % rows', v_member_count;
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
  RAISE NOTICE 'Current group: id=%, name=%, group_gender=%, preferred_gender=%, status=%, max_size=%', 
    v_current_group.id, v_current_group.name, v_current_group.group_gender, 
    v_current_group.preferred_gender, v_current_group.status, v_current_group.max_size;
  
  -- Debug: Count total available groups (ONLY FULL groups)
  SELECT COUNT(*) INTO v_total_groups
  FROM groups g
  WHERE g.id != p_group_id
    AND g.status = 'full';
  
  RAISE NOTICE 'Total available groups (excluding current): %', v_total_groups;
  
  -- Debug: Count groups that match exact opposite preferences AND same size (ONLY FULL groups)
  SELECT COUNT(*) INTO v_matching_groups
  FROM groups g
  WHERE g.id != p_group_id
    AND g.status = 'full'
    AND g.max_size = v_current_group.max_size  -- Same group size only
    AND (
      -- Exact opposite match only: my group gender = their preference AND their group gender = my preference
      g.group_gender = v_current_group.preferred_gender 
      AND v_current_group.group_gender = g.preferred_gender
    );
  
  RAISE NOTICE 'Groups matching gender preferences and size: %', v_matching_groups;
  
  -- Return matching groups based on exact opposite matching rules AND same size
  RETURN QUERY
  SELECT 
    g.id as group_id,
    g.name as group_name,
    g.group_gender,
    g.preferred_gender,
    100 as match_score  -- All matches are equal since we only show exact matches
  FROM groups g
  WHERE g.id != p_group_id
    AND g.status = 'full'  -- Only show fully formed groups
    AND g.max_size = v_current_group.max_size  -- Same group size only
    AND g.id NOT IN (
      SELECT DISTINCT group_1_id FROM matches WHERE group_2_id = p_group_id
      UNION
      SELECT DISTINCT group_2_id FROM matches WHERE group_1_id = p_group_id
    )
    AND (
      -- Exact opposite match only: my group gender = their preference AND their group gender = my preference
      g.group_gender = v_current_group.preferred_gender 
      AND v_current_group.group_gender = g.preferred_gender
    )
  ORDER BY g.created_at ASC  -- Order by creation time since all matches are equal
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
RETURNS JSON AS $$
DECLARE
  v_group_status TEXT;
  v_max_size INTEGER;
  v_joined_count INTEGER;
  v_cleaned_up_count INTEGER := 0;
  v_group_name TEXT;
  v_user_name TEXT;
  v_result JSON;
BEGIN
  -- Start transaction and lock the group row to prevent race conditions
  SELECT status, max_size, name INTO v_group_status, v_max_size, v_group_name
  FROM groups 
  WHERE id = p_group_id 
  FOR UPDATE;
  
  -- Check if group exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'GROUP_NOT_FOUND',
      'message', 'Group does not exist'
    );
  END IF;
  
  -- Check if group is still accepting members
  IF v_group_status != 'forming' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'GROUP_NOT_FORMING',
      'message', 'This bubble is no longer accepting new members',
      'group_status', v_group_status
    );
  END IF;
  
  -- Check if user has a pending invitation
  IF NOT EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = p_group_id AND user_id = p_user_id AND status = 'invited'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'NO_PENDING_INVITATION',
      'message', 'You do not have a pending invitation to this group'
    );
  END IF;
  
  -- Count current joined members
  SELECT COUNT(*) INTO v_joined_count
  FROM group_members 
  WHERE group_id = p_group_id AND status = 'joined';
  
  -- Check if there's space available
  IF v_joined_count >= v_max_size THEN
    RETURN json_build_object(
      'success', false,
      'error', 'GROUP_FULL',
      'message', 'This bubble is already full',
      'max_size', v_max_size,
      'current_size', v_joined_count
    );
  END IF;
  
  -- Accept the invitation (update member status) and increment current_num_users atomically
  UPDATE group_members 
  SET status = 'joined', joined_at = NOW()
  WHERE group_id = p_group_id AND user_id = p_user_id;
  
  -- Increment current_num_users atomically
  UPDATE groups 
  SET current_num_users = current_num_users + 1, updated_at = NOW()
  WHERE id = p_group_id;
  
  -- Get user name for response
  SELECT CONCAT(first_name, ' ', last_name) INTO v_user_name
  FROM users WHERE id = p_user_id;
  
  -- Get updated current_num_users from groups table (more efficient than counting)
  SELECT current_num_users INTO v_joined_count
  FROM groups 
  WHERE id = p_group_id;
  
  -- Debug logging
  RAISE NOTICE '[accept_invitation] Group %, Max size: %, Current num users: %', p_group_id, v_max_size, v_joined_count;
  RAISE NOTICE '[accept_invitation] Checking if % >= % to update to full', v_joined_count, v_max_size;
  
  -- Check if group is now full after this acceptance
  IF v_joined_count >= v_max_size THEN
    -- Update group status to 'full'
    UPDATE groups 
    SET status = 'full', updated_at = NOW()
    WHERE id = p_group_id;
    
    -- Debug logging for group status update
    RAISE NOTICE '[accept_invitation] ✅ Group % status updated to FULL', p_group_id;
    
    -- Clean up all remaining pending invitations
    DELETE FROM group_members 
    WHERE group_id = p_group_id AND status = 'invited';
    
    GET DIAGNOSTICS v_cleaned_up_count = ROW_COUNT;
    
    -- Debug logging for cleanup
    RAISE NOTICE '[accept_invitation] 🧹 Cleaned up % pending invitations', v_cleaned_up_count;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Invitation accepted successfully',
      'group_id', p_group_id,
      'group_name', v_group_name,
      'user_name', v_user_name,
      'group_full', true,
      'new_group_status', 'full',
      'final_size', v_joined_count,
      'max_size', v_max_size,
      'cleaned_up_invitations', v_cleaned_up_count
    );
  ELSE
    -- Debug logging when group is not yet full
    RAISE NOTICE '[accept_invitation] ⏳ Group % not yet full (%/%)', p_group_id, v_joined_count, v_max_size;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Invitation accepted successfully',
      'group_id', p_group_id,
      'group_name', v_group_name,
      'user_name', v_user_name,
      'group_full', false,
      'new_group_status', 'forming',
      'current_size', v_joined_count,
      'max_size', v_max_size,
      'cleaned_up_invitations', 0
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'INTERNAL_ERROR',
      'message', 'An internal error occurred',
      'sql_error', SQLERRM,
      'sql_state', SQLSTATE
    );
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

-- 초대 전송 (Fixed schema mismatch)
CREATE OR REPLACE FUNCTION send_invitation(p_group_id UUID, p_invited_user_id UUID, p_invited_by_user_id UUID)
RETURNS JSON AS $$
DECLARE
  insert_success BOOLEAN := FALSE;
  conflict_occurred BOOLEAN := FALSE;
  verification_record RECORD;
  inserted_count INTEGER;
BEGIN
  -- Log parameters with detailed info
  RAISE NOTICE 'send_invitation called: group_id=%, invited_user_id=%, invited_by=%', 
    p_group_id, p_invited_user_id, p_invited_by_user_id;

  -- Check if record already exists
  IF EXISTS (SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = p_invited_user_id) THEN
    conflict_occurred := TRUE;
    RAISE NOTICE 'Record already exists for group_id=%, user_id=%', p_group_id, p_invited_user_id;
  ELSE
    -- Insert the invitation
    INSERT INTO group_members (group_id, user_id, status, invited_at)
    VALUES (p_group_id, p_invited_user_id, 'invited', NOW());
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'INSERT completed. Row count: %', inserted_count;
    
    -- Verify the record was actually inserted
    SELECT group_id, user_id, status, invited_at INTO verification_record
    FROM group_members 
    WHERE group_id = p_group_id AND user_id = p_invited_user_id;
    
    IF verification_record.group_id IS NOT NULL THEN
      insert_success := TRUE;
      RAISE NOTICE 'Verification successful: Found record with status=%, invited_at=%', 
        verification_record.status, verification_record.invited_at;
    ELSE
      insert_success := FALSE;
      RAISE NOTICE 'Verification failed: No record found after insert';
    END IF;
  END IF;
  
  RETURN json_build_object(
    'success', insert_success,
    'already_exists', conflict_occurred,
    'inserted_count', COALESCE(inserted_count, 0),
    'verification_status', CASE 
      WHEN verification_record.group_id IS NOT NULL THEN verification_record.status 
      ELSE NULL 
    END,
    'parameters', json_build_object(
      'group_id', p_group_id,
      'invited_user_id', p_invited_user_id,
      'invited_by_user_id', p_invited_by_user_id
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Exception in send_invitation: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'parameters', json_build_object(
        'group_id', p_group_id,
        'invited_user_id', p_invited_user_id,
        'invited_by_user_id', p_invited_by_user_id
      )
    );
END;
$$ LANGUAGE plpgsql;

-- 초대 취소 (Diagnostic Debug)
CREATE OR REPLACE FUNCTION cancel_invitation(p_group_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  deleted_count INTEGER;
  found_any INTEGER;
  found_exact INTEGER;
  found_string_comparison INTEGER;
  found_raw_text INTEGER;
  sample_record RECORD;
  all_users_in_table INTEGER;
BEGIN
  -- Basic info
  RAISE NOTICE '[RPC] === UUID DIAGNOSTIC DEBUG ===';
  RAISE NOTICE '[RPC] Received group_id: % (length: %)', p_group_id, LENGTH(p_group_id::text);
  RAISE NOTICE '[RPC] Received user_id: % (length: %)', p_user_id, LENGTH(p_user_id::text);
  
  -- Count total users in table
  SELECT COUNT(*) INTO all_users_in_table FROM group_members;
  RAISE NOTICE '[RPC] Total records in group_members table: %', all_users_in_table;
  
  -- Test 1: Standard UUID comparison
  SELECT COUNT(*) INTO found_any FROM group_members WHERE user_id = p_user_id;
  RAISE NOTICE '[RPC] Test 1 - Standard UUID comparison: % records found', found_any;
  
  -- Test 2: String comparison
  SELECT COUNT(*) INTO found_string_comparison FROM group_members WHERE user_id::text = p_user_id::text;
  RAISE NOTICE '[RPC] Test 2 - String comparison: % records found', found_string_comparison;
  
  -- Test 3: Raw text comparison (no casting)
  EXECUTE format('SELECT COUNT(*) FROM group_members WHERE user_id::text = %L', p_user_id::text) INTO found_raw_text;
  RAISE NOTICE '[RPC] Test 3 - Raw text comparison: % records found', found_raw_text;
  
  -- Test 4: Get actual record to compare UUIDs
  SELECT user_id, group_id, status INTO sample_record FROM group_members LIMIT 1;
  IF sample_record.user_id IS NOT NULL THEN
    RAISE NOTICE '[RPC] === ACTUAL DATABASE RECORD ===';
    RAISE NOTICE '[RPC] DB user_id: % (length: %)', sample_record.user_id, LENGTH(sample_record.user_id::text);
    RAISE NOTICE '[RPC] DB group_id: % (length: %)', sample_record.group_id, LENGTH(sample_record.group_id::text);
    RAISE NOTICE '[RPC] DB status: %', sample_record.status;
    RAISE NOTICE '[RPC] === RECEIVED PARAMETERS ===';
    RAISE NOTICE '[RPC] RX user_id: % (length: %)', p_user_id, LENGTH(p_user_id::text);
    RAISE NOTICE '[RPC] RX group_id: % (length: %)', p_group_id, LENGTH(p_group_id::text);
    RAISE NOTICE '[RPC] === DIRECT COMPARISON ===';
    RAISE NOTICE '[RPC] user_id match: %', (sample_record.user_id = p_user_id);
    RAISE NOTICE '[RPC] group_id match: %', (sample_record.group_id = p_group_id);
    RAISE NOTICE '[RPC] user_id string match: %', (sample_record.user_id::text = p_user_id::text);
    RAISE NOTICE '[RPC] group_id string match: %', (sample_record.group_id::text = p_group_id::text);
  END IF;
  
  -- Test 5: Check exact match with all methods
  SELECT COUNT(*) INTO found_exact FROM group_members WHERE group_id = p_group_id AND user_id = p_user_id AND status = 'invited';
  RAISE NOTICE '[RPC] Test 5 - Exact match (UUID): % records found', found_exact;
  
  -- Test 6: Force string matching for exact record
  EXECUTE format('SELECT COUNT(*) FROM group_members WHERE group_id::text = %L AND user_id::text = %L AND status = %L', 
    p_group_id::text, p_user_id::text, 'invited') INTO found_raw_text;
  RAISE NOTICE '[RPC] Test 6 - Exact match (string): % records found', found_raw_text;
  
  -- Actual delete attempt
  DELETE FROM group_members 
  WHERE group_id = p_group_id 
    AND user_id = p_user_id 
    AND status = 'invited';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '[RPC] Deletion result: % records deleted', deleted_count;
  
  -- Return diagnostic info
  RETURN json_build_object(
    'success', deleted_count > 0,
    'deleted_count', deleted_count,
    'total_records_in_table', all_users_in_table,
    'found_uuid_comparison', found_any,
    'found_string_comparison', found_string_comparison,
    'found_exact_uuid', found_exact,
    'found_exact_string', found_raw_text,
    'group_id_received', p_group_id::text,
    'user_id_received', p_user_id::text,
    'group_id_length', LENGTH(p_group_id::text),
    'user_id_length', LENGTH(p_user_id::text)
  );
END;
$$ LANGUAGE plpgsql;

-- NUCLEAR OPTION: Force delete with dynamic SQL
CREATE OR REPLACE FUNCTION force_delete_invitation(p_group_id TEXT, p_user_id TEXT)
RETURNS JSON AS $$
DECLARE
  deleted_count INTEGER;
  sql_query TEXT;
BEGIN
  -- Build the SQL query dynamically
  sql_query := format('DELETE FROM group_members WHERE group_id::text = %L AND user_id::text = %L AND status = %L', 
    p_group_id, p_user_id, 'invited');
    
  RAISE NOTICE '[FORCE] Executing SQL: %', sql_query;
  
  -- Execute the dynamic SQL
  EXECUTE sql_query;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE '[FORCE] Deleted % records', deleted_count;
  
  RETURN json_build_object(
    'success', deleted_count > 0,
    'deleted_count', deleted_count,
    'sql_executed', sql_query
  );
END;
$$ LANGUAGE plpgsql;

-- Show what's actually in the table RIGHT NOW
CREATE OR REPLACE FUNCTION debug_table_contents()
RETURNS JSON AS $$
DECLARE
  all_records JSON;
  record_count INTEGER;
BEGIN
  -- Get count
  SELECT COUNT(*) INTO record_count FROM group_members;
  
  -- Get all records
  SELECT json_agg(
    json_build_object(
      'group_id', group_id::text,
      'user_id', user_id::text,
      'status', status,
      'invited_at', invited_at,
      'joined_at', joined_at
    )
  ) INTO all_records FROM group_members;
  
  RAISE NOTICE '[DEBUG] Total records in table: %', record_count;
  RAISE NOTICE '[DEBUG] All records: %', all_records;
  
  RETURN json_build_object(
    'total_count', record_count,
    'all_records', all_records,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Test function to verify parameter passing
CREATE OR REPLACE FUNCTION test_cancel_params(p_group_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  direct_count INTEGER;
BEGIN
  -- Test the exact same query that worked in SQL editor
  SELECT COUNT(*) INTO direct_count
  FROM group_members 
  WHERE group_id::text = p_group_id::text 
    AND user_id::text = p_user_id::text 
    AND status = 'invited';
    
  RAISE NOTICE '[TEST] Parameters received: group_id=%, user_id=%', p_group_id, p_user_id;
  RAISE NOTICE '[TEST] Direct query result: % records found', direct_count;
  
  RETURN json_build_object(
    'parameters_received', json_build_object(
      'group_id', p_group_id::text,
      'user_id', p_user_id::text
    ),
    'direct_query_count', direct_count,
    'should_work', direct_count > 0
  );
END;
$$ LANGUAGE plpgsql;

-- 그룹 생성
CREATE OR REPLACE FUNCTION create_group(p_creator_id UUID, p_max_size INTEGER, p_group_name TEXT, p_preferred_gender TEXT)
RETURNS UUID AS $$
DECLARE
  new_group_id UUID;
  creator_gender TEXT;
BEGIN
  -- Get creator's gender for group_gender setting
  SELECT gender INTO creator_gender FROM users WHERE id = p_creator_id;
  
  -- Raise detailed error if user not found
  IF creator_gender IS NULL THEN
    RAISE EXCEPTION 'User with ID % not found in users table', p_creator_id;
  END IF;
  
  -- Validate user gender (unified system - no backward compatibility)
  IF creator_gender NOT IN ('man', 'woman', 'nonbinary', 'everyone') THEN
    RAISE EXCEPTION 'Invalid gender value: %. Expected man, woman, nonbinary, or everyone', creator_gender;
  END IF;
  
  IF p_preferred_gender NOT IN ('man', 'woman', 'nonbinary', 'everyone') THEN
    RAISE EXCEPTION 'Invalid preferred_gender value: %. Expected man, woman, nonbinary, or everyone', p_preferred_gender;
  END IF;
  
  -- Create the group with proper creator_id column, group_gender, and current_num_users = 1
  INSERT INTO groups (name, max_size, preferred_gender, creator_id, group_gender, current_num_users)
  VALUES (p_group_name, p_max_size, p_preferred_gender, p_creator_id, creator_gender, 1)
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
  v_users_cleared INTEGER;
  v_members_deleted INTEGER;
  v_creator_id UUID;
BEGIN
  -- Start transaction for atomic bubble popping
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
  
  -- Get group details including creator
  SELECT g.name, g.creator_id, u.first_name 
  INTO v_group_name, v_creator_id, v_popper_name
  FROM groups g, users u
  WHERE g.id = p_group_id AND u.id = p_user_id;
  
  -- Get list of all users who will be affected (for notifications)
  SELECT array_agg(DISTINCT user_id) INTO v_affected_users
  FROM group_members 
  WHERE group_id = p_group_id AND status = 'joined' AND user_id != p_user_id;
  
  RAISE NOTICE '[leave_group] Group "%" (creator: %) popped by "%", affecting % other users', 
    COALESCE(v_group_name, 'Unnamed'), v_creator_id, v_popper_name, array_length(v_affected_users, 1);
  
  -- POPPING BEHAVIOR: Always destroy the entire bubble for everyone
  
  -- Step 1: Clear active_group_id for ALL users pointing to this group (including creator)
  UPDATE users 
  SET active_group_id = NULL 
  WHERE active_group_id = p_group_id;
  
  GET DIAGNOSTICS v_users_cleared = ROW_COUNT;
  RAISE NOTICE '[leave_group] Cleared active_group_id for % users', v_users_cleared;
  
  -- Step 2: Remove ALL group members (this also removes foreign key references)
  DELETE FROM group_members WHERE group_id = p_group_id;
  
  GET DIAGNOSTICS v_members_deleted = ROW_COUNT;
  RAISE NOTICE '[leave_group] Removed % group members', v_members_deleted;
  
  -- Step 3: Clear any other potential foreign key references
  -- Clear from likes table
  DELETE FROM likes WHERE from_group_id = p_group_id OR to_group_id = p_group_id;
  
  -- Clear from matches table  
  DELETE FROM matches WHERE group_1_id = p_group_id OR group_2_id = p_group_id;
  
  RAISE NOTICE '[leave_group] Cleared related records (likes, matches)';
  
  -- Step 4: Finally delete the group itself
  DELETE FROM groups WHERE id = p_group_id;
  
  -- Verify deletion succeeded
  IF NOT FOUND THEN
    RAISE NOTICE '[leave_group] Group deletion failed - group may not exist';
    RETURN json_build_object('success', false, 'message', 'Group deletion failed');
  END IF;
  
  RAISE NOTICE '[leave_group] Bubble completely destroyed';
  
  -- Return success with notification data
  RETURN json_build_object(
    'success', true,
    'message', 'Bubble popped successfully',
    'group_name', COALESCE(v_group_name, 'Unnamed Bubble'),
    'popper_name', v_popper_name,
    'affected_users', COALESCE(v_affected_users, '{}'),
    'debug_info', json_build_object(
      'users_cleared', v_users_cleared,
      'members_deleted', v_members_deleted,
      'creator_id', v_creator_id
    )
  );
  
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE NOTICE '[leave_group] Foreign key violation: %. SQLSTATE: %, Detail: %', SQLERRM, SQLSTATE, SQLERRM;
    RETURN json_build_object(
      'success', false, 
      'message', 'Database constraint error',
      'error_detail', SQLERRM,
      'error_code', SQLSTATE
    );
  WHEN OTHERS THEN
    RAISE NOTICE '[leave_group] Unexpected error: %. SQLSTATE: %', SQLERRM, SQLSTATE;
    RETURN json_build_object(
      'success', false, 
      'message', 'Unexpected error occurred',
      'error_detail', SQLERRM,
      'error_code', SQLSTATE
    );
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

-- =====================================================
-- DATA VALIDATION AND CONSISTENCY FUNCTIONS
-- =====================================================

-- Function to validate and sync current_num_users with actual member count
CREATE OR REPLACE FUNCTION validate_group_member_count()
RETURNS TRIGGER AS $$
DECLARE
  actual_count INTEGER;
  stored_count INTEGER;
BEGIN
  -- Get actual count of joined members
  SELECT COUNT(*) INTO actual_count
  FROM group_members 
  WHERE group_id = COALESCE(NEW.group_id, OLD.group_id) AND status = 'joined';
  
  -- Get stored count
  SELECT current_num_users INTO stored_count
  FROM groups 
  WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  
  -- If counts don't match, sync the stored count
  IF actual_count != stored_count THEN
    RAISE NOTICE 'Syncing group % member count: stored=%, actual=%', 
      COALESCE(NEW.group_id, OLD.group_id), stored_count, actual_count;
      
    UPDATE groups 
    SET current_num_users = actual_count, updated_at = NOW()
    WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically validate member counts
DROP TRIGGER IF EXISTS validate_member_count_trigger ON group_members;
CREATE TRIGGER validate_member_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION validate_group_member_count();

-- Function to manually validate all groups (for maintenance)
CREATE OR REPLACE FUNCTION validate_all_group_counts()
RETURNS TABLE(group_id UUID, stored_count INTEGER, actual_count INTEGER, was_synced BOOLEAN) AS $$
DECLARE
  group_record RECORD;
  actual_count INTEGER;
BEGIN
  FOR group_record IN SELECT id, current_num_users FROM groups LOOP
    -- Count actual joined members
    SELECT COUNT(*) INTO actual_count
    FROM group_members 
    WHERE group_id = group_record.id AND status = 'joined';
    
    -- Return validation result
    group_id := group_record.id;
    stored_count := group_record.current_num_users;
    actual_count := actual_count;
    was_synced := FALSE;
    
    -- Sync if needed
    IF group_record.current_num_users != actual_count THEN
      UPDATE groups 
      SET current_num_users = actual_count, updated_at = NOW()
      WHERE id = group_record.id;
      was_synced := TRUE;
    END IF;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to fix existing groups with wrong status
CREATE OR REPLACE FUNCTION fix_group_statuses()
RETURNS TABLE(group_id UUID, old_status TEXT, new_status TEXT, current_num_users INTEGER, max_size INTEGER) AS $$
DECLARE
  group_record RECORD;
BEGIN
  FOR group_record IN 
    SELECT id, status, current_num_users, max_size 
    FROM groups 
    WHERE (current_num_users >= max_size AND status = 'forming') 
       OR (current_num_users < max_size AND status = 'full')
  LOOP
    group_id := group_record.id;
    old_status := group_record.status;
    current_num_users := group_record.current_num_users;
    max_size := group_record.max_size;
    
    -- Determine correct status
    IF group_record.current_num_users >= group_record.max_size THEN
      new_status := 'full';
    ELSE
      new_status := 'forming';
    END IF;
    
    -- Update if different
    IF old_status != new_status THEN
      UPDATE groups 
      SET status = new_status, updated_at = NOW()
      WHERE id = group_record.id;
      
      RAISE NOTICE 'Fixed group % status: % -> %', group_record.id, old_status, new_status;
    END IF;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to test bubble popping permissions (for debugging)
CREATE OR REPLACE FUNCTION test_bubble_popping_permissions()
RETURNS TABLE(test_case TEXT, success BOOLEAN, message TEXT, details JSON) AS $$
DECLARE
  test_creator_id UUID;
  test_member_id UUID;
  test_group_id UUID;
  creator_pop_result JSON;
  member_pop_result JSON;
BEGIN
  -- Get two different users for testing
  SELECT id INTO test_creator_id FROM users LIMIT 1;
  SELECT id INTO test_member_id FROM users WHERE id != test_creator_id LIMIT 1;
  
  IF test_creator_id IS NULL OR test_member_id IS NULL THEN
    test_case := 'Setup';
    success := false;
    message := 'Need at least 2 users in database for testing';
    details := json_build_object('creator_id', test_creator_id, 'member_id', test_member_id);
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Test Case 1: Create a test group with creator
  SELECT create_group(test_creator_id, 2, 'Test Bubble', 'any') INTO test_group_id;
  
  IF test_group_id IS NULL THEN
    test_case := 'Group Creation';
    success := false;
    message := 'Failed to create test group';
    details := json_build_object('creator_id', test_creator_id);
    RETURN NEXT;
    RETURN;
  END IF;
  
  test_case := 'Group Creation';
  success := true;
  message := 'Test group created successfully';
  details := json_build_object('group_id', test_group_id, 'creator_id', test_creator_id);
  RETURN NEXT;
  
  -- Test Case 2: Add second member
  INSERT INTO group_members (group_id, user_id, status, joined_at)
  VALUES (test_group_id, test_member_id, 'joined', NOW());
  
  -- Update current_num_users
  UPDATE groups SET current_num_users = 2 WHERE id = test_group_id;
  
  test_case := 'Member Addition';
  success := true;
  message := 'Second member added successfully';
  details := json_build_object('group_id', test_group_id, 'member_id', test_member_id);
  RETURN NEXT;
  
  -- Test Case 3: Non-creator tries to pop bubble
  SELECT leave_group(test_member_id, test_group_id) INTO member_pop_result;
  
  test_case := 'Non-Creator Pop Test';
  success := (member_pop_result->>'success')::boolean;
  message := member_pop_result->>'message';
  details := member_pop_result;
  RETURN NEXT;
  
  -- If non-creator pop failed, test creator pop on same group
  IF NOT success THEN
    SELECT leave_group(test_creator_id, test_group_id) INTO creator_pop_result;
    
    test_case := 'Creator Pop Test (after non-creator failed)';
    success := (creator_pop_result->>'success')::boolean;
    message := creator_pop_result->>'message';
    details := creator_pop_result;
    RETURN NEXT;
  END IF;
  
  -- Clean up any remaining test group
  DELETE FROM group_members WHERE group_id = test_group_id;
  DELETE FROM groups WHERE id = test_group_id;
  
EXCEPTION
  WHEN OTHERS THEN
    test_case := 'Test Error';
    success := false;
    message := SQLERRM;
    details := json_build_object('error_code', SQLSTATE, 'error_message', SQLERRM);
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- LIKES YOU FUNCTIONALITY
-- =====================================================

-- Function to get groups that have liked the current user's group
CREATE OR REPLACE FUNCTION get_incoming_likes(
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
  v_total_incoming INTEGER;
BEGIN
  -- Get current group info
  SELECT * INTO v_current_group 
  FROM groups WHERE id = p_group_id;
  
  -- Debug: Log current group info
  RAISE NOTICE 'Getting incoming likes for group: id=%, name=%, group_gender=%, preferred_gender=%, status=%', 
    v_current_group.id, v_current_group.name, v_current_group.group_gender, 
    v_current_group.preferred_gender, v_current_group.status;
  
  -- Count total incoming likes (excluding already matched groups)
  SELECT COUNT(*) INTO v_total_incoming
  FROM likes l
  JOIN groups g ON l.from_group_id = g.id
  WHERE l.to_group_id = p_group_id
    AND g.status = 'full'
    -- Exclude groups we already matched with
    AND NOT EXISTS (
      SELECT 1 FROM matches m
      WHERE (m.group_1_id = l.from_group_id AND m.group_2_id = p_group_id)
         OR (m.group_1_id = p_group_id AND m.group_2_id = l.from_group_id)
    )
    -- Exclude groups we passed on
    AND NOT EXISTS (
      SELECT 1 FROM group_passes gp
      WHERE gp.from_group_id = p_group_id AND gp.to_group_id = l.from_group_id
    );
  
  RAISE NOTICE 'Total incoming likes available: %', v_total_incoming;
  
  -- Return groups that liked this group
  RETURN QUERY
  SELECT 
    g.id as group_id,
    g.name as group_name,
    g.group_gender,
    g.preferred_gender,
    85 as match_score  -- Fixed high score since they already liked us
  FROM likes l
  JOIN groups g ON l.from_group_id = g.id
  WHERE l.to_group_id = p_group_id
    AND g.status = 'full'
    -- Exclude groups we already matched with
    AND NOT EXISTS (
      SELECT 1 FROM matches m
      WHERE (m.group_1_id = l.from_group_id AND m.group_2_id = p_group_id)
         OR (m.group_1_id = p_group_id AND m.group_2_id = l.from_group_id)
    )
    -- Exclude groups we passed on
    AND NOT EXISTS (
      SELECT 1 FROM group_passes gp
      WHERE gp.from_group_id = p_group_id AND gp.to_group_id = l.from_group_id
    )
  ORDER BY l.created_at DESC  -- Most recent likes first
  LIMIT p_limit
  OFFSET p_offset;
  
  RAISE NOTICE 'Returned incoming likes with limit=%, offset=%', p_limit, p_offset;
  
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CHAT ROOM MEMBERS RPC FUNCTION
-- =====================================================
-- Get all members from both groups in a chat room for profile display
CREATE OR REPLACE FUNCTION get_chat_room_members(p_chat_room_id UUID)
RETURNS JSON AS $$
DECLARE
  v_match_id UUID;
  v_group_1_id UUID;
  v_group_2_id UUID;
  v_my_group_id UUID;
  v_other_group_id UUID;
  v_current_user_id UUID;
  result JSON;
  member_count INTEGER;
  member_record RECORD;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO v_current_user_id;
  
  RAISE NOTICE '[get_chat_room_members] Called for chat room: % by user: %', p_chat_room_id, v_current_user_id;
  
  -- Get match info from chat room
  SELECT cr.match_id, m.group_1_id, m.group_2_id
  INTO v_match_id, v_group_1_id, v_group_2_id
  FROM chat_rooms cr
  JOIN matches m ON cr.match_id = m.id
  WHERE cr.id = p_chat_room_id;
  
  IF v_match_id IS NULL THEN
    RAISE NOTICE '[get_chat_room_members] Chat room not found or no match';
    RETURN json_build_object(
      'success', false,
      'error', 'Chat room not found or no associated match',
      'all_members', '[]'::json,
      'total_members', 0
    );
  END IF;
  
  RAISE NOTICE '[get_chat_room_members] Group 1: %, Group 2: %', v_group_1_id, v_group_2_id;
  
  -- Debug: Show ALL members from both groups regardless of status
  FOR member_record IN 
    SELECT u.first_name, u.last_name, gm.status, gm.group_id
    FROM group_members gm 
    JOIN users u ON gm.user_id = u.id 
    WHERE gm.group_id IN (v_group_1_id, v_group_2_id)
  LOOP
    RAISE NOTICE '[get_chat_room_members] Found member: % % (status: %, group: %)', 
      member_record.first_name, member_record.last_name, member_record.status, member_record.group_id;
  END LOOP;
  
  -- Simply get ALL members from BOTH groups with status = 'joined'
  SELECT json_build_object(
    'success', true,
    'match_id', v_match_id,
    'all_members', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', u.id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'birth_date', u.birth_date,
          'age', EXTRACT(YEAR FROM age(CURRENT_DATE, u.birth_date)),
          'gender', u.gender,
          'bio', u.bio,
          'group_id', gm.group_id,
          'images', (
            SELECT COALESCE(json_agg(
              json_build_object(
                'id', ui.id,
                'image_url', ui.image_url,
                'position', ui.position
              ) ORDER BY ui.position
            ), '[]'::json)
            FROM user_images ui
            WHERE ui.user_id = u.id
          ),
          'primary_image', (
            SELECT ui.image_url 
            FROM user_images ui 
            WHERE ui.user_id = u.id 
            ORDER BY ui.position ASC 
            LIMIT 1
          )
        ) ORDER BY gm.joined_at ASC
      ), '[]'::json)
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id IN (v_group_1_id, v_group_2_id)
        AND gm.status = 'joined'
    ),
    'total_members', (
      SELECT COUNT(*)
      FROM group_members gm
      WHERE gm.group_id IN (v_group_1_id, v_group_2_id) 
        AND gm.status = 'joined'
    )
  ) INTO result;
  
  RAISE NOTICE '[get_chat_room_members] Returning result for % total members', 
    (SELECT COUNT(*) FROM group_members WHERE group_id IN (v_group_1_id, v_group_2_id) AND status = 'joined');
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[get_chat_room_members] Exception: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'all_members', '[]'::json,
      'total_members', 0
    );
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- DAILY SWIPE LIMITS SYSTEM
-- Updated group-based swiping with daily limits
-- ====================================

-- Updated like_group function with swipe limits (replaces old user-based version)
CREATE OR REPLACE FUNCTION like_group(
  p_from_group_id UUID,
  p_to_group_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_swipe_limit_info JSON;
  v_can_swipe BOOLEAN;
  v_existing_like_id UUID;
  v_reverse_like_id UUID;
  v_match_id UUID;
  v_chat_room_id UUID;
  v_result JSON;
BEGIN
  -- Check daily swipe limit first
  SELECT check_daily_swipe_limit(p_from_group_id) INTO v_swipe_limit_info;
  v_can_swipe := (v_swipe_limit_info->>'can_swipe')::BOOLEAN;
  
  -- Return limit exceeded error if no swipes remaining
  IF NOT v_can_swipe THEN
    RETURN json_build_object(
      'status', 'limit_exceeded',
      'message', 'Daily swipe limit reached',
      'swipe_info', v_swipe_limit_info
    );
  END IF;
  
  -- Increment swipe count
  SELECT increment_daily_swipe_count(p_from_group_id) INTO v_swipe_limit_info;
  
  -- Check if this like already exists
  SELECT id INTO v_existing_like_id
  FROM likes
  WHERE from_group_id = p_from_group_id 
    AND to_group_id = p_to_group_id;

  -- If like doesn't exist, create it
  IF v_existing_like_id IS NULL THEN
    INSERT INTO likes (from_group_id, to_group_id, created_at)
    VALUES (p_from_group_id, p_to_group_id, NOW())
    RETURNING id INTO v_existing_like_id;
  END IF;

  -- Check if the target group already liked us back (mutual like)
  SELECT id INTO v_reverse_like_id
  FROM likes
  WHERE from_group_id = p_to_group_id 
    AND to_group_id = p_from_group_id;

  -- If mutual like exists, create a match and chat room
  IF v_reverse_like_id IS NOT NULL THEN
    -- Check if match already exists
    SELECT id INTO v_match_id
    FROM matches
    WHERE (group_1_id = p_from_group_id AND group_2_id = p_to_group_id)
       OR (group_1_id = p_to_group_id AND group_2_id = p_from_group_id);

    -- Create match if it doesn't exist
    IF v_match_id IS NULL THEN
      INSERT INTO matches (group_1_id, group_2_id, status, created_at)
      VALUES (p_from_group_id, p_to_group_id, 'active', NOW())
      RETURNING id INTO v_match_id;
    END IF;

    -- Check if chat room already exists
    SELECT id INTO v_chat_room_id
    FROM chat_rooms
    WHERE match_id = v_match_id;

    -- Create chat room if it doesn't exist
    IF v_chat_room_id IS NULL THEN
      INSERT INTO chat_rooms (match_id, created_at)
      VALUES (v_match_id, NOW())
      RETURNING id INTO v_chat_room_id;
    END IF;

    -- Return matched status with chat room ID and updated swipe info
    v_result := json_build_object(
      'status', 'matched',
      'chat_room_id', v_chat_room_id,
      'match_id', v_match_id,
      'swipe_info', v_swipe_limit_info
    );
  ELSE
    -- Return liked status (no match yet) with updated swipe info
    v_result := json_build_object(
      'status', 'liked',
      'like_id', v_existing_like_id,
      'swipe_info', v_swipe_limit_info
    );
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error status
    RETURN json_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

-- Updated pass_group function with swipe limits
CREATE OR REPLACE FUNCTION pass_group(
  p_from_group_id UUID, 
  p_to_group_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_swipe_limit_info JSON;
  v_can_swipe BOOLEAN;
  v_result JSON;
BEGIN
  -- Check daily swipe limit first
  SELECT check_daily_swipe_limit(p_from_group_id) INTO v_swipe_limit_info;
  v_can_swipe := (v_swipe_limit_info->>'can_swipe')::BOOLEAN;
  
  -- Return limit exceeded error if no swipes remaining
  IF NOT v_can_swipe THEN
    RETURN json_build_object(
      'status', 'limit_exceeded',
      'message', 'Daily swipe limit reached',
      'swipe_info', v_swipe_limit_info
    );
  END IF;
  
  -- Increment swipe count
  SELECT increment_daily_swipe_count(p_from_group_id) INTO v_swipe_limit_info;
  
  -- Insert pass record (create group_passes table if it doesn't exist)
  INSERT INTO group_passes (from_group_id, to_group_id)
  VALUES (p_from_group_id, p_to_group_id)
  ON CONFLICT (from_group_id, to_group_id) DO NOTHING;
  
  -- Return success with updated swipe info
  RETURN json_build_object(
    'status', 'passed',
    'swipe_info', v_swipe_limit_info
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$;

-- Grant necessary permissions for updated functions
GRANT EXECUTE ON FUNCTION like_group(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION like_group(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION pass_group(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION pass_group(UUID, UUID) TO authenticated;

-- =====================================================
-- QR CODE / LINK INVITATION: Tables and Functions
-- =====================================================

-- Create invitation tokens table for secure QR/link invitations
CREATE TABLE IF NOT EXISTS invitation_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ NULL,
  used_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Indexes for performance
  INDEX idx_invitation_tokens_token ON invitation_tokens(token),
  INDEX idx_invitation_tokens_group_id ON invitation_tokens(group_id),
  INDEX idx_invitation_tokens_expires_at ON invitation_tokens(expires_at)
);

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

-- Grant permissions for all invitation token functions
GRANT EXECUTE ON FUNCTION generate_invitation_token(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invitation_token(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_invitation_token(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION join_bubble_direct(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION join_bubble_direct(UUID, UUID, TEXT) TO authenticated;