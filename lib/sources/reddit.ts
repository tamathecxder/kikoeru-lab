import { hashUsername } from '@/lib/utils/hash';
import { logger } from '@/lib/utils/logger';
import type { FetchResult, NormalizedPost, SourceError } from '@/lib/sources/types';

/** Truthful User-Agent naming the app and a contact repo, as Reddit requires. */
const USER_AGENT = 'Kikoeru Lab/1.0 (personal research tool; github.com/tamathecxder/kikoeru-lab)';

const SUBREDDITS = [
  'webdev',
  'SaaS',
  'Entrepreneur',
  'sysadmin',
  'devops',
  'smallbusiness',
  'freelance',
] as const;

const REQUEST_DELAY_MS = 2000;

/** Values Reddit uses to mark content that is gone. */
const GONE = new Set(['', '[deleted]', '[removed]']);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Pure parse of a subreddit listing response into normalized posts. Never
 * throws. Fully-removed posts (title is `[deleted]`/`[removed]`) are skipped;
 * link posts and removed-selftext posts survive with `body: null`.
 */
export function parseRedditResponse(json: unknown): FetchResult {
  const posts: NormalizedPost[] = [];
  const errors: SourceError[] = [];

  const children =
    typeof json === 'object' &&
    json !== null &&
    typeof (json as { data?: unknown }).data === 'object' &&
    (json as { data: { children?: unknown } }).data !== null &&
    Array.isArray((json as { data: { children?: unknown } }).data.children)
      ? (json as { data: { children: unknown[] } }).data.children
      : null;

  if (!children) {
    errors.push({ context: 'response', message: 'Reddit response had no data.children array' });
    return { posts, errors };
  }

  for (const child of children) {
    try {
      const data = ((child as { data?: unknown } | null)?.data ?? {}) as Record<string, unknown>;
      const externalId = asString(data.id);
      const title = asString(data.title);

      if (!externalId || !title) {
        errors.push({ context: 'child', message: 'skipped child missing id or title' });
        continue;
      }
      // Whole post removed/deleted -> skip entirely.
      if (title === '[deleted]' || title === '[removed]') {
        continue;
      }

      const selftext = asString(data.selftext);
      const author = asString(data.author);
      const permalink = asString(data.permalink);

      posts.push({
        source: 'reddit',
        external_id: externalId,
        title,
        // Empty / removed / deleted selftext (and link posts) -> null body.
        body: selftext && !GONE.has(selftext) ? selftext : null,
        url: permalink ? `https://www.reddit.com${permalink}` : `https://www.reddit.com/comments/${externalId}`,
        author_hash: author && author !== '[deleted]' ? hashUsername(author) : null,
        score: asNumber(data.score),
        num_comments: asNumber(data.num_comments),
        posted_at: data.created_utc ? new Date(asNumber(data.created_utc) * 1000).toISOString() : null,
      });
    } catch (err) {
      errors.push({ context: 'child', message: err instanceof Error ? err.message : 'unknown parse error' });
    }
  }

  return { posts, errors };
}

/**
 * Fetch the week's top posts across all subreddits, 2s between requests. Never
 * throws. On HTTP 429 it stops early and returns what it has; other per-sub
 * failures (including Reddit's HTML block pages, which fail JSON parsing) are
 * recorded and the loop continues.
 */
export async function fetchReddit(): Promise<FetchResult> {
  const posts: NormalizedPost[] = [];
  const errors: SourceError[] = [];

  for (let i = 0; i < SUBREDDITS.length; i++) {
    const sub = SUBREDDITS[i];
    if (i > 0) await sleep(REQUEST_DELAY_MS);

    const url = `https://www.reddit.com/r/${sub}/top.json?t=week&limit=50`;
    try {
      const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' } });

      // 429 (rate limited) or 403 (datacenter IP block) apply to every
      // subreddit from this IP, so stop early instead of wasting ~2s per sub.
      if (res.status === 429 || res.status === 403) {
        errors.push({ context: sub, message: `HTTP ${res.status}; stopping Reddit fetch (IP blocked or rate limited)` });
        logger.warn('reddit blocked', { sub, status: res.status });
        break;
      }
      if (!res.ok) {
        errors.push({ context: sub, message: `HTTP ${res.status}` });
        continue;
      }

      let json: unknown;
      try {
        json = await res.json();
      } catch {
        // Reddit sometimes returns an HTML block page with a 200 status.
        errors.push({ context: sub, message: 'response was not valid JSON (likely a block page)' });
        continue;
      }

      const parsed = parseRedditResponse(json);
      errors.push(...parsed.errors.map((e) => ({ context: `${sub}:${e.context}`, message: e.message })));
      posts.push(...parsed.posts);
    } catch (err) {
      errors.push({ context: sub, message: err instanceof Error ? err.message : 'fetch failed' });
    }
  }

  return { posts, errors };
}
