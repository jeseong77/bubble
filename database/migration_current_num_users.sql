-- =====================================================
-- MIGRATION: Add current_num_users column to groups table
-- =====================================================
-- 
-- INSTRUCTIONS: Run these SQL commands in Supabase SQL Editor in order
--

-- Step 1: Add the current_num_users column with default value
ALTER TABLE groups ADD COLUMN IF NOT EXISTS current_num_users INTEGER DEFAULT 1;

-- Step 2: Add constraint to ensure current_num_users doesn't exceed max_size
ALTER TABLE groups ADD CONSTRAINT IF NOT EXISTS groups_current_num_users_check 
  CHECK (current_num_users <= max_size);

-- Step 3: Update existing groups to have correct current_num_users value
UPDATE groups SET current_num_users = (
  SELECT COUNT(*) FROM group_members 
  WHERE group_members.group_id = groups.id AND group_members.status = 'joined'
);

-- Step 4: Fix existing groups with wrong status
UPDATE groups SET status = 'full' 
WHERE current_num_users >= max_size AND status = 'forming';

-- Step 5: Verify the migration worked
SELECT 
  id,
  name,
  status,
  current_num_users,
  max_size,
  (SELECT COUNT(*) FROM group_members WHERE group_id = groups.id AND status = 'joined') as actual_count
FROM groups 
ORDER BY created_at DESC;

-- This should show all groups with matching current_num_users and actual_count,
-- and correct status ('full' when current_num_users >= max_size)