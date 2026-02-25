-- Allow anon uploads to profile-pictures bucket (fixes "new row violates row-level security policy")
-- The app uses the anon key (wallet-based), not Supabase Auth, so INSERT must be allowed for anon.
-- Run this in Supabase SQL Editor.

DROP POLICY IF EXISTS "Allow anon uploads to profile-pictures" ON storage.objects;

-- Allow anon to INSERT into profile-pictures when path starts with a wallet-address folder
CREATE POLICY "Allow anon uploads to profile-pictures"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] ~ '^0x[a-fA-F0-9]{40}$'
);

-- Optional: if you had "Secure upload profile pictures" for authenticated only, anon still needs the above.
-- SELECT/UPDATE/DELETE policies are unchanged; anon only needs INSERT for the Image Uploader.
