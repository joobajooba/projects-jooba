-- Username uniqueness and change cooldown.
-- Run in Supabase SQL Editor if you already have user_data.

-- When the user last changed their username (null = never changed after first set; used for 3-day cooldown).
alter table public.user_data
  add column if not exists username_changed_at timestamptz;

comment on column public.user_data.username_changed_at is 'When username was last changed; used to enforce 3-day cooldown after first change';

-- Unique usernames (case-insensitive). Multiple NULLs allowed.
create unique index if not exists idx_user_data_username_lower
  on public.user_data (lower(username))
  where username is not null;
