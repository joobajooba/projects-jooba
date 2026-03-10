-- Table: wordle_stats
-- Stores per-wallet Wordle statistics.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

create table if not exists public.wordle_stats (
  wallet_address text primary key,
  current_streak int not null default 0,
  max_streak int not null default 0,
  total_wins int not null default 0,
  total_games int not null default 0,
  total_guesses int not null default 0,
  wins_in_one int not null default 0,
  avg_guesses numeric not null default 0,
  last_played_day int,
  updated_at timestamptz not null default now()
);

create index if not exists idx_wordle_stats_updated_at
  on public.wordle_stats (updated_at desc);

alter table public.wordle_stats enable row level security;

create policy "Allow read wordle_stats"
  on public.wordle_stats for select
  using (true);

create policy "Allow insert wordle_stats"
  on public.wordle_stats for insert
  with check (true);

create policy "Allow update wordle_stats"
  on public.wordle_stats for update
  using (true)
  with check (true);

grant select, insert, update on public.wordle_stats to anon;
grant select, insert, update on public.wordle_stats to authenticated;

