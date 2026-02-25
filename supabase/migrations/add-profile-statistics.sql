-- Profile Statistics: profile views per wallet + profile age (first connection)
-- Run this in Supabase SQL Editor.

-- 1. Add columns to users for profile stats and age
ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "profile_view_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "total_bops" INTEGER NOT NULL DEFAULT 0;

-- Backfill created_at for existing users (use updated_at or leave as NOW() if no other timestamp exists)
DO $$
BEGIN
  UPDATE "public"."users"
  SET created_at = COALESCE(created_at, NOW())
  WHERE created_at IS NULL;
END $$;

-- 2. Table: one row per "view" (logged-in wallet viewed a profile)
CREATE TABLE IF NOT EXISTS "public"."profile_views" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "viewer_wallet_address" TEXT NOT NULL,
  "viewed_wallet_address" TEXT NOT NULL,
  "viewed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for counting views per profile and for rate-limiting lookups
CREATE INDEX IF NOT EXISTS "idx_profile_views_viewed"
  ON "public"."profile_views" ("viewed_wallet_address", "viewed_at");

CREATE INDEX IF NOT EXISTS "idx_profile_views_viewer_viewed"
  ON "public"."profile_views" ("viewer_wallet_address", "viewed_wallet_address", "viewed_at");

-- 3. Trigger: when a view is inserted, increment the viewed user's profile_view_count
CREATE OR REPLACE FUNCTION "public"."increment_profile_view_count"()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "public"."users"
  SET profile_view_count = profile_view_count + 1
  WHERE wallet_address = NEW.viewed_wallet_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS "trg_increment_profile_view_count" ON "public"."profile_views";
CREATE TRIGGER "trg_increment_profile_view_count"
  AFTER INSERT ON "public"."profile_views"
  FOR EACH ROW
  EXECUTE PROCEDURE "public"."increment_profile_view_count"();

-- 4. RLS: allow anon to read profile_views (optional, for debugging) and insert new views
ALTER TABLE "public"."profile_views" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert profile view" ON "public"."profile_views";
CREATE POLICY "Allow insert profile view"
  ON "public"."profile_views"
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Optional: allow users to read their own view history
DROP POLICY IF EXISTS "Allow read own profile views" ON "public"."profile_views";
CREATE POLICY "Allow read own profile views"
  ON "public"."profile_views"
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Ensure users table allows SELECT of new columns (existing policies should cover)
-- No change needed if you already have SELECT * for anon/authenticated on users.
