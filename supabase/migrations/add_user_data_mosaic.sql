-- Add saved mosaic columns to user_data (size 2 or 4, array of image URLs).
-- Run in Supabase SQL Editor if you already have user_data.

alter table public.user_data
  add column if not exists mosaic_size smallint;

alter table public.user_data
  add column if not exists mosaic_urls jsonb default '[]'::jsonb;

comment on column public.user_data.mosaic_size is 'Saved mosaic grid size: 2 for 2x2, 4 for 4x4';
comment on column public.user_data.mosaic_urls is 'Saved mosaic image URLs in order (top-left to bottom-right)';
