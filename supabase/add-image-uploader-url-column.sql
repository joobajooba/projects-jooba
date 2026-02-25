-- Add image_uploader_url for the Image Uploader panel (panel above Profile Description)
-- Run this in Supabase SQL Editor.

ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "image_uploader_url" TEXT;

COMMENT ON COLUMN "public"."users"."image_uploader_url" IS 'Image displayed in the Image Uploader panel on the profile page';
