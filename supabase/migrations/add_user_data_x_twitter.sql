-- Add X (Twitter) account link columns for Connect to X.
-- Run in Supabase SQL Editor if you already have user_data.

alter table public.user_data
  add column if not exists x_twitter_id text;

alter table public.user_data
  add column if not exists x_username text;

comment on column public.user_data.x_twitter_id is 'X (Twitter) user id from OAuth users/me, for verified link';
comment on column public.user_data.x_username is 'X (Twitter) @handle from OAuth users/me';
