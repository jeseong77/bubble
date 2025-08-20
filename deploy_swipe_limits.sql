-- Daily Swipe Limits System Deployment Script
-- Run this script in Supabase SQL Editor to deploy the complete system

-- Step 1: Create the daily swipes tracking table and group_passes table
CREATE TABLE IF NOT EXISTS public.group_daily_swipes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  swipe_date date NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/New_York')::date,
  swipe_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_daily_swipes_unique UNIQUE(group_id, swipe_date)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_group_daily_swipes_group_date 
ON public.group_daily_swipes(group_id, swipe_date);

-- Create group_passes table if it doesn't exist (for pass tracking)
CREATE TABLE IF NOT EXISTS public.group_passes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  to_group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_passes_unique UNIQUE(from_group_id, to_group_id)
);

-- Index for group_passes
CREATE INDEX IF NOT EXISTS idx_group_passes_from_group 
ON public.group_passes(from_group_id);

-- Step 2: Function to check remaining daily swipes for a group
CREATE OR REPLACE FUNCTION check_daily_swipe_limit(p_group_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_date date;
  v_swipe_count integer := 0;
  v_daily_limit integer := 5;
  v_remaining integer;
  v_reset_time timestamp with time zone;
BEGIN
  -- Get current date in NYC timezone
  v_current_date := (NOW() AT TIME ZONE 'America/New_York')::date;
  
  -- Get today's swipe count for the group
  SELECT swipe_count INTO v_swipe_count
  FROM group_daily_swipes
  WHERE group_id = p_group_id AND swipe_date = v_current_date;
  
  -- If no record exists, swipe count is 0
  IF v_swipe_count IS NULL THEN
    v_swipe_count := 0;
  END IF;
  
  -- Calculate remaining swipes
  v_remaining := GREATEST(0, v_daily_limit - v_swipe_count);
  
  -- Calculate next reset time (midnight NYC time)
  v_reset_time := ((v_current_date + INTERVAL '1 day') AT TIME ZONE 'America/New_York');
  
  -- Return comprehensive swipe limit info
  RETURN json_build_object(
    'remaining_swipes', v_remaining,
    'used_swipes', v_swipe_count,
    'daily_limit', v_daily_limit,
    'can_swipe', v_remaining > 0,
    'reset_time', v_reset_time,
    'current_date', v_current_date
  );
END;
$$;

-- Step 3: Function to increment daily swipe count (called when swiping)
CREATE OR REPLACE FUNCTION increment_daily_swipe_count(p_group_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_date date;
  v_daily_limit integer := 5;
  v_new_count integer;
  v_remaining integer;
  v_reset_time timestamp with time zone;
BEGIN
  -- Get current date in NYC timezone
  v_current_date := (NOW() AT TIME ZONE 'America/New_York')::date;
  
  -- Insert or update swipe count for today
  INSERT INTO group_daily_swipes (group_id, swipe_date, swipe_count, updated_at)
  VALUES (p_group_id, v_current_date, 1, NOW())
  ON CONFLICT (group_id, swipe_date)
  DO UPDATE SET 
    swipe_count = group_daily_swipes.swipe_count + 1,
    updated_at = NOW()
  RETURNING swipe_count INTO v_new_count;
  
  -- Calculate remaining swipes
  v_remaining := GREATEST(0, v_daily_limit - v_new_count);
  
  -- Calculate next reset time (midnight NYC time)
  v_reset_time := ((v_current_date + INTERVAL '1 day') AT TIME ZONE 'America/New_York');
  
  -- Return updated swipe limit info
  RETURN json_build_object(
    'remaining_swipes', v_remaining,
    'used_swipes', v_new_count,
    'daily_limit', v_daily_limit,
    'can_swipe', v_remaining > 0,
    'reset_time', v_reset_time,
    'limit_reached', v_remaining = 0
  );
END;
$$;

-- Step 4: Updated like_group function with swipe limits (replaces old user-based version)
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

-- Step 5: Updated pass_group function with swipe limits
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

-- Step 6: Grant permissions for all functions
GRANT EXECUTE ON FUNCTION check_daily_swipe_limit(UUID) TO anon;
GRANT EXECUTE ON FUNCTION check_daily_swipe_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_daily_swipe_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_daily_swipe_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION like_group(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION like_group(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION pass_group(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION pass_group(UUID, UUID) TO authenticated;

-- Step 7: Enable RLS on the new table
ALTER TABLE public.group_daily_swipes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - groups can only see/modify their own swipe counts
CREATE POLICY "Groups can view their own daily swipe counts" ON public.group_daily_swipes
  FOR SELECT USING (
    group_id IN (
      SELECT g.id FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = auth.uid() AND gm.status = 'joined'
    )
  );

CREATE POLICY "Groups can insert their own daily swipe counts" ON public.group_daily_swipes
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT g.id FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = auth.uid() AND gm.status = 'joined'
    )
  );

CREATE POLICY "Groups can update their own daily swipe counts" ON public.group_daily_swipes
  FOR UPDATE USING (
    group_id IN (
      SELECT g.id FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = auth.uid() AND gm.status = 'joined'
    )
  );

-- Step 8: Test the implementation (optional)
-- You can run these queries to test the functions:

-- Test 1: Check swipe limit for a group (replace with actual group ID)
-- SELECT check_daily_swipe_limit('your-group-id-here');

-- Test 2: Test increment function (replace with actual group ID)
-- SELECT increment_daily_swipe_count('your-group-id-here');

-- Test 3: View daily swipe records
-- SELECT * FROM group_daily_swipes ORDER BY swipe_date DESC, updated_at DESC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Daily Swipe Limits System deployed successfully!';
  RAISE NOTICE 'Features enabled:';
  RAISE NOTICE '- 5 swipes per group per day';
  RAISE NOTICE '- Resets at midnight NYC time'; 
  RAISE NOTICE '- Shared limits among group members';
  RAISE NOTICE '- Real-time swipe counter in UI';
  RAISE NOTICE '- Disabled buttons when limit reached';
END $$;