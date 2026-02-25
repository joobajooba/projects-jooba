-- Complete check and fix for users table RLS policy
-- Run this in Supabase SQL Editor

-- 1. Check if RLS is enabled (should be true)
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- 2. List all existing policies
SELECT 
  policyname,
  cmd as operation,
  roles,
  qual as using_expr,
  with_check as with_check_expr
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';

-- 3. Drop ALL existing INSERT policies to start fresh
DROP POLICY IF EXISTS "Allow users to insert their own wallet" ON "public"."users";
DROP POLICY IF EXISTS "Allow users to insert wallet" ON "public"."users";
DROP POLICY IF EXISTS "Allow anon to insert" ON "public"."users";
DROP POLICY IF EXISTS "Enable insert for anon users" ON "public"."users";
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."users";

-- 4. Create the correct policy
CREATE POLICY "Allow users to insert wallet"
ON "public"."users"
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 5. Verify it was created
SELECT 
  policyname,
  cmd as operation,
  roles,
  with_check as with_check_expr
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'INSERT';
