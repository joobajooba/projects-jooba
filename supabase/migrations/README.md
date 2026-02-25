# Database migrations / SQL scripts

All Supabase SQL scripts (schema changes, RLS policies, storage, etc.) live here. Run them in the **Supabase Dashboard → SQL Editor** as needed.

- **Schema / columns:** e.g. `add-profile-description-column.sql`, `add-mosaic-column.sql`, `add-nft-slots.sql`
- **Tables:** e.g. `create-wordle-games-table.sql`, `create-connections-games-table.sql`, `add-profile-statistics.sql`
- **RLS / policies:** e.g. `fix-supabase-select-policy.sql`, `supabase-policy-fix.sql`, `complete-rls-fix.sql`
- **Storage:** e.g. `setup-storage-bucket.sql`, `storage-allow-anon-upload-profile-pictures.sql`
- **Security:** e.g. `SECURITY_FIXES.sql`, `SECURITY_FIXES_PRACTICAL.sql`

Run scripts in an order that respects dependencies (e.g. create tables before adding policies that reference them).
