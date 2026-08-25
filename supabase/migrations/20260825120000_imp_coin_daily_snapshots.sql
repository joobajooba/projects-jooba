-- Daily ImpCoin recovery snapshots: claimed balances plus pending on active stakes.
-- pg_cron runs private.snapshot_imp_coin() at 00:05 UTC.

create extension if not exists pg_cron with schema pg_catalog;

create schema if not exists private;

create table if not exists public.imp_coin_balance_snapshots (
  snapshot_date date not null,
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  balance integer not null check (balance >= 0),
  lifetime_earned integer not null check (lifetime_earned >= 0),
  pending_imp_coin integer not null default 0 check (pending_imp_coin >= 0),
  active_stakes integer not null default 0 check (active_stakes >= 0),
  snapped_at timestamptz not null default now(),
  primary key (snapshot_date, wallet_address)
);

create index if not exists imp_coin_balance_snapshots_wallet_date_idx
  on public.imp_coin_balance_snapshots (wallet_address, snapshot_date desc);

create table if not exists public.imp_stake_snapshots (
  snapshot_date date not null,
  stake_id uuid not null,
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  status text not null,
  daily_rate numeric(12, 4) not null,
  last_accrued_at timestamptz,
  pending_imp_coin integer not null default 0 check (pending_imp_coin >= 0),
  aligned_count integer not null default 0,
  has_robins_lair boolean not null default false,
  imp_token_id text not null,
  keeps jsonb not null default '[]'::jsonb,
  modifiers jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  snapped_at timestamptz not null default now(),
  primary key (snapshot_date, stake_id)
);

create index if not exists imp_stake_snapshots_wallet_date_idx
  on public.imp_stake_snapshots (wallet_address, snapshot_date desc);

alter table public.imp_coin_balance_snapshots enable row level security;
alter table public.imp_stake_snapshots enable row level security;

revoke all on public.imp_coin_balance_snapshots from anon, authenticated, public;
revoke all on public.imp_stake_snapshots from anon, authenticated, public;

create or replace function private.snapshot_imp_coin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  snap_date date := (timezone('utc', now()))::date;
begin
  insert into public.imp_coin_balance_snapshots (
    snapshot_date,
    wallet_address,
    balance,
    lifetime_earned,
    pending_imp_coin,
    active_stakes,
    snapped_at
  )
  select
    snap_date,
    wallets.wallet_address,
    coalesce(balances.balance, 0),
    coalesce(balances.lifetime_earned, 0),
    coalesce(pending.pending_imp_coin, 0),
    coalesce(pending.active_stakes, 0),
    now()
  from (
    select wallet_address from public.imp_coin_balances
    union
    select wallet_address from public.imp_stakes where status = 'active'
  ) as wallets
  left join public.imp_coin_balances as balances
    on balances.wallet_address = wallets.wallet_address
  left join (
    select
      wallet_address,
      count(*)::integer as active_stakes,
      coalesce(
        sum(
          greatest(
            0,
            floor(
              coalesce(daily_rate, 0)
              * extract(epoch from (now() - coalesce(last_accrued_at, started_at)))
              / 86400
            )::integer
          )
        ),
        0
      )::integer as pending_imp_coin
    from public.imp_stakes
    where status = 'active'
    group by wallet_address
  ) as pending
    on pending.wallet_address = wallets.wallet_address
  on conflict (snapshot_date, wallet_address) do update
  set
    balance = excluded.balance,
    lifetime_earned = excluded.lifetime_earned,
    pending_imp_coin = excluded.pending_imp_coin,
    active_stakes = excluded.active_stakes,
    snapped_at = excluded.snapped_at;

  insert into public.imp_stake_snapshots (
    snapshot_date,
    stake_id,
    wallet_address,
    status,
    daily_rate,
    last_accrued_at,
    pending_imp_coin,
    aligned_count,
    has_robins_lair,
    imp_token_id,
    keeps,
    modifiers,
    started_at,
    snapped_at
  )
  select
    snap_date,
    id,
    wallet_address,
    status,
    daily_rate,
    last_accrued_at,
    greatest(
      0,
      floor(
        coalesce(daily_rate, 0)
        * extract(epoch from (now() - coalesce(last_accrued_at, started_at)))
        / 86400
      )::integer
    ),
    aligned_count,
    has_robins_lair,
    imp_token_id,
    keeps,
    modifiers,
    started_at,
    now()
  from public.imp_stakes
  where status = 'active'
  on conflict (snapshot_date, stake_id) do update
  set
    wallet_address = excluded.wallet_address,
    status = excluded.status,
    daily_rate = excluded.daily_rate,
    last_accrued_at = excluded.last_accrued_at,
    pending_imp_coin = excluded.pending_imp_coin,
    aligned_count = excluded.aligned_count,
    has_robins_lair = excluded.has_robins_lair,
    imp_token_id = excluded.imp_token_id,
    keeps = excluded.keeps,
    modifiers = excluded.modifiers,
    started_at = excluded.started_at,
    snapped_at = excluded.snapped_at;

  delete from public.imp_coin_balance_snapshots
  where snapshot_date < snap_date - 180;

  delete from public.imp_stake_snapshots
  where snapshot_date < snap_date - 180;
end;
$$;

revoke all on function private.snapshot_imp_coin() from public, anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'imp-coin-daily-snapshot';

select cron.schedule(
  'imp-coin-daily-snapshot',
  '5 0 * * *',
  $job$select private.snapshot_imp_coin()$job$
);

select private.snapshot_imp_coin();
