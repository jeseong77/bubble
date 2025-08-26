-- Gender Value Unification Migration
-- This will standardize all gender values to: man, woman, nonbinary, everyone
-- Run this SQL in Supabase SQL Editor

-- Step 1: Migrate existing user data to new values
UPDATE users SET gender = 'man' WHERE gender IN ('male', 'Male');
UPDATE users SET gender = 'woman' WHERE gender IN ('female', 'Female');  
UPDATE users SET gender = 'nonbinary' WHERE gender IN ('other', 'Other', 'Nonbinary');

UPDATE users SET preferred_gender = 'man' WHERE preferred_gender IN ('male', 'Male');
UPDATE users SET preferred_gender = 'woman' WHERE preferred_gender IN ('female', 'Female');
UPDATE users SET preferred_gender = 'nonbinary' WHERE preferred_gender IN ('other', 'Other', 'Nonbinary');
UPDATE users SET preferred_gender = 'everyone' WHERE preferred_gender IN ('any');

-- Step 2: Migrate existing group data to new values
UPDATE groups SET group_gender = 'man' WHERE group_gender IN ('male');
UPDATE groups SET group_gender = 'woman' WHERE group_gender IN ('female');
UPDATE groups SET group_gender = 'nonbinary' WHERE group_gender IN ('mixed', 'other');

UPDATE groups SET preferred_gender = 'man' WHERE preferred_gender IN ('male');
UPDATE groups SET preferred_gender = 'woman' WHERE preferred_gender IN ('female');
UPDATE groups SET preferred_gender = 'everyone' WHERE preferred_gender IN ('any');

-- Step 3: Remove old constraints
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_group_gender_check;
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_preferred_gender_check;

-- Step 4: Add new constraints with only the 4 unified values
ALTER TABLE public.groups ADD CONSTRAINT groups_group_gender_check 
CHECK (group_gender = ANY (ARRAY['man'::text, 'woman'::text, 'nonbinary'::text, 'everyone'::text]));

ALTER TABLE public.groups ADD CONSTRAINT groups_preferred_gender_check 
CHECK (preferred_gender = ANY (ARRAY['man'::text, 'woman'::text, 'nonbinary'::text, 'everyone'::text]));

-- Step 5: Update RPC functions to use only new values

-- Updated create_group function (no backward compatibility)
CREATE OR REPLACE FUNCTION create_group(p_creator_id UUID, p_max_size INTEGER, p_group_name TEXT, p_preferred_gender TEXT)
RETURNS UUID AS $$
DECLARE
  new_group_id UUID;
  creator_gender TEXT;
BEGIN
  SELECT gender INTO creator_gender FROM users WHERE id = p_creator_id;
  
  IF creator_gender IS NULL THEN
    RAISE EXCEPTION 'User with ID % not found in users table', p_creator_id;
  END IF;
  
  IF creator_gender NOT IN ('man', 'woman', 'nonbinary', 'everyone') THEN
    RAISE EXCEPTION 'Invalid gender value: %. Expected man, woman, nonbinary, or everyone', creator_gender;
  END IF;
  
  IF p_preferred_gender NOT IN ('man', 'woman', 'nonbinary', 'everyone') THEN
    RAISE EXCEPTION 'Invalid preferred_gender value: %. Expected man, woman, nonbinary, or everyone', p_preferred_gender;
  END IF;
  
  INSERT INTO groups (name, max_size, preferred_gender, creator_id, group_gender, current_num_users)
  VALUES (p_group_name, p_max_size, p_preferred_gender, p_creator_id, creator_gender, 1)
  RETURNING id INTO new_group_id;
  
  IF new_group_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create group - INSERT returned NULL';
  END IF;
  
  INSERT INTO group_members (group_id, user_id, status, joined_at)
  VALUES (new_group_id, p_creator_id, 'joined', NOW());
  
  RETURN new_group_id;
END;
$$ LANGUAGE plpgsql;

-- Updated find_matching_group function (clean, no backward compatibility)
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
  SELECT * INTO v_current_group 
  FROM groups WHERE id = p_group_id;
  
  RAISE NOTICE 'Current group: id=%, name=%, group_gender=%, preferred_gender=%, status=%', 
    v_current_group.id, v_current_group.name, v_current_group.group_gender, 
    v_current_group.preferred_gender, v_current_group.status;
  
  SELECT COUNT(*) INTO v_total_groups
  FROM groups g
  WHERE g.id != p_group_id
    AND g.status = 'full';
  
  RAISE NOTICE 'Total available groups (excluding current): %', v_total_groups;
  
  SELECT COUNT(*) INTO v_matching_groups
  FROM groups g
  WHERE g.id != p_group_id
    AND g.status = 'full'
    AND (
      g.group_gender = v_current_group.preferred_gender 
      AND v_current_group.group_gender = g.preferred_gender
    );
  
  RAISE NOTICE 'Groups matching gender preferences: %', v_matching_groups;
  
  RETURN QUERY
  SELECT 
    g.id as group_id,
    g.name as group_name,
    g.group_gender,
    g.preferred_gender,
    100 as match_score
  FROM groups g
  WHERE g.id != p_group_id
    AND g.status = 'full'
    AND g.id NOT IN (
      SELECT DISTINCT group_1_id FROM matches WHERE group_2_id = p_group_id
      UNION
      SELECT DISTINCT group_2_id FROM matches WHERE group_1_id = p_group_id
      UNION
      SELECT DISTINCT to_group_id FROM group_passes WHERE from_group_id = p_group_id
    )
    AND (
      g.group_gender = v_current_group.preferred_gender 
      AND v_current_group.group_gender = g.preferred_gender
    )
  ORDER BY g.created_at ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;