-- Table: type_racer_stats
-- Stores per-wallet Type Racer statistics (speed, streak).
-- Run in the Supabase SQL Editor.

create table if not exists public.type_racer_stats (
  wallet_address text primary key,
  current_streak int not null default 0,
  max_streak int not null default 0,
  last_played_day int,
  last_wpm numeric,
  total_games int not null default 0,
  total_wpm_sum numeric not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_type_racer_stats_updated_at
  on public.type_racer_stats (updated_at desc);

alter table public.type_racer_stats enable row level security;

create policy "Allow read type_racer_stats"
  on public.type_racer_stats for select
  using (true);

create policy "Allow insert type_racer_stats"
  on public.type_racer_stats for insert
  with check (true);

create policy "Allow update type_racer_stats"
  on public.type_racer_stats for update
  using (true)
  with check (true);

grant select, insert, update on public.type_racer_stats to anon;
grant select, insert, update on public.type_racer_stats to authenticated;
