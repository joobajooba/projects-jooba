-- Table: badges
-- Stores badge image URL per wallet (e.g. NFT-holder badges).
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

create table if not exists public.badges (
  wallet_address text primary key,
  badge_image_url text not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_badges_updated_at
  on public.badges (updated_at desc);

alter table public.badges enable row level security;

create policy "Allow read badges"
  on public.badges for select
  using (true);

create policy "Allow insert badges"
  on public.badges for insert
  with check (true);

create policy "Allow update badges"
  on public.badges for update
  using (true)
  with check (true);

grant select, insert, update on public.badges to anon;
grant select, insert, update on public.badges to authenticated;
