-- Keep adventurer_accounts.active_adventures aligned with live sessions.
update public.adventurer_accounts as a
set
  active_adventures = coalesce(s.running_count, 0),
  updated_at = now()
from (
  select wallet_address, count(*)::integer as running_count
  from public.adventure_sessions
  where status in ('running', 'found')
  group by wallet_address
) as s
where a.wallet_address = s.wallet_address
  and a.active_adventures is distinct from s.running_count;

update public.adventurer_accounts as a
set
  active_adventures = 0,
  updated_at = now()
where a.active_adventures > 0
  and not exists (
    select 1
    from public.adventure_sessions as s
    where s.wallet_address = a.wallet_address
      and s.status in ('running', 'found')
  );
