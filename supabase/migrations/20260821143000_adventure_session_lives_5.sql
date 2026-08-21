-- Raise adventure lives from 3 to 5.
alter table public.adventure_sessions
  alter column lives set default 5;

alter table public.adventure_sessions
  drop constraint if exists adventure_sessions_lives_check;

alter table public.adventure_sessions
  add constraint adventure_sessions_lives_check check (lives >= 0 and lives <= 5);
