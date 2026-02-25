-- Add profile_picture_metadata column to users (fixes "Could not find the 'profile_picture_metadata' column" error)
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query → paste → Run

ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS "profile_picture_metadata" JSONB;
