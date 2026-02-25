-- Setup Supabase Storage bucket for profile pictures
-- Run this in Supabase SQL Editor

-- Step 1: Create the storage bucket (if it doesn't exist)
-- Note: You must create this manually in the Supabase Dashboard first:
-- Go to Storage → Create bucket → Name: "profile-pictures" → Public: Yes
-- RLS is already enabled on storage.objects by default in Supabase

-- Step 2: Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public uploads to profile-pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from profile-pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to profile-pictures" ON storage.objects;

-- Step 4: Create INSERT policy (allows uploads)
CREATE POLICY "Allow public uploads to profile-pictures"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'profile-pictures');

-- Step 5: Create SELECT policy (allows reading/downloading)
CREATE POLICY "Allow public reads from profile-pictures"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'profile-pictures');

-- Step 6: Create UPDATE policy (allows overwriting existing files)
CREATE POLICY "Allow authenticated updates to profile-pictures"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'profile-pictures')
WITH CHECK (bucket_id = 'profile-pictures');

-- Step 7: Create DELETE policy (allows deleting old files)
CREATE POLICY "Allow authenticated deletes from profile-pictures"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'profile-pictures');

-- Verify policies were created
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%profile-pictures%';
