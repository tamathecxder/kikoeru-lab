/**
 * Manual, one-off probe against the REAL HN and Reddit APIs.
 *
 *   npx tsx scripts/probe-sources.ts
 *
 * It prints a few raw + normalized lines so a human can eyeball real data
 * before it ever reaches the AI, and it saves the raw responses as test
 * fixtures under lib/sources/__fixtures__/. It is NOT part of the app runtime
 * or CI, so it may write to stdout directly (no logger needed).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseHnResponse } from '@/lib/sources/hackernews';
import { parseRedditResponse } from '@/lib/sources/reddit';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'sources', '__fixtures__');
const USER_AGENT = 'Kikoeru Lab/1.0 (personal research tool; github.com/tamathecxder/kikoeru-lab)';

function out(line: string): void {
  process.stdout.write(line + '\n');
}

function section(title: string): void {
  out('\n' + '='.repeat(60));
  out(title);
  out('='.repeat(60));
}

async function probeHackerNews(): Promise<void> {
  section('HACKER NEWS (Algolia)  query="frustrating"');
  const since = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  const url = `https://hn.algolia.com/api/v1/search_by_date?tags=story&numericFilters=created_at_i>${since}&query=frustrating`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  out(`HTTP ${res.status}`);
  if (!res.ok) {
    out('non-OK response; skipping HN fixture capture');
    return;
  }
  const json: unknown = await res.json();
  mkdirSync(FIXTURES_DIR, { recursive: true });
  writeFileSync(join(FIXTURES_DIR, 'hackernews.json'), JSON.stringify(json, null, 2));
  out(`saved fixture: __fixtures__/hackernews.json`);

  const hits = (json as { hits?: unknown[] }).hits ?? [];
  out(`\n--- raw hits (first 5) ---`);
  for (const h of hits.slice(0, 5)) {
    const hit = h as Record<string, unknown>;
    out(`  [${String(hit.objectID)}] pts=${String(hit.points)} c=${String(hit.num_comments)} text=${hit.story_text ? 'yes' : 'null'}  ${String(hit.title).slice(0, 70)}`);
  }
  const parsed = parseHnResponse(json);
  out(`\n--- normalized (first 5 of ${parsed.posts.length}, errors=${parsed.errors.length}) ---`);
  for (const p of parsed.posts.slice(0, 5)) {
    out(`  ${p.external_id} score=${p.score} body=${p.body ? 'text' : 'null'} author_hash=${p.author_hash ? p.author_hash.slice(0, 8) + '…' : 'null'}  ${p.title.slice(0, 60)}`);
  }
}

async function probeReddit(): Promise<void> {
  section('REDDIT (public JSON)  r/webdev/top.json?t=week');
  const url = 'https://www.reddit.com/r/webdev/top.json?t=week&limit=50';
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' } });
  out(`HTTP ${res.status}   User-Agent: ${USER_AGENT}`);
  if (!res.ok) {
    out(`non-OK response (Reddit often blocks datacenter IPs / rate limits). Adapter handles this as a recorded error, not a crash.`);
    return;
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    out('response was not JSON (block page). Adapter handles this gracefully.');
    return;
  }
  mkdirSync(FIXTURES_DIR, { recursive: true });
  writeFileSync(join(FIXTURES_DIR, 'reddit.json'), JSON.stringify(json, null, 2));
  out('saved fixture: __fixtures__/reddit.json');

  const children = (json as { data?: { children?: unknown[] } }).data?.children ?? [];
  out(`\n--- raw children (first 5) ---`);
  for (const c of children.slice(0, 5)) {
    const d = (c as { data?: Record<string, unknown> }).data ?? {};
    out(`  [${String(d.id)}] score=${String(d.score)} self=${d.selftext ? 'yes' : 'empty'} author=${String(d.author)}  ${String(d.title).slice(0, 60)}`);
  }
  const parsed = parseRedditResponse(json);
  out(`\n--- normalized (first 5 of ${parsed.posts.length}, errors=${parsed.errors.length}) ---`);
  for (const p of parsed.posts.slice(0, 5)) {
    out(`  ${p.external_id} score=${p.score} body=${p.body ? 'text' : 'null'} author_hash=${p.author_hash ? p.author_hash.slice(0, 8) + '…' : 'null'}  ${p.title.slice(0, 55)}`);
  }
}

async function main(): Promise<void> {
  try {
    await probeHackerNews();
  } catch (err) {
    out(`HN probe failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  try {
    await probeReddit();
  } catch (err) {
    out(`Reddit probe failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

void main();
