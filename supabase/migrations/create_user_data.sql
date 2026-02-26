-- Table: user_data
-- Stores wallet address, profile username, profile picture URL, and first login time.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

create table if not exists public.user_data (
  wallet_address text primary key,
  username text,
  profile_picture_url text,
  first_logged_in_at timestamptz not null default now()
);

-- Optional: index for ordering by first login (e.g. "newest users")
create index if not exists idx_user_data_first_logged_in
  on public.user_data (first_logged_in_at desc);

-- RLS: enable row level security
alter table public.user_data enable row level security;

-- Policy: allow read for everyone (so the app can load profile by wallet)
create policy "Allow read user_data"
  on public.user_data for select
  using (true);

-- Policy: allow insert for anon (new wallet connect)
create policy "Allow insert user_data"
  on public.user_data for insert
  with check (true);

-- Policy: allow update for anon (profile updates; app only updates current user's row)
create policy "Allow update user_data"
  on public.user_data for update
  using (true)
  with check (true);

-- Grant usage to anon and authenticated
grant select, insert, update on public.user_data to anon;
grant select, insert, update on public.user_data to authenticated;
