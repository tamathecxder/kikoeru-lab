# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Kikoeru Lab — a single-user tool (the owner is the only user) that mines real user complaints from Hacker News and Reddit, uses Gemini to extract candidate project ideas, scores their urgency **in code**, and ranks them in a dashboard. Not multi-tenant, but the architecture is deliberately SaaS-ready.

## Commands

```bash
npm run dev            # dev server (Turbopack)
npm run build          # production build (also runs lint + type-check)
npm run lint           # eslint (flat config, eslint.config.mjs)
npx tsc --noEmit       # type-check only
```

Tests use Vitest and arrive in Milestone 3 (source adapters). Run a single test with `npx vitest run path/to/file.test.ts` or filter with `-t "<name>"`.

### Database migrations

Schema changes go **only** through SQL files in `supabase/migrations/` (never the Supabase dashboard). Apply with the Supabase CLI:

```bash
supabase db push       # apply migrations to the linked project
```

To validate a migration locally without touching the real project, apply it to an ephemeral Postgres. Supabase-specific roles must be pre-created or the RLS policies fail to parse:

```bash
docker run -d --name pgtest -e POSTGRES_PASSWORD=pw -e POSTGRES_DB=kikoeru postgres:16-alpine
docker exec pgtest psql -U postgres -d kikoeru -c "create role anon; create role authenticated; create role service_role bypassrls;"
docker exec -i pgtest psql -U postgres -d kikoeru -v ON_ERROR_STOP=1 < supabase/migrations/<file>.sql
```

## Non-negotiable architecture rules

These are the reason the codebase is shaped the way it is. Do not relax them.

1. **Supabase is a database, not a backend.** All access is server-side only, through the single chokepoint `lib/supabase/server.ts` (`getSupabaseServerClient()`), using `SUPABASE_SERVICE_ROLE_KEY`. That module imports `server-only` so any client-side import fails the build. The browser never queries Supabase.
2. **RLS is enabled with deny-all policies on every table.** The service role bypasses RLS; that is the only intended access path. Any new table needs the same `enable row level security` + `deny_all_*` policy.
3. **`x-cron-secret` guards `/api/ingest`,** compared against `CRON_SECRET` with a **timing-safe** comparison (`crypto.timingSafeEqual`), never `===`.
4. **All AI output is Zod-validated before it touches the DB.** On parse failure: log via the logger, skip that item, continue the batch. A bad item must never crash the whole job.
5. **No `any`, no `console.*` in product code** — both are ESLint errors. The only sanctioned `console` wrapper is `lib/utils/logger.ts` (use `logger.info/warn/error`).
6. **No PII.** Usernames are SHA-256 hashed (`lib/utils/hash.ts`) before storage; store `author_hash`, never plaintext.
7. **Idempotent ingest.** `raw_posts` has `unique (source, external_id)`; upserts use `onConflict: 'source,external_id', ignoreDuplicates: true` so the cron can re-run safely.

## Ingest pipeline (the core data flow)

GitHub Actions cron (daily 06:00 UTC) → `POST /api/ingest` with `x-cron-secret` →
fetch HN + Reddit with `Promise.allSettled` (one source failing must not fail the other) →
upsert into `raw_posts` (dedup) → select `processed = false` (LIMIT 30) →
send to Gemini in **batches of 5** → Zod-validate → compute `urgency_score` in code →
insert `ideas`, mark posts `processed = true` → record the run in `ingest_runs`.

### Scoring is deterministic and lives in code, not the AI

The AI only extracts categoricals/booleans (`pain_intensity`, `willingness_to_pay`, `effort`, engagement fields). The weighted `urgency_score` is computed in code so it is explainable and auditable, with every component persisted to `ideas.score_breakdown`:

```
urgency_score = clamp(0,100,
  engagement*0.30 + pain_intensity*0.25 + willingness_to_pay*0.25
  + recency*0.10 + feasibility*0.10)
```

### Gemini call specifics

`gemini-flash-latest` via `@google/genai`, `temperature: 0.3` (the spec's `gemini-2.0-flash` has a free-tier quota of 0 on new keys, so the free-tier `flash-latest` alias is used instead; 429s are retried with backoff). Clamp each post `body` to 2000 chars before sending. On `JSON.parse` failure, strip a ```` ```json ```` fence and retry once; if it still fails, log and skip the batch. Drop any `post_index` outside the batch range — never trust the model's indexing.

## Working conventions

- **Milestone workflow.** Build proceeds one milestone at a time (scaffold → migrations → source adapters → AI layer → `/api/ingest` → dashboard → GitHub Actions/README). Stop after each and wait for the owner's review.
- **Do not commit unless asked.** The owner reviews each milestone's working tree.
- **Locked stack decisions.** Next.js 16 (App Router, the framework is fixed — do not swap it, and prefer the current stable version), `@google/genai` (the spec's `@google/generative-ai` is deprecated), shadcn/ui `base-nova` preset. React 19.
- **Import alias** `@/*` maps to the repo root. Note `lib/utils.ts` (shadcn's `cn`) and the `lib/utils/` directory coexist — `@/lib/utils` resolves to the file, `@/lib/utils/logger` to the directory module.
