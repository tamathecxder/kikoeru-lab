import { analyzePosts, type GenerateFn } from '@/lib/ai/analyze';
import { fetchHackerNews } from '@/lib/sources/hackernews';
import { fetchReddit } from '@/lib/sources/reddit';
import type { FetchResult, NormalizedPost, SourceError } from '@/lib/sources/types';
import { logger } from '@/lib/utils/logger';
import type { IngestStore, RunRecord } from '@/lib/ingest/store';

export type Fetcher = () => Promise<FetchResult>;

export interface RunSummary {
  started_at: string;
  finished_at: string;
  posts_fetched: number;
  posts_new: number;
  ideas_created: number;
  errors: SourceError[];
}

export interface RunOptions {
  store: IngestStore;
  /** Source fetchers; defaults to HN + Reddit. Injectable for tests. */
  fetchers?: Fetcher[];
  /** Model call; forwarded to analyzePosts. */
  generate?: GenerateFn;
  /** Reference time (ms); defaults to Date.now(). */
  now?: number;
  /** Max unprocessed posts to analyze per run. */
  limit?: number;
}

/**
 * One ingest run: fetch sources in parallel (isolated failures), upsert with
 * dedup, analyze the unprocessed backlog, insert ideas, mark processed, and
 * record the run. Designed never to throw on partial failure — problems are
 * collected into the summary's `errors`.
 */
export async function runIngest(opts: RunOptions): Promise<RunSummary> {
  const { store } = opts;
  const fetchers = opts.fetchers ?? [fetchHackerNews, fetchReddit];
  const now = opts.now ?? Date.now();
  const limit = opts.limit ?? 30;

  const startedAtMs = now;
  const errors: SourceError[] = [];

  // 1. Fetch every source in parallel; one source failing must not sink the others.
  const settled = await Promise.allSettled(fetchers.map((f) => f()));
  const scraped: NormalizedPost[] = [];
  let postsFetched = 0;
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      postsFetched += result.value.posts.length;
      scraped.push(...result.value.posts);
      errors.push(...result.value.errors);
    } else {
      const message = result.reason instanceof Error ? result.reason.message : 'source rejected';
      errors.push({ context: `source[${i}]`, message });
      logger.error('ingest source rejected', { index: i, message });
    }
  });

  // 2. Upsert with dedup (unique (source, external_id), ignoreDuplicates).
  let postsNew = 0;
  try {
    postsNew = await store.upsertRawPosts(scraped);
  } catch (err) {
    errors.push({ context: 'upsert', message: err instanceof Error ? err.message : 'upsert failed' });
  }

  // 3. Analyze the unprocessed backlog.
  let ideasCreated = 0;
  try {
    const unprocessed = await store.fetchUnprocessed(limit);

    if (unprocessed.length > 0) {
      const { drafts, errors: analyzeErrors, analyzedIds } = await analyzePosts(unprocessed, {
        generate: opts.generate,
        now,
      });
      errors.push(...analyzeErrors);

      // 4. Insert ideas, then mark processed ONLY the posts whose batch actually
      // completed. Posts in a failed batch (e.g. AI quota/error) stay unprocessed
      // so a later run retries them instead of silently burning them. If the
      // insert fails we also leave everything unprocessed.
      ideasCreated = await store.insertIdeas(drafts);
      await store.markProcessed(analyzedIds);
    }
  } catch (err) {
    errors.push({ context: 'analyze', message: err instanceof Error ? err.message : 'analyze failed' });
  }

  const summary: RunSummary = {
    started_at: new Date(startedAtMs).toISOString(),
    finished_at: new Date(Date.now()).toISOString(),
    posts_fetched: postsFetched,
    posts_new: postsNew,
    ideas_created: ideasCreated,
    errors,
  };

  // 5. Record the run for observability (best-effort — don't fail the response).
  const record: RunRecord = { ...summary, source: 'all' };
  try {
    await store.recordRun(record);
  } catch (err) {
    logger.error('ingest recordRun failed', { message: err instanceof Error ? err.message : 'unknown' });
  }

  return summary;
}
