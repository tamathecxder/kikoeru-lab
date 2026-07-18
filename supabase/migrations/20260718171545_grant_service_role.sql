-- Grant the service role access to the app tables.
--
-- service_role BYPASSES RLS, but bypassing RLS does not grant table-level
-- privileges — the role still needs explicit GRANTs. Supabase's automatic
-- grants did not cover the tables created by the initial migration, so
-- service_role (the app's only access path, via lib/supabase/server.ts) was
-- denied with SQLSTATE 42501 "permission denied for table ...".
--
-- anon and authenticated are intentionally NOT granted: the deny-all RLS
-- policies already block them and the app never uses those roles.

grant usage on schema public to service_role;

grant select, insert, update, delete
  on public.raw_posts, public.ideas, public.ingest_runs
  to service_role;
