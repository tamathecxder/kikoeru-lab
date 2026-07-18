-- Kikoeru Lab — initial schema
--
-- Tables: raw_posts (scraped input), ideas (AI output), ingest_runs (observability).
-- RLS: enabled with explicit deny-all policies on every table. The only intended
-- access path is lib/supabase/server.ts using the service_role key, which has the
-- BYPASSRLS attribute and is unaffected by these policies. anon/authenticated
-- clients get nothing.
--
-- gen_random_uuid() is provided by pgcrypto, which is preinstalled on Supabase.

-- ---------------------------------------------------------------------------
-- raw_posts — raw scraped posts, deduplicated per source.
-- ---------------------------------------------------------------------------
create table if not exists public.raw_posts (
  id            uuid        primary key default gen_random_uuid(),
  source        text        not null,
  external_id   text        not null,
  title         text        not null,
  body          text,
  url           text        not null,
  author_hash   text,                          -- SHA-256 of username, never plaintext
  score         integer     not null default 0,
  num_comments  integer     not null default 0,
  posted_at     timestamptz,
  fetched_at    timestamptz not null default now(),
  processed     boolean     not null default false,

  -- Idempotency key: the cron may run repeatedly; upserts on this constraint
  -- (onConflict: 'source,external_id', ignoreDuplicates: true) prevent dupes.
  constraint raw_posts_source_external_id_key unique (source, external_id),

  constraint raw_posts_source_check check (source in ('hackernews', 'reddit'))
);

create index if not exists raw_posts_processed_fetched_at_idx
  on public.raw_posts (processed, fetched_at);

-- ---------------------------------------------------------------------------
-- ideas — one project idea distilled from a raw_post by the AI layer.
-- ---------------------------------------------------------------------------
create table if not exists public.ideas (
  id                  uuid        primary key default gen_random_uuid(),
  raw_post_id         uuid        not null references public.raw_posts(id) on delete cascade,
  pain_point          text        not null,
  target_user         text        not null,
  existing_workaround text,
  solution_pitch      text        not null,
  mvp_scope           text        not null,
  effort              text        not null,
  suggested_stack     text[]      not null default '{}',
  portfolio_value     text        not null,
  urgency_score       integer     not null,       -- computed in code, 0..100
  score_breakdown     jsonb,                        -- per-component audit trail
  status              text        not null default 'new',
  created_at          timestamptz not null default now(),

  constraint ideas_effort_check
    check (effort in ('weekend', '1_week', '1_month', 'too_big')),
  constraint ideas_status_check
    check (status in ('new', 'interesting', 'building', 'skipped')),
  constraint ideas_urgency_score_range
    check (urgency_score between 0 and 100)
);

create index if not exists ideas_status_urgency_idx
  on public.ideas (status, urgency_score desc);

-- ---------------------------------------------------------------------------
-- ingest_runs — one row per ingest job, for observability.
-- ---------------------------------------------------------------------------
create table if not exists public.ingest_runs (
  id            uuid        primary key default gen_random_uuid(),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  source        text,
  posts_fetched integer     not null default 0,
  posts_new     integer     not null default 0,
  ideas_created integer     not null default 0,
  errors        jsonb
);

-- ---------------------------------------------------------------------------
-- Row Level Security: enable + explicit deny-all.
--
-- With RLS enabled and a restrictive USING (false) policy, every request from
-- the anon and authenticated roles is denied. service_role bypasses RLS, so
-- server-side access via the service-role key is unaffected.
-- ---------------------------------------------------------------------------
alter table public.raw_posts   enable row level security;
alter table public.ideas       enable row level security;
alter table public.ingest_runs enable row level security;

create policy "deny_all_raw_posts" on public.raw_posts
  for all to anon, authenticated using (false) with check (false);

create policy "deny_all_ideas" on public.ideas
  for all to anon, authenticated using (false) with check (false);

create policy "deny_all_ingest_runs" on public.ingest_runs
  for all to anon, authenticated using (false) with check (false);
