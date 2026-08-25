-- Allow staking an Imp with no Keeps.
alter table public.imp_stakes drop constraint if exists imp_stakes_canvas_id_check;
alter table public.imp_stakes
  add constraint imp_stakes_canvas_id_check
  check (canvas_id = any (array['solo'::text, 'pair'::text, 'cross'::text, 'nine'::text]));
