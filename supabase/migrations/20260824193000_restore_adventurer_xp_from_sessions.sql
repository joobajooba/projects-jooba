-- Restore earned adventure XP that is still on session rows after the 22 Aug
-- Impz-floor reset. Never lower current XP. Re-apply 10+/20+ Impz floors.

with session_xp as (
  select lower(wallet_address) as wallet_address,
         coalesce(sum(xp_awarded), 0)::integer as session_xp
  from public.adventure_sessions
  group by 1
),
floors as (
  select a.wallet_address,
    case
      when coalesce(p.total_implingz, 0) >= 20 then 900
      when coalesce(p.total_implingz, 0) >= 10 then 300
      else coalesce(s.floor_xp, 0)
    end as floor_xp
  from public.adventurer_accounts a
  left join public.community_profiles p on p.wallet_address = a.wallet_address
  left join public.impz_holder_xp_snapshot s on s.wallet_address = a.wallet_address
),
recovered as (
  select a.wallet_address,
         greatest(a.xp, coalesce(sx.session_xp, 0), f.floor_xp) as xp
  from public.adventurer_accounts a
  left join session_xp sx on sx.wallet_address = a.wallet_address
  join floors f on f.wallet_address = a.wallet_address
)
update public.adventurer_accounts as a
set
  xp = r.xp,
  level = case
    when r.xp >= 45000 then 10
    when r.xp >= 30000 then 9
    when r.xp >= 20000 then 8
    when r.xp >= 13000 then 7
    when r.xp >= 8000 then 6
    when r.xp >= 4500 then 5
    when r.xp >= 2200 then 4
    when r.xp >= 900 then 3
    when r.xp >= 300 then 2
    else 1
  end,
  updated_at = now()
from recovered r
where a.wallet_address = r.wallet_address
  and (a.xp is distinct from r.xp or a.level is distinct from (
    case
      when r.xp >= 45000 then 10
      when r.xp >= 30000 then 9
      when r.xp >= 20000 then 8
      when r.xp >= 13000 then 7
      when r.xp >= 8000 then 6
      when r.xp >= 4500 then 5
      when r.xp >= 2200 then 4
      when r.xp >= 900 then 3
      when r.xp >= 300 then 2
      else 1
    end
  ));
