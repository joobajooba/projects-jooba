-- Complete RLS Fix for users table
-- Run this entire script in Supabase SQL Editor

-- Step 1: Enable RLS on the table (if not already enabled)
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- Step 2: Verify RLS is enabled
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';
-- Should return: rls_enabled = true (or 't')

-- Step 3: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Allow users to insert their own wallet" ON "public"."users";
DROP POLICY IF EXISTS "Allow users to insert wallet" ON "public"."users";
DROP POLICY IF EXISTS "Allow anon to insert" ON "public"."users";
DROP POLICY IF EXISTS "Enable insert for anon users" ON "public"."users";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."users";

-- Step 4: Create INSERT policy for anon role
CREATE POLICY "Allow anon to insert wallet"
ON "public"."users"
FOR INSERT
TO anon
WITH CHECK (true);

-- Step 5: Create INSERT policy for authenticated role  
CREATE POLICY "Allow authenticated to insert wallet"
ON "public"."users"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 6: Verify policies were created
SELECT 
  policyname,
  cmd as operation,
  roles,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users' 
  AND cmd = 'INSERT';

-- You should see 2 policies:
-- 1. "Allow anon to insert wallet" with roles = {anon}
-- 2. "Allow authenticated to insert wallet" with roles = {authenticated}
