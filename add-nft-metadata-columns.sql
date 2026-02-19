-- Add metadata columns to store NFT trait/attribute data for each slot
-- Run this in Supabase SQL Editor

ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS "nft_slot_1_metadata" JSONB,
ADD COLUMN IF NOT EXISTS "nft_slot_2_metadata" JSONB,
ADD COLUMN IF NOT EXISTS "nft_slot_3_metadata" JSONB,
ADD COLUMN IF NOT EXISTS "nft_slot_4_metadata" JSONB,
ADD COLUMN IF NOT EXISTS "nft_slot_5_metadata" JSONB;

-- Also add metadata for profile picture
ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS "profile_picture_metadata" JSONB;
