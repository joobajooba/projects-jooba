-- Supabase Storage bucket + policies for profile page uploaded images.
-- Run in Supabase SQL Editor.
--
-- This enables uploads from the client (anon key) and public reads.
-- NOTE: This is permissive for MVP. Tighten policies later if needed.

-- Create bucket (public)
insert into storage.buckets (id, name, public)
values ('profile_page_assets', 'profile_page_assets', true)
on conflict (id) do nothing;

-- Policies (ignore if they already exist)
do $$
begin
  create policy "Public read profile_page_assets"
    on storage.objects for select
    using (bucket_id = 'profile_page_assets');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Public insert profile_page_assets"
    on storage.objects for insert
    with check (bucket_id = 'profile_page_assets');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Public update profile_page_assets"
    on storage.objects for update
    using (bucket_id = 'profile_page_assets')
    with check (bucket_id = 'profile_page_assets');
exception
  when duplicate_object then null;
end $$;

