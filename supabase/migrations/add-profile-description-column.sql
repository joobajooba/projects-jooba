-- Add profile_description column to users for bio/description
-- Run this in Supabase SQL Editor.

ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "profile_description" TEXT;

COMMENT ON COLUMN "public"."users"."profile_description" IS 'User profile bio/description shown on profile page';
