-- Create connections_games table to track Connections game results per wallet
-- Run this in Supabase SQL Editor
-- Metrics: times beat the game, mistakes (lives) used per game, average lives used, daily streak

CREATE TABLE IF NOT EXISTS "public"."connections_games" (
  "id" BIGSERIAL PRIMARY KEY,
  "wallet_address" TEXT NOT NULL,
  "game_date" DATE NOT NULL,
  "won" BOOLEAN NOT NULL DEFAULT false,
  "mistakes_used" INTEGER NOT NULL CHECK (mistakes_used >= 0 AND mistakes_used <= 4),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "unique_connections_daily_game" UNIQUE ("wallet_address", "game_date")
);

COMMENT ON COLUMN "public"."connections_games"."mistakes_used" IS 'Number of mistakes (0-4) used in this game; 4 mistakes = game over.';
COMMENT ON COLUMN "public"."connections_games"."won" IS 'True if player found all four groups.';

CREATE INDEX IF NOT EXISTS "idx_connections_games_wallet_date" ON "public"."connections_games" ("wallet_address", "game_date");
CREATE INDEX IF NOT EXISTS "idx_connections_games_wallet" ON "public"."connections_games" ("wallet_address");
CREATE INDEX IF NOT EXISTS "idx_connections_games_date" ON "public"."connections_games" ("game_date");

ALTER TABLE "public"."connections_games" ENABLE ROW LEVEL SECURITY;

-- Secure insert: validate wallet format (application verifies ownership)
DROP POLICY IF EXISTS "Secure insert connections games" ON "public"."connections_games";
CREATE POLICY "Secure insert connections games"
ON "public"."connections_games"
FOR INSERT
TO anon, authenticated
WITH CHECK (
  wallet_address IS NOT NULL
  AND LENGTH(wallet_address) = 42
  AND wallet_address ~ '^0x[a-fA-F0-9]{40}$'
  AND game_date IS NOT NULL
  AND mistakes_used >= 0 AND mistakes_used <= 4
);

-- Allow update for same-day replay (upsert updates existing row)
DROP POLICY IF EXISTS "Secure update connections games" ON "public"."connections_games";
CREATE POLICY "Secure update connections games"
ON "public"."connections_games"
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (
  wallet_address IS NOT NULL
  AND LENGTH(wallet_address) = 42
  AND wallet_address ~ '^0x[a-fA-F0-9]{40}$'
  AND game_date IS NOT NULL
  AND mistakes_used >= 0 AND mistakes_used <= 4
);

-- Public read for leaderboards / stats
DROP POLICY IF EXISTS "Public read connections games" ON "public"."connections_games";
CREATE POLICY "Public read connections games"
ON "public"."connections_games"
FOR SELECT
TO anon, authenticated
USING (true);

-- Optional: wallet format constraint (match wordle_games style)
ALTER TABLE "public"."connections_games"
DROP CONSTRAINT IF EXISTS "check_connections_wallet_format";
ALTER TABLE "public"."connections_games"
ADD CONSTRAINT "check_connections_wallet_format"
CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$');
