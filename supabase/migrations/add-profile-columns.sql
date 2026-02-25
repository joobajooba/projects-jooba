-- Add missing columns to users table for profile data
-- Run this in Supabase SQL Editor

-- Add 'x' column if it doesn't exist
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "x" TEXT;

-- Add 'profile_picture_url' column if it doesn't exist
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "profile_picture_url" TEXT;

-- Verify UPDATE policy exists (allows users to update their own profile)
-- Drop existing policy if it exists to recreate it
DROP POLICY IF EXISTS "Allow users to update their own profile" ON "public"."users";

-- Create UPDATE policy
CREATE POLICY "Allow users to update their own profile" 
ON "public"."users" 
FOR UPDATE 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN ('username', 'otherisde', 'x', 'profile_picture_url');
