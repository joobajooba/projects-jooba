-- Add 5 NFT slot URL columns to users table for profile display panels
-- Run this in Supabase SQL Editor

ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS "nft_slot_1_url" TEXT,
ADD COLUMN IF NOT EXISTS "nft_slot_2_url" TEXT,
ADD COLUMN IF NOT EXISTS "nft_slot_3_url" TEXT,
ADD COLUMN IF NOT EXISTS "nft_slot_4_url" TEXT,
ADD COLUMN IF NOT EXISTS "nft_slot_5_url" TEXT;
