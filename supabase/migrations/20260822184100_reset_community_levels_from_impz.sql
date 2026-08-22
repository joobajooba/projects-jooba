-- Reset every adventurer to level 1, then apply live Impz holdings:
-- 10+ Impz => level 2 (300 XP), 20+ Impz => level 3 (900 XP).
-- Community profiles (current wallet counts) win over the launch snapshot.

update public.adventurer_accounts
set xp = 0, level = 1, updated_at = now();

insert into public.adventurer_accounts (wallet_address, xp, level, updated_at)
select
  p.wallet_address,
  case
    when coalesce(p.total_implingz, 0) >= 20 then 900
    when coalesce(p.total_implingz, 0) >= 10 then 300
    else 0
  end,
  case
    when coalesce(p.total_implingz, 0) >= 20 then 3
    when coalesce(p.total_implingz, 0) >= 10 then 2
    else 1
  end,
  now()
from public.community_profiles p
on conflict (wallet_address) do update
set
  xp = excluded.xp,
  level = excluded.level,
  updated_at = now();

update public.adventurer_accounts as a
set
  xp = s.floor_xp,
  level = s.floor_level,
  updated_at = now()
from public.impz_holder_xp_snapshot as s
where a.wallet_address = s.wallet_address
  and not exists (
    select 1
    from public.community_profiles as p
    where p.wallet_address = a.wallet_address
  );
