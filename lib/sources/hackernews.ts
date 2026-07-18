import { hashUsername } from '@/lib/utils/hash';
import { logger } from '@/lib/utils/logger';
import type { FetchResult, NormalizedPost, SourceError } from '@/lib/sources/types';

/** Keywords that tend to surface real pain points on HN. */
const KEYWORDS = [
  'frustrating',
  'annoying',
  'wish there was',
  'why is there no',
  'hate that',
  'pain point',
  'workaround',
] as const;

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;
const ALGOLIA_BASE = 'https://hn.algolia.com/api/v1/search_by_date';

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Pure parse of an Algolia `search_by_date` response into normalized posts.
 * Never throws: a malformed hit is recorded as an error and skipped, the rest
 * survive.
 */
export function parseHnResponse(json: unknown): FetchResult {
  const posts: NormalizedPost[] = [];
  const errors: SourceError[] = [];

  const hits =
    typeof json === 'object' && json !== null && Array.isArray((json as { hits?: unknown }).hits)
      ? ((json as { hits: unknown[] }).hits)
      : null;

  if (!hits) {
    errors.push({ context: 'response', message: 'Algolia response had no hits array' });
    return { posts, errors };
  }

  for (const raw of hits) {
    try {
      const hit = (raw ?? {}) as Record<string, unknown>;
      const externalId = asString(hit.objectID);
      const title = asString(hit.title);

      // A story with no title or no id is unusable; skip it, keep the batch.
      if (!externalId || !title) {
        errors.push({ context: 'hit', message: 'skipped hit missing objectID or title' });
        continue;
      }

      const author = asString(hit.author);
      posts.push({
        source: 'hackernews',
        external_id: externalId,
        title,
        // Link-only stories have no story_text -> body is null.
        body: asString(hit.story_text),
        // Ask HN / text posts have no url -> fall back to the HN item page.
        url: asString(hit.url) ?? `https://news.ycombinator.com/item?id=${externalId}`,
        author_hash: author ? hashUsername(author) : null,
        score: asNumber(hit.points),
        num_comments: asNumber(hit.num_comments),
        posted_at: asString(hit.created_at),
      });
    } catch (err) {
      errors.push({ context: 'hit', message: err instanceof Error ? err.message : 'unknown parse error' });
    }
  }

  return { posts, errors };
}

/**
 * Fetch recent HN stories across all keywords. Never throws. On HTTP 429 it
 * stops early (backing off) and returns whatever it has; other per-keyword
 * failures are recorded and the loop continues. Results are deduped by id.
 */
export async function fetchHackerNews(): Promise<FetchResult> {
  const since = Math.floor(Date.now() / 1000) - THIRTY_DAYS_SECONDS;
  const byId = new Map<string, NormalizedPost>();
  const errors: SourceError[] = [];

  for (const keyword of KEYWORDS) {
    const params = new URLSearchParams({
      tags: 'story',
      numericFilters: `created_at_i>${since}`,
      query: keyword,
    });
    const url = `${ALGOLIA_BASE}?${params.toString()}`;

    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });

      if (res.status === 429) {
        errors.push({ context: keyword, message: 'HTTP 429 rate limited; stopping HN fetch early' });
        logger.warn('hackernews rate limited', { keyword });
        break;
      }
      if (!res.ok) {
        errors.push({ context: keyword, message: `HTTP ${res.status}` });
        continue;
      }

      const json: unknown = await res.json();
      const parsed = parseHnResponse(json);
      errors.push(...parsed.errors.map((e) => ({ context: `${keyword}:${e.context}`, message: e.message })));
      for (const post of parsed.posts) {
        byId.set(post.external_id, post); // dedup across keywords
      }
    } catch (err) {
      errors.push({ context: keyword, message: err instanceof Error ? err.message : 'fetch failed' });
    }
  }

  return { posts: [...byId.values()], errors };
}
