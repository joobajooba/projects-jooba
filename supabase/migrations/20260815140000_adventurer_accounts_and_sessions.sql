-- Adventurer XP, sessions, and $DERP drip records.
-- Applied remotely via Supabase; kept here for repo history.

create table if not exists public.adventurer_accounts (
  wallet_address text primary key check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  active_adventures integer not null default 0 check (active_adventures >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.adventure_challenges (
  wallet_address text primary key check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  nonce uuid not null,
  expires_at timestamptz not null
);

create table if not exists public.adventure_sessions (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  secret_hash text not null,
  party_token_ids jsonb not null default '[]'::jsonb,
  status text not null default 'running',
  hashes_checked bigint not null default 0,
  winning_nonce text,
  winning_hash text unique,
  dungeon_seed text,
  mint_deadline timestamptz,
  minted_token_id integer,
  xp_awarded integer not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.adventure_prompt_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.adventure_sessions(id) on delete cascade,
  encounter_index integer not null,
  option_key text not null,
  roll integer not null,
  succeeded boolean not null,
  xp_awarded integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.derp_drips (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  session_id uuid references public.adventure_sessions(id) on delete set null,
  amount integer not null,
  status text not null default 'pending',
  tx_hash text,
  created_at timestamptz not null default now()
);
