-- Run this in Supabase Dashboard → SQL Editor → New query.
-- Creates profiles table (with layout_json for profile builder) and profile_views.

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_wallet text unique not null,
  username text unique,
  bio text,
  avatar_url text,
  x_username text,
  layout_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_owner_wallet on public.profiles (owner_wallet);

create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_profile_views_profile_id on public.profile_views (profile_id);
create index if not exists idx_profile_views_viewed_at on public.profile_views (viewed_at desc);

alter table public.profiles enable row level security;
alter table public.profile_views enable row level security;

create policy "Allow read profiles"
  on public.profiles for select
  using (true);

create policy "Allow upsert profiles"
  on public.profiles for insert
  with check (true);

create policy "Allow update profiles"
  on public.profiles for update
  using (true)
  with check (true);

create policy "Allow read profile_views"
  on public.profile_views for select
  using (true);

create policy "Allow insert profile_views"
  on public.profile_views for insert
  with check (true);

grant select, insert, update on public.profiles to anon, authenticated;
grant select, insert on public.profile_views to anon, authenticated;
