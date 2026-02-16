-- Add SELECT policies so the app can check if user exists and read inserted data
-- Run this in Supabase SQL Editor

-- SELECT policy for anon role (to check if wallet exists)
CREATE POLICY "Allow anon to select own wallet"
ON "public"."users"
FOR SELECT
TO anon
USING (true);

-- SELECT policy for authenticated role
CREATE POLICY "Allow authenticated to select own wallet"
ON "public"."users"
FOR SELECT
TO authenticated
USING (true);

-- Verify all policies
SELECT 
  policyname,
  cmd as operation,
  roles,
  using_expr,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY cmd, policyname;
