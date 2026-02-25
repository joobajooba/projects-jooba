-- Ensure users table works with wallet sync and app (no schema structure change needed for connections_games/wordle_games)
-- Run this in Supabase SQL Editor if you get 409/400 on users or sync issues.

-- 1. Add UNIQUE on wallet_address if missing (required for upsert in useSyncWalletToSupabase)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'users' AND c.contype = 'u'
    AND EXISTS (
      SELECT 1 FROM pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) AND a.attname = 'wallet_address' AND NOT a.attisdropped
    )
  ) THEN
    ALTER TABLE "public"."users" ADD CONSTRAINT "users_wallet_address_key" UNIQUE ("wallet_address");
  END IF;
END $$;

-- 2. Ensure anon can INSERT (for first-time wallet sync)
DROP POLICY IF EXISTS "Allow users to insert wallet" ON "public"."users";
CREATE POLICY "Allow users to insert wallet"
ON "public"."users" FOR INSERT TO anon, authenticated
WITH CHECK (
  wallet_address IS NOT NULL
  AND LENGTH(wallet_address) = 42
  AND wallet_address ~ '^0x[a-fA-F0-9]{40}$'
);
