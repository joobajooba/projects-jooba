-- Soft staking: ImpCoin accrues while NFTs stay in the wallet. No lock timer.

alter table public.imp_stakes
  add column if not exists daily_rate numeric(12,4) not null default 5;

alter table public.imp_stakes
  add column if not exists last_accrued_at timestamptz not null default now();

alter table public.imp_stakes
  add column if not exists has_robins_lair boolean not null default false;

alter table public.imp_stakes drop constraint if exists imp_stakes_status_check;

alter table public.imp_stakes
  add constraint imp_stakes_status_check
  check (status = any (array['active'::text, 'claimed'::text, 'forfeited'::text, 'unstaked'::text, 'slashed'::text]));
