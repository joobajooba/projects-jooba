-- Allow adventure $DERP drips of 20-40 while keeping the historical 5-10 rows valid.
alter table public.derp_drips drop constraint if exists derp_drips_amount_check;

alter table public.derp_drips
  add constraint derp_drips_amount_check check (amount >= 5 and amount <= 40);
