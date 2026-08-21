-- One-time Impz holdings XP floor snapshot (Chapter 1 launch).
-- 10+ Impz => level 2 (300 XP), 20+ Impz => level 3 (900 XP).
-- Uses GREATEST so earned XP / higher levels are never reduced.

create table if not exists public.impz_holder_xp_snapshot (
  wallet_address text primary key check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  impz_count integer not null check (impz_count >= 0),
  floor_xp integer not null check (floor_xp >= 0),
  floor_level integer not null check (floor_level >= 1),
  snapped_at timestamptz not null default now()
);

alter table public.impz_holder_xp_snapshot enable row level security;

insert into public.impz_holder_xp_snapshot (wallet_address, impz_count, floor_xp, floor_level, snapped_at)
values
  ('0x8d42388603970610302d608e81b8c06224f0de7f', 50, 900, 3, timestamptz '2026-08-21 16:00:00+00'),
  ('0x50c57c918d52042bbd94b92c34e27dbd7c4b37ce', 40, 900, 3, timestamptz '2026-08-21 16:00:00+00'),
  ('0xd6de78c59f62288d304090e6d67a50e9f0b83704', 40, 900, 3, timestamptz '2026-08-21 16:00:00+00'),
  ('0x6621d1eaa7f8e63626fcd1f1feaa1dfb00cfa177', 32, 900, 3, timestamptz '2026-08-21 16:00:00+00'),
  ('0xfcf5c09d07341299d6778b60d1640161e1fffd99', 32, 900, 3, timestamptz '2026-08-21 16:00:00+00'),
  ('0x4b03fba411ba06a3c0434e6a646717f60834845f', 30, 900, 3, timestamptz '2026-08-21 16:00:00+00'),
  ('0x62ea7e3169bb9254c4d0626d01c27c8b8071dee7', 30, 900, 3, timestamptz '2026-08-21 16:00:00+00'),
  ('0xe1f381e1e7a32c75ac64fcfcb1c453628a1a5166', 28, 900, 3, timestamptz '2026-08-21 16:00:00+00'),
  ('0xe451bf6b27faace6e23684c1968e6acf9ad3584b', 27, 900, 3, timestamptz '2026-08-21 16:00:00+00'),
  ('0x9d1d8f4b7e18ca73825469b77ed1cae94a80ac2f', 25, 900, 3, timestamptz '2026-08-21 16:00:00+00'),
  ('0x091e5780009f074c6ede9e25409299c51385ae4d', 24, 900, 3, timestamptz '2026-08-21 16:00:00+00'),
  ('0xa636821ad243148f9058fc3e0f329f0e2b8695dd', 17, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0x1c010ece2c36e590dceed96a99275dd55c48a8a0', 16, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0x4f644215d4a7adc33d3acd1beb76a808d3e9ae8a', 16, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0xb05b214b21801c18b40be098782f32970d29cea1', 16, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0x23631b12402fe1b2404fccfab01557269b0df108', 14, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0x78189627458a6e636d1e8e1dbe619d663f9ea958', 14, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0xba4fef3a91acc2aeef085963916ce8b489e1251f', 14, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0x15bf4eb61f936736d767d692435be9ac328c911f', 13, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0x81e3bcd4c7bbc18d0064c88d540f9fc465b14e69', 13, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0x940e556c7f131c862f9d35b2b32f79308b70c192', 13, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0x53391bf6931e3a8d829029b2a7640f3213cf6c94', 12, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0x90b91db282ec0ff3ccedc61a40b9bea6662b59aa', 12, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0xf26f8b7387865f4ef3eb012fbb3972309be0912f', 12, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0x12ab47c5b38d400d926e1dd7eb976501087e6b3d', 11, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0xaf07c7f61932ec23c64e50c3289d4aa5ebf8b873', 11, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0x2a45802b36404d290f54388084c2d1bf1e465b70', 10, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0x2c93b00ff220c5b0fcaef85d6ff01d1f1fd990df', 10, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0xa8812beb31a938d389e8646fb21f18833c07e988', 10, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0xc3e0997cb6786326e861045ffe798c17722e62bd', 10, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0xd5cd731d196226cd4f80fa91dab28f5d53ab8264', 10, 300, 2, timestamptz '2026-08-21 16:00:00+00'),
  ('0xfe9d3889b5e36b3216a756e0c752220dbf24dac8', 10, 300, 2, timestamptz '2026-08-21 16:00:00+00')
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
