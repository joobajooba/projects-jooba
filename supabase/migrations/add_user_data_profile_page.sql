-- Add profile page customization columns to user_data.
-- Run in Supabase SQL Editor if you already have user_data.

alter table public.user_data
  add column if not exists profile_bio text;

alter table public.user_data
  add column if not exists profile_picture_border text;

comment on column public.user_data.profile_bio is 'Custom bio for the user’s public profile page';
comment on column public.user_data.profile_picture_border is 'Profile picture border: red, blue, or green gradient';
