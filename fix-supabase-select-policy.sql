-- Fix SELECT policy for users table so UPDATE queries can return data
-- Run this in Supabase SQL Editor

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Allow users to read their own profile" ON "public"."users";

-- Create SELECT policy that allows reading user profiles
CREATE POLICY "Allow users to read their own profile" 
ON "public"."users" 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users';
