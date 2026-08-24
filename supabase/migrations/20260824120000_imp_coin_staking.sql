-- ImpCoin staking locks, token occupancy, and balances.
-- Applied remotely via Supabase; kept here for repo history.

create table if not exists public.imp_coin_balances (
  wallet_address text primary key check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  balance integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.imp_stake_challenges (
  wallet_address text primary key check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  nonce uuid not null,
  expires_at timestamptz not null
);

create table if not exists public.imp_stakes (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  canvas_id text not null check (canvas_id = any (array['pair','cross','nine'])),
  duration_id text not null,
  duration_days integer not null check (duration_days > 0),
  imp_contract text not null,
  imp_token_id text not null,
  imp_body text not null default '',
  imp_tier text not null default 'Tier 1',
  imp_image text not null default '',
  keeps jsonb not null default '[]'::jsonb,
  aligned_count integer not null default 0 check (aligned_count >= 0),
  keep_count integer not null default 0 check (keep_count >= 0),
  estimated_payout integer not null default 0 check (estimated_payout >= 0),
  modifiers jsonb not null default '{}'::jsonb,
  canvas_image text,
  stake_signature text not null,
  status text not null default 'active' check (status = any (array['active','claimed','forfeited'])),
  started_at timestamptz not null default now(),
  unlocks_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists imp_stakes_wallet_status_idx
  on public.imp_stakes (wallet_address, status, started_at desc);

create table if not exists public.imp_staked_tokens (
  contract text not null,
  token_id text not null,
  stake_id uuid not null references public.imp_stakes(id) on delete cascade,
  kind text not null check (kind = any (array['imp','keep'])),
  primary key (contract, token_id)
);

alter table public.imp_coin_balances enable row level security;
alter table public.imp_stake_challenges enable row level security;
alter table public.imp_stakes enable row level security;
alter table public.imp_staked_tokens enable row level security;

revoke all on public.imp_coin_balances from anon, authenticated;
revoke all on public.imp_stake_challenges from anon, authenticated;
revoke all on public.imp_stakes from anon, authenticated;
revoke all on public.imp_staked_tokens from anon, authenticated;
