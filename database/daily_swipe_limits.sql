-- Daily swipe limits system for group-based swiping
-- Resets daily at midnight NYC time, shared among group members

-- 1. Create the daily swipes tracking table
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

-- 2. Function to check remaining daily swipes for a group
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

-- 3. Function to increment daily swipe count (called when swiping)
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

-- 4. Grant permissions for RPC functions
GRANT EXECUTE ON FUNCTION check_daily_swipe_limit(UUID) TO anon;
GRANT EXECUTE ON FUNCTION check_daily_swipe_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_daily_swipe_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_daily_swipe_count(UUID) TO authenticated;

-- 5. Enable RLS on the new table
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