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

## Design System (permanent — these rules win over framework defaults)

Kikoeru Lab is a quiet **reading** surface, not a monitoring dashboard. Refs: Ichiko Aoba / Haruka Nakamura — never Vercel/Linear/shadcn-default. If it looks like a generic SaaS template, it is wrong. 聞こえる = "to be heard": the app listens to complaints people let slip online.

### Tokens (foundation in `app/globals.css` + `app/layout.tsx`)
- **Palette** = CSS vars only, never default Tailwind color classes (`bg-gray-*`, `text-slate-*`, `emerald/amber/zinc`, …). Light `--bg:#e5e3df --surface:#eeece8 --text:#2a2a28 --muted:#8a8783 --line:#d6d3cd --accent:#4a5d52`; dark `--bg:#1c1d1b --surface:#232420 --text:#e0dcd4 --muted:#7d7a74 --line:#33352f --accent:#7d9384`. **Never `#fff`/`#000`** — backgrounds always warm, text never pure black. Dark mode stays warm (never blue-grey).
- **Accent** used *sparingly only*: urgency dot, one active-nav underline, focus ring. Never on big buttons, badges, or headers. **No semantic colors** — status is shown by position/opacity, not red/yellow/green.
- **`--low`** = `#a8674f` (light) / `#c08a72` (dark) — the **ONE** exception to accent-sparing. Used *solely* for score-breakdown components below 30 (bar + number). No other color exists anywhere in the app.
- **Fonts**: `Newsreader` (serif, `--font-newsreader`) + `Inter Tight` (sans, `--font-inter-tight`) via `next/font`. Only weights **400 and 500** (never 600/700). **All UI text lowercase** (no Title Case / ALL CAPS). Min size 11px. **Pain point = serif; metadata/labels/nav = sans** (11px, `letter-spacing:0.09em`). Numbers use `tabular-nums`.
- **Dark mode**: `data-theme` attribute on `<html>`, set pre-paint from `localStorage['kikoeru-theme']` else `prefers-color-scheme`. Toggle is 11px lowercase text `light`/`dark` in the **header** (right, inline with the date; `components/theme-toggle.tsx`) — never a sun/moon icon.

### Layout — FORBIDDEN (breaking one collapses the aesthetic)
Cards bordered on all sides · any `box-shadow` (except focus ring) · `border-radius` > 2px on content · gradients · emoji in UI · colored progress bars · badges with colored backgrounds · icons beside list items · blinking skeleton loaders · flashy hover animations · sidebar.

### Landing-page-only exceptions (`app/(marketing)/*` — NEVER the dashboard)
The marketing landing page, and only there, may: (1) show the ripple motif **twice** (once in the hero, once as a quiet divider before the footer); (2) use **large serif section numbers** (48px, `opacity: 0.12`, `--text`, hidden < 768px) beside section headings; (3) use **one large serif italic blockquote** (28px, `opacity: 0.85`, 2px `--accent` left border). Everything else in this design system still applies to the landing page (still no icons/illustrations/photos, no shadows, no off-palette color, no full-bg buttons). These three exceptions must not appear anywhere in the dashboard.

### Layout — REQUIRED
Item separator = 1px `--line` + 38px vertical gap · max content width 720px, centered · page padding ≥ 40px · ≥ 60px between header and first content · whitespace is a design element — do not fill it.

### Components
- **Header**: wordmark `kikoeru lab` (lowercase serif, "lab" muted) left; one metadata line right (date + "N heard this week"). No buttons/avatar/search.
- **Filter bar**: two 11px lowercase rows, each led by a muted label (`status`, `effort`), items 26px apart; active = `border-bottom:1px solid var(--text)` + `padding-bottom:5px`. Not pills/buttons/dropdowns. A client search (one-line `border-b`, no box/icon, placeholder `search…`) filters by pain point + target user. `let go` is hidden by default (reachable via its filter). Dashboard keyboard nav: `j`/`k` move, `1`–`4` set status, `/` search, `esc` blur; selected row = 2px left accent rule (no bg). Status changes raise a 2s bottom-right toast (`moved to …`, `--surface`/`--line`, radius 2px, no icon/color).
- **List item**: `[5px dot] [serif 19px pain point]` then `[11px muted metadata]`. Dot = 5px `--accent`, `opacity = urgency_score/100` clamped ≥ 0.15. **Score never shown as a number in the list.** Metadata `target_user · effort · source` joined by `&nbsp;·&nbsp;`. Hover = `opacity:0.7` on the row only.
- **Detail** (only place numbers appear): pain point → target user → existing workaround → solution pitch → mvp scope → suggested stack → portfolio value → score breakdown → source. Labels sans 11px muted; content serif. Score breakdown = plain `label — number` list, not a chart.
- **Button**: transparent bg, `1px solid var(--line)`, 11px lowercase `letter-spacing:0.09em`, `border-radius:2px`; hover → border `--muted`. No filled bg, no accent.
- **Empty** = one centered serif muted line (`nothing heard yet`), big vertical padding, no illustration/button/icon. **Loading** = one 11px muted line `listening…` (no spinner/skeleton).
- **Wordmark**: typographic only, no icon logo. **聞こえる appears exactly once** in the whole app (footer, 13px muted) — never in headers/loading/sidebar.
- **shadcn/ui** = component *logic* only (dropdown/dialog); discard all its default styling. Do not use its Card/Badge/Button as-is.

### UI language (all lowercase — copy is part of the feel)
status: `new`→`heard`, `interesting`→`worth building`, `building`→`building`, `skipped`→`let go`. Counts: `14 heard this week`. Last ingest: `last listened 06:00 utc`. Empty: `nothing heard yet`. Loading: `listening…`. Error: `couldn't listen just now`. Tagline (README + `<meta description>` only, never in UI): *listening to what the internet complains about*.

### Backend constraints that protect the design (enforce in Zod + AI prompt)
`pain_point` ≤ 160 chars · `target_user` ≤ 40 · `solution_pitch` ≤ 200 · `mvp_scope` ≤ 200 · `suggested_stack` ≤ 4 items. Over-limit AI items are **rejected + logged**, never truncated in the UI. (Not yet wired into `lib/ai/schema.ts`/`prompt.ts` — pending.)
