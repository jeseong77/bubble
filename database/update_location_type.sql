-- Update location column type from USER-DEFINED to text
-- Run this in Supabase SQL Editor

-- Drop the existing location column if it's a PostGIS type
-- ALTER TABLE public.users DROP COLUMN IF EXISTS location;

-- Add location as text field if it doesn't exist
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location text;

-- If the column already exists and needs type change, use this approach:
-- First, add new column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location_text text;

-- Copy data if there was existing location data (this step may need manual handling)
-- UPDATE public.users SET location_text = location::text WHERE location IS NOT NULL;

-- Drop old column (uncomment if needed)
-- ALTER TABLE public.users DROP COLUMN IF EXISTS location;

-- Rename new column to location (uncomment if needed)
-- ALTER TABLE public.users RENAME COLUMN location_text TO location;

-- For safety, we'll just ensure the location column exists as text
-- Run this if the location column doesn't exist or needs to be text type:
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location text;