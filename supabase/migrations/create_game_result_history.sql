-- Tables: wordle_game_results, type_racer_game_results
-- Stores every play event, while keeping aggregate stats in
-- public.wordle_stats and public.type_racer_stats.

create table if not exists public.wordle_game_results (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  played_day int not null,
  won boolean not null,
  guesses_count int not null check (guesses_count >= 1),
  played_at timestamptz not null default now()
);

create index if not exists idx_wordle_game_results_wallet_played_at
  on public.wordle_game_results (wallet_address, played_at desc);

create index if not exists idx_wordle_game_results_wallet_played_day
  on public.wordle_game_results (wallet_address, played_day desc);

create table if not exists public.type_racer_game_results (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  played_day int not null,
  wpm numeric not null check (wpm >= 0),
  played_at timestamptz not null default now()
);

create index if not exists idx_type_racer_game_results_wallet_played_at
  on public.type_racer_game_results (wallet_address, played_at desc);

create index if not exists idx_type_racer_game_results_wallet_played_day
  on public.type_racer_game_results (wallet_address, played_day desc);

alter table public.wordle_game_results enable row level security;
alter table public.type_racer_game_results enable row level security;

create policy "Allow read wordle_game_results"
  on public.wordle_game_results for select
  using (true);

create policy "Allow insert wordle_game_results"
  on public.wordle_game_results for insert
  with check (true);

create policy "Allow read type_racer_game_results"
  on public.type_racer_game_results for select
  using (true);

create policy "Allow insert type_racer_game_results"
  on public.type_racer_game_results for insert
  with check (true);

grant select, insert on public.wordle_game_results to anon;
grant select, insert on public.wordle_game_results to authenticated;
grant select, insert on public.type_racer_game_results to anon;
grant select, insert on public.type_racer_game_results to authenticated;

create or replace function public.recalculate_wordle_stats(p_wallet_address text)
returns void
language plpgsql
as $$
declare
  totals record;
  streak_row record;
  current_streak int := 0;
  max_streak int := 0;
  last_played_day int := null;
  prev_day int := null;
begin
  select
    count(*)::int as total_games,
    coalesce(sum(case when won then 1 else 0 end), 0)::int as total_wins,
    coalesce(sum(guesses_count), 0)::int as total_guesses,
    coalesce(sum(case when won and guesses_count = 1 then 1 else 0 end), 0)::int as wins_in_one,
    max(played_day) as latest_played_day
  into totals
  from public.wordle_game_results
  where wallet_address = p_wallet_address;

  if coalesce(totals.total_games, 0) = 0 then
    delete from public.wordle_stats where wallet_address = p_wallet_address;
    return;
  end if;

  for streak_row in
    select played_day, won
    from (
      select
        played_day,
        won,
        row_number() over (
          partition by played_day
          order by played_at desc, id desc
        ) as rn
      from public.wordle_game_results
      where wallet_address = p_wallet_address
    ) latest_per_day
    where rn = 1
    order by played_day
  loop
    if streak_row.won then
      if prev_day is not null and streak_row.played_day = prev_day + 1 and current_streak > 0 then
        current_streak := current_streak + 1;
      else
        current_streak := 1;
      end if;
    else
      current_streak := 0;
    end if;

    if current_streak > max_streak then
      max_streak := current_streak;
    end if;

    prev_day := streak_row.played_day;
    last_played_day := streak_row.played_day;
  end loop;

  insert into public.wordle_stats (
    wallet_address,
    current_streak,
    max_streak,
    total_wins,
    total_games,
    total_guesses,
    wins_in_one,
    avg_guesses,
    last_played_day,
    updated_at
  )
  values (
    p_wallet_address,
    current_streak,
    max_streak,
    totals.total_wins,
    totals.total_games,
    totals.total_guesses,
    totals.wins_in_one,
    case
      when totals.total_wins > 0 then round((totals.total_guesses::numeric / totals.total_wins::numeric), 2)
      else 0
    end,
    coalesce(last_played_day, totals.latest_played_day),
    now()
  )
  on conflict (wallet_address) do update
  set
    current_streak = excluded.current_streak,
    max_streak = excluded.max_streak,
    total_wins = excluded.total_wins,
    total_games = excluded.total_games,
    total_guesses = excluded.total_guesses,
    wins_in_one = excluded.wins_in_one,
    avg_guesses = excluded.avg_guesses,
    last_played_day = excluded.last_played_day,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.recalculate_type_racer_stats(p_wallet_address text)
returns void
language plpgsql
as $$
declare
  totals record;
  streak_row record;
  current_streak int := 0;
  max_streak int := 0;
  last_played_day int := null;
  prev_day int := null;
begin
  select
    count(*)::int as total_games,
    coalesce(sum(wpm), 0)::numeric as total_wpm_sum
  into totals
  from public.type_racer_game_results
  where wallet_address = p_wallet_address;

  if coalesce(totals.total_games, 0) = 0 then
    delete from public.type_racer_stats where wallet_address = p_wallet_address;
    return;
  end if;

  for streak_row in
    select distinct played_day
    from public.type_racer_game_results
    where wallet_address = p_wallet_address
    order by played_day
  loop
    if prev_day is not null and streak_row.played_day = prev_day + 1 then
      current_streak := current_streak + 1;
    else
      current_streak := 1;
    end if;

    if current_streak > max_streak then
      max_streak := current_streak;
    end if;

    prev_day := streak_row.played_day;
    last_played_day := streak_row.played_day;
  end loop;

  insert into public.type_racer_stats (
    wallet_address,
    current_streak,
    max_streak,
    last_played_day,
    last_wpm,
    total_games,
    total_wpm_sum,
    updated_at
  )
  values (
    p_wallet_address,
    current_streak,
    max_streak,
    last_played_day,
    (
      select wpm
      from public.type_racer_game_results
      where wallet_address = p_wallet_address
      order by played_at desc, id desc
      limit 1
    ),
    totals.total_games,
    totals.total_wpm_sum,
    now()
  )
  on conflict (wallet_address) do update
  set
    current_streak = excluded.current_streak,
    max_streak = excluded.max_streak,
    last_played_day = excluded.last_played_day,
    last_wpm = excluded.last_wpm,
    total_games = excluded.total_games,
    total_wpm_sum = excluded.total_wpm_sum,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.sync_wordle_stats_from_history()
returns trigger
language plpgsql
as $$
begin
  perform public.recalculate_wordle_stats(coalesce(new.wallet_address, old.wallet_address));
  return coalesce(new, old);
end;
$$;

create or replace function public.sync_type_racer_stats_from_history()
returns trigger
language plpgsql
as $$
begin
  perform public.recalculate_type_racer_stats(coalesce(new.wallet_address, old.wallet_address));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_wordle_stats_from_history on public.wordle_game_results;
create trigger trg_sync_wordle_stats_from_history
after insert or update or delete on public.wordle_game_results
for each row execute function public.sync_wordle_stats_from_history();

drop trigger if exists trg_sync_type_racer_stats_from_history on public.type_racer_game_results;
create trigger trg_sync_type_racer_stats_from_history
after insert or update or delete on public.type_racer_game_results
for each row execute function public.sync_type_racer_stats_from_history();
