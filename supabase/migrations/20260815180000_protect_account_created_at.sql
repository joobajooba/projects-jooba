-- Keep the original account-created timestamp and index it for community sorting.
-- Applied remotely via Supabase; kept here for repo history.

comment on column public.community_profiles.created_at is
  'Timestamp when this community account was first created. Never overwritten after insert.';
comment on column public.adventurer_accounts.created_at is
  'Timestamp when this adventurer account was first created. Never overwritten after insert.';

create or replace function public.keep_original_created_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := old.created_at;
  return new;
end;
$$;

revoke all on function public.keep_original_created_at() from public, anon, authenticated;

drop trigger if exists community_profiles_keep_created_at on public.community_profiles;
create trigger community_profiles_keep_created_at
before update on public.community_profiles
for each row
execute function public.keep_original_created_at();

drop trigger if exists adventurer_accounts_keep_created_at on public.adventurer_accounts;
create trigger adventurer_accounts_keep_created_at
before update on public.adventurer_accounts
for each row
execute function public.keep_original_created_at();

create index if not exists community_profiles_created_at_idx
  on public.community_profiles (created_at);
create index if not exists community_profiles_total_implingz_idx
  on public.community_profiles (total_implingz desc);
create index if not exists adventurer_accounts_level_idx
  on public.adventurer_accounts (level desc, xp desc);
