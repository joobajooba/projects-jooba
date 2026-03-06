-- Run this in Supabase Dashboard → SQL Editor → New query.
-- Creates profile_page table (with layout_json for profile builder) and profile_page_views.

create table if not exists public.profile_page (
  id uuid primary key default gen_random_uuid(),
  owner_wallet text unique not null,
  username text unique,
  bio text,
  avatar_url text,
  x_username text,
  layout_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profile_page_owner_wallet on public.profile_page (owner_wallet);

create table if not exists public.profile_page_views (
  id uuid primary key default gen_random_uuid(),
  profile_page_id uuid not null references public.profile_page(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_profile_page_views_profile_page_id on public.profile_page_views (profile_page_id);
create index if not exists idx_profile_page_views_viewed_at on public.profile_page_views (viewed_at desc);

alter table public.profile_page enable row level security;
alter table public.profile_page_views enable row level security;

create policy "Allow read profile_page"
  on public.profile_page for select
  using (true);

create policy "Allow upsert profile_page"
  on public.profile_page for insert
  with check (true);

create policy "Allow update profile_page"
  on public.profile_page for update
  using (true)
  with check (true);

create policy "Allow read profile_page_views"
  on public.profile_page_views for select
  using (true);

create policy "Allow insert profile_page_views"
  on public.profile_page_views for insert
  with check (true);

grant select, insert, update on public.profile_page to anon, authenticated;
grant select, insert on public.profile_page_views to anon, authenticated;
