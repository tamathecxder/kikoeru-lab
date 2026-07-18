# Kikoeru Lab

A single-user tool that mines real user complaints from Hacker News and Reddit,
uses Google Gemini to extract candidate project ideas, scores their urgency
**deterministically in code**, and ranks them in a dashboard. Built for finding
portfolio-worthy projects with a realistic scope. Not multi-tenant, but the
architecture is deliberately SaaS-ready.

For the architecture rules and the ingest pipeline in detail, see
[`CLAUDE.md`](./CLAUDE.md).

## Stack

Next.js 16 (App Router, TypeScript strict) · Supabase Postgres (database only) ·
Tailwind + shadcn/ui · Google Gemini 2.0 Flash (`@google/genai`) · Zod ·
GitHub Actions (cron) · Vercel.

## Prerequisites

- Node 20+
- A [Supabase](https://supabase.com) project (Postgres)
- A [Google AI Studio](https://aistudio.google.com/app/apikey) Gemini API key (free tier)
- The Supabase CLI: `npm i -g supabase`

## Setup

```bash
git clone https://github.com/tamathecxder/kikoeru-lab.git
cd kikoeru-lab
npm install

# Environment: copy the template and fill in the four values.
cp .env.example .env.local
```

`.env.local`:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key (server-only, never expose) |
| `GEMINI_API_KEY` | Google AI Studio |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` |

Apply the database schema (migrations only — never click around the dashboard):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This creates `raw_posts`, `ideas`, `ingest_runs` with RLS enabled and deny-all
policies. Only the server-side service-role key can read/write.

## Local development

```bash
npm run dev      # dev server at http://localhost:3000
npm test         # unit tests (no network — fixtures + injected fakes)
npm run build    # production build (also lints + type-checks)
```

Trigger an ingest run locally:

```bash
curl -X POST -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/ingest
```

The response summarizes the run (`posts_fetched`, `posts_new`, `ideas_created`,
`errors`). Every run is also recorded in the `ingest_runs` table.

Optional: eyeball real source/AI data before wiring the cron:

```bash
npx tsx scripts/probe-sources.ts                 # real HN + Reddit
GEMINI_API_KEY=... npx tsx scripts/probe-ai.ts   # real Gemini on captured posts
```

## Deploy (Vercel)

1. Import the repo into Vercel.
2. Add the four environment variables from `.env.local` to the Vercel project
   (Production + Preview).
3. Deploy. The ingest endpoint is `https://<your-app>.vercel.app/api/ingest`.

> The ingest function runs fetch + batched Gemini calls, so it needs runtime
> headroom. `app/api/ingest/route.ts` sets `maxDuration = 60` (Hobby cap); raise
> it on Pro if you increase the batch size or backlog limit.

## Schedule (GitHub Actions)

The workflow [`.github/workflows/ingest.yml`](./.github/workflows/ingest.yml)
POSTs to the ingest endpoint daily at **06:00 UTC** and can also be run manually
(*Actions → ingest → Run workflow*).

Add two repository secrets (*Settings → Secrets and variables → Actions*):

| Secret | Value |
|---|---|
| `CRON_SECRET` | Same value as the deployed `CRON_SECRET` |
| `INGEST_URL` | `https://<your-app>.vercel.app/api/ingest` |

The job fails (red) on any non-200 response, so a broken cron is visible.

## Known limitations

- **Reddit from datacenter IPs.** `reddit.com/*/top.json` frequently returns
  `403`/`429` from Vercel and GitHub Actions IP ranges even with an honest
  User-Agent. The adapter handles this gracefully (records an error, never
  crashes the run), but Reddit yield may be low until a future version adds
  Reddit OAuth. Hacker News (Algolia) has no such restriction.
- **Function duration.** Large backlogs mean more Gemini batches; keep an eye on
  the Vercel function duration limit for your plan.
- **Single user.** No auth on the dashboard or the status PATCH endpoint — it is
  meant to run as a personal tool. Add auth before exposing it publicly.
