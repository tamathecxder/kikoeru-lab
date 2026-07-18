/**
 * Optional, one-off probe of the REAL Gemini model.
 *
 *   GEMINI_API_KEY=... npx tsx scripts/probe-ai.ts
 *
 * Feeds a few captured HN fixture posts through the live model and prints the
 * resulting drafts + computed urgency, so a human can eyeball real AI output
 * before wiring the cron. Skips cleanly if no key is set. Not part of runtime/CI.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzePosts, type AnalyzablePost } from '@/lib/ai/analyze';
import { parseHnResponse } from '@/lib/sources/hackernews';

function out(line: string): void {
  process.stdout.write(line + '\n');
}

async function main(): Promise<void> {
  if (!process.env.GEMINI_API_KEY) {
    out('GEMINI_API_KEY not set — skipping real AI probe. (Set it to see live output.)');
    return;
  }

  const fixturePath = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'lib',
    'sources',
    '__fixtures__',
    'hackernews.json',
  );
  const json: unknown = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const normalized = parseHnResponse(json).posts.slice(0, 3);

  const posts: AnalyzablePost[] = normalized.map((p) => ({
    id: p.external_id,
    title: p.title,
    body: p.body,
    url: p.url,
    score: p.score,
    num_comments: p.num_comments,
    posted_at: p.posted_at,
  }));

  out(`Sending ${posts.length} real HN posts to gemini-2.0-flash...\n`);
  const { drafts, errors } = await analyzePosts(posts);

  out(`drafts=${drafts.length} errors=${errors.length}`);
  for (const d of drafts) {
    out('\n' + '-'.repeat(60));
    out(`urgency=${d.urgency_score}  effort=${d.effort}  raw_post_id=${d.raw_post_id}`);
    out(`pain_point:   ${d.pain_point}`);
    out(`target_user:  ${d.target_user}`);
    out(`solution:     ${d.solution_pitch}`);
    out(`stack:        ${d.suggested_stack.join(', ')}`);
    out(`breakdown:    ${JSON.stringify(d.score_breakdown.weighted)}`);
  }
  for (const e of errors) out(`error[${e.context}]: ${e.message}`);
}

void main();
