-- Asymmetric Pass System Implementation
-- Run this SQL in Supabase SQL Editor

-- 1. Create group_passes table
CREATE TABLE IF NOT EXISTS public.group_passes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_group_id uuid NOT NULL,
  to_group_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_passes_pkey PRIMARY KEY (id),
  CONSTRAINT group_passes_from_group_fkey FOREIGN KEY (from_group_id) REFERENCES public.groups(id) ON DELETE CASCADE,
  CONSTRAINT group_passes_to_group_fkey FOREIGN KEY (to_group_id) REFERENCES public.groups(id) ON DELETE CASCADE,
  CONSTRAINT group_passes_unique UNIQUE(from_group_id, to_group_id)
);

-- 2. Create pass_group RPC function
CREATE OR REPLACE FUNCTION pass_group(p_from_group_id UUID, p_to_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO group_passes (from_group_id, to_group_id)
  VALUES (p_from_group_id, p_to_group_id)
  ON CONFLICT (from_group_id, to_group_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 3. Update find_matching_group to exclude groups I passed on (but not groups that passed on me)
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

-- 4. Update like_group to handle silent discarding when target group passed on us
CREATE OR REPLACE FUNCTION like_group(p_from_group_id UUID, p_to_group_id UUID)
RETURNS JSON AS $$
DECLARE
  mutual_like_exists BOOLEAN;
  new_match_id UUID;
  new_chat_room_id UUID;
BEGIN
  -- Check if target group already passed on us - if yes, silently discard this like
  IF EXISTS (
    SELECT 1 FROM group_passes 
    WHERE from_group_id = p_to_group_id AND to_group_id = p_from_group_id
  ) THEN
    -- Target group already passed on us, silently discard this like
    -- Return normal "liked" response so user doesn't get any feedback
    RETURN json_build_object('status', 'liked');
  END IF;
  
  -- Insert the like (will be ignored if already exists)
  INSERT INTO likes (from_group_id, to_group_id, created_at)
  VALUES (p_from_group_id, p_to_group_id, NOW())
  ON CONFLICT (from_group_id, to_group_id) DO NOTHING;
  
  -- Check if there's a mutual like (other group liked us back)
  SELECT EXISTS (
    SELECT 1 FROM likes 
    WHERE from_group_id = p_to_group_id AND to_group_id = p_from_group_id
  ) INTO mutual_like_exists;
  
  IF mutual_like_exists THEN
    -- Create a match
    INSERT INTO matches (group_1_id, group_2_id, status, created_at)
    VALUES (
      LEAST(p_from_group_id, p_to_group_id),
      GREATEST(p_from_group_id, p_to_group_id),
      'active',
      NOW()
    )
    RETURNING id INTO new_match_id;
    
    -- Create a chat room for the match
    INSERT INTO chat_rooms (match_id, created_at)
    VALUES (new_match_id, NOW())
    RETURNING id INTO new_chat_room_id;
    
    -- Return match information
    RETURN json_build_object(
      'status', 'matched',
      'match_id', new_match_id,
      'chat_room_id', new_chat_room_id
    );
  ELSE
    -- Just a like, no match yet
    RETURN json_build_object('status', 'liked');
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN json_build_object(
      'status', 'error',
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;