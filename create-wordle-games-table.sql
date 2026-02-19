-- Create wordle_games table to track Wordle game results
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS "public"."wordle_games" (
  "id" BIGSERIAL PRIMARY KEY,
  "wallet_address" TEXT NOT NULL,
  "game_date" DATE NOT NULL,
  "word" TEXT NOT NULL,
  "guesses" INTEGER NOT NULL,
  "won" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "unique_daily_game" UNIQUE ("wallet_address", "game_date")
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "idx_wordle_games_wallet_date" ON "public"."wordle_games" ("wallet_address", "game_date");
CREATE INDEX IF NOT EXISTS "idx_wordle_games_date" ON "public"."wordle_games" ("game_date");

-- Enable RLS (Row Level Security)
ALTER TABLE "public"."wordle_games" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own games
CREATE POLICY "Allow users to insert their own wordle games"
ON "public"."wordle_games"
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Users can view their own games
CREATE POLICY "Allow users to view their own wordle games"
ON "public"."wordle_games"
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy: Allow public read for leaderboards (optional - you can restrict this later)
CREATE POLICY "Allow public read of wordle games"
ON "public"."wordle_games"
FOR SELECT
TO anon, authenticated
USING (true);
