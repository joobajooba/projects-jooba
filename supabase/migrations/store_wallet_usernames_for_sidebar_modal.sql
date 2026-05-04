-- Stores one username per wallet address for the Crypto Wallet modal.
-- Run in the Supabase SQL Editor if this migration has not already been applied.

create table if not exists public.user_data (
  wallet_address text primary key,
  username text,
  profile_picture_url text,
  first_logged_in_at timestamptz not null default now(),
  username_changed_at timestamptz
);

alter table public.user_data
  add column if not exists username text,
  add column if not exists profile_picture_url text,
  add column if not exists first_logged_in_at timestamptz not null default now(),
  add column if not exists username_changed_at timestamptz;

create unique index if not exists idx_user_data_username_lower
  on public.user_data (lower(username))
  where username is not null;

alter table public.user_data enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_data'
      and policyname = 'Allow read user_data'
  ) then
    create policy "Allow read user_data"
      on public.user_data for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_data'
      and policyname = 'Allow insert user_data'
  ) then
    create policy "Allow insert user_data"
      on public.user_data for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_data'
      and policyname = 'Allow update user_data'
  ) then
    create policy "Allow update user_data"
      on public.user_data for update
      using (true)
      with check (true);
  end if;
end $$;

grant select, insert, update on public.user_data to anon;
grant select, insert, update on public.user_data to authenticated;

-- App write query:
-- supabase.from('user_data').upsert(
--   { wallet_address: lower_wallet_address, username: chosen_username },
--   { onConflict: 'wallet_address' }
-- );
