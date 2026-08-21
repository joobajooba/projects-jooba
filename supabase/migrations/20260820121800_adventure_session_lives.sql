-- Track remaining D20 lives per adventure session.
alter table public.adventure_sessions
  add column if not exists lives integer not null default 3;

alter table public.adventure_sessions
  drop constraint if exists adventure_sessions_lives_check;

alter table public.adventure_sessions
  add constraint adventure_sessions_lives_check check (lives >= 0 and lives <= 3);
