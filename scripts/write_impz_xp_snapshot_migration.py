import json
from pathlib import Path

data = json.loads(
    Path(r"C:\Users\lucas\Documents\projects-jooba\scripts\_impz_holders_snapshot.json").read_text(
        encoding="utf-8"
    )
)
qual = data["qualified"]
values = ",\n".join(
    "  ('{wallet_address}', {impz_count}, {floor_xp}, {floor_level}, timestamptz '2026-08-21 16:00:00+00')".format(
        **row
    )
    for row in qual
)

sql = f"""-- One-time Impz holdings XP floor snapshot (Chapter 1 launch).
-- 10+ Impz => level 2 (300 XP), 20+ Impz => level 3 (900 XP).
-- Uses GREATEST so earned XP / higher levels are never reduced.

create table if not exists public.impz_holder_xp_snapshot (
  wallet_address text primary key check (wallet_address ~ '^0x[0-9a-f]{{40}}$'),
  impz_count integer not null check (impz_count >= 0),
  floor_xp integer not null check (floor_xp >= 0),
  floor_level integer not null check (floor_level >= 1),
  snapped_at timestamptz not null default now()
);

alter table public.impz_holder_xp_snapshot enable row level security;

insert into public.impz_holder_xp_snapshot (wallet_address, impz_count, floor_xp, floor_level, snapped_at)
values
{values}
on conflict (wallet_address) do update
set
  impz_count = excluded.impz_count,
  floor_xp = excluded.floor_xp,
  floor_level = excluded.floor_level,
  snapped_at = excluded.snapped_at;

-- Create / raise accounts to the snapshot floor without lowering anyone.
insert into public.adventurer_accounts (wallet_address, xp, level, updated_at)
select s.wallet_address, s.floor_xp, s.floor_level, now()
from public.impz_holder_xp_snapshot s
on conflict (wallet_address) do update
set
  xp = greatest(public.adventurer_accounts.xp, excluded.xp),
  level = case
    when greatest(public.adventurer_accounts.xp, excluded.xp) >= 45000 then 10
    when greatest(public.adventurer_accounts.xp, excluded.xp) >= 30000 then 9
    when greatest(public.adventurer_accounts.xp, excluded.xp) >= 20000 then 8
    when greatest(public.adventurer_accounts.xp, excluded.xp) >= 13000 then 7
    when greatest(public.adventurer_accounts.xp, excluded.xp) >= 8000 then 6
    when greatest(public.adventurer_accounts.xp, excluded.xp) >= 4500 then 5
    when greatest(public.adventurer_accounts.xp, excluded.xp) >= 2200 then 4
    when greatest(public.adventurer_accounts.xp, excluded.xp) >= 900 then 3
    when greatest(public.adventurer_accounts.xp, excluded.xp) >= 300 then 2
    else 1
  end,
  updated_at = now()
where public.adventurer_accounts.xp < excluded.xp
   or public.adventurer_accounts.level < (
     case
       when greatest(public.adventurer_accounts.xp, excluded.xp) >= 45000 then 10
       when greatest(public.adventurer_accounts.xp, excluded.xp) >= 30000 then 9
       when greatest(public.adventurer_accounts.xp, excluded.xp) >= 20000 then 8
       when greatest(public.adventurer_accounts.xp, excluded.xp) >= 13000 then 7
       when greatest(public.adventurer_accounts.xp, excluded.xp) >= 8000 then 6
       when greatest(public.adventurer_accounts.xp, excluded.xp) >= 4500 then 5
       when greatest(public.adventurer_accounts.xp, excluded.xp) >= 2200 then 4
       when greatest(public.adventurer_accounts.xp, excluded.xp) >= 900 then 3
       when greatest(public.adventurer_accounts.xp, excluded.xp) >= 300 then 2
       else 1
     end
   );
"""

path = Path(
    r"C:\Users\lucas\Documents\projects-jooba\supabase\migrations\20260821180000_impz_holder_xp_snapshot.sql"
)
path.write_text(sql, encoding="utf-8")
print("wrote", path, "rows", len(qual))
