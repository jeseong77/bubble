-- Add username column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE public.users ADD COLUMN username text UNIQUE;

-- Create index for faster username lookups
CREATE INDEX idx_users_username ON public.users(username);

-- Optional: Add comment to document the column
COMMENT ON COLUMN public.users.username IS 'User-defined unique identifier for easy discovery and connections';