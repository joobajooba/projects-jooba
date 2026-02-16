-- Supabase RLS Policy Fix for users table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/jitkwbatwymqtlzxiyil/sql

-- First, drop any existing INSERT policies that might be misconfigured
DROP POLICY IF EXISTS "Allow users to insert their own wallet" ON "public"."users";
DROP POLICY IF EXISTS "Allow users to insert wallet" ON "public"."users";
DROP POLICY IF EXISTS "Allow anon to insert" ON "public"."users";

-- Create a new policy that allows INSERT for anon and authenticated roles
CREATE POLICY "Allow users to insert wallet"
ON "public"."users"
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Verify RLS is enabled on the table (should return 't' for true)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- List all policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';
