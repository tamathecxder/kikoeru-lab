-- Personal notes on an idea. Free text, nullable.
--
-- No new grant needed: the table-level GRANT to service_role from the earlier
-- migration covers columns added later. RLS (deny-all for anon/authenticated,
-- service_role bypass) is unchanged.

alter table public.ideas add column if not exists notes text;
