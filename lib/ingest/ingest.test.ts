import { describe, expect, it, vi } from 'vitest';

import { runIngest, type Fetcher } from '@/lib/ingest/ingest';
import type { IngestStore } from '@/lib/ingest/store';
import type { AnalyzablePost } from '@/lib/ai/analyze';
import type { NormalizedPost } from '@/lib/sources/types';

const NOW = Date.parse('2026-07-18T00:00:00.000Z');

const normalized = (id: string): NormalizedPost => ({
  source: 'hackernews',
  external_id: id,
  title: `title ${id}`,
  body: `body ${id}`,
  url: `https://example.com/${id}`,
  author_hash: null,
  score: 10,
  num_comments: 2,
  posted_at: '2026-07-10T00:00:00.000Z',
});

const analyzable = (id: string): AnalyzablePost => ({
  id,
  title: `title ${id}`,
  body: `body ${id}`,
  url: `https://example.com/${id}`,
  score: 10,
  num_comments: 2,
  posted_at: '2026-07-10T00:00:00.000Z',
});

const aiItem = (index: number) =>
  JSON.stringify([
    {
      post_index: index,
      pain_point: 'p',
      target_user: 'u',
      existing_workaround: null,
      solution_pitch: 's',
      mvp_scope: 'm',
      effort: 'weekend',
      suggested_stack: ['next'],
      portfolio_value: 'v',
      pain_intensity: 'high',
      willingness_to_pay: true,
    },
  ]);

function makeStore(overrides: Partial<Record<keyof IngestStore, unknown>> & { unprocessed?: AnalyzablePost[]; newCount?: number } = {}): IngestStore {
  return {
    upsertRawPosts: vi.fn(async () => overrides.newCount ?? 0),
    fetchUnprocessed: vi.fn(async () => overrides.unprocessed ?? []),
    insertIdeas: vi.fn(async (drafts: unknown[]) => drafts.length),
    markProcessed: vi.fn(async () => {}),
    recordRun: vi.fn(async () => {}),
    ...(overrides as object),
  } as IngestStore;
}

const okFetcher = (posts: NormalizedPost[]): Fetcher => async () => ({ posts, errors: [] });

describe('runIngest', () => {
  it('runs the full pipeline end to end', async () => {
    const store = makeStore({ unprocessed: [analyzable('a'), analyzable('b')], newCount: 2 });
    const generate = vi.fn().mockResolvedValue(aiItem(0));

    const summary = await runIngest({
      store,
      fetchers: [okFetcher([normalized('a')]), okFetcher([normalized('b')])],
      generate,
      now: NOW,
    });

    expect(summary.posts_fetched).toBe(2);
    expect(summary.posts_new).toBe(2);
    expect(summary.ideas_created).toBe(1);
    expect(summary.errors).toHaveLength(0);
    expect(store.insertIdeas).toHaveBeenCalledOnce();
    expect(store.markProcessed).toHaveBeenCalledWith(['a', 'b']);
    expect(store.recordRun).toHaveBeenCalledWith(expect.objectContaining({ source: 'all', ideas_created: 1 }));
  });

  it('isolates a failing source and still processes the others', async () => {
    const failing: Fetcher = async () => {
      throw new Error('reddit 403');
    };
    const store = makeStore({ unprocessed: [analyzable('a')], newCount: 1 });
    const generate = vi.fn().mockResolvedValue(aiItem(0));

    const summary = await runIngest({
      store,
      fetchers: [failing, okFetcher([normalized('a')])],
      generate,
      now: NOW,
    });

    expect(summary.posts_fetched).toBe(1); // only the good source counted
    expect(summary.errors.some((e) => e.message.includes('reddit 403'))).toBe(true);
    expect(store.insertIdeas).toHaveBeenCalledOnce();
  });

  it('skips analysis when there is no backlog', async () => {
    const store = makeStore({ unprocessed: [], newCount: 0 });

    const summary = await runIngest({ store, fetchers: [okFetcher([])], now: NOW });

    expect(summary.ideas_created).toBe(0);
    expect(store.insertIdeas).not.toHaveBeenCalled();
    expect(store.markProcessed).not.toHaveBeenCalled();
    expect(store.recordRun).toHaveBeenCalledOnce();
  });

  it('does not mark processed when the idea insert fails (retry next run)', async () => {
    const store = makeStore({ unprocessed: [analyzable('a')], newCount: 1 });
    store.insertIdeas = vi.fn(async () => {
      throw new Error('insert exploded');
    });
    const generate = vi.fn().mockResolvedValue(aiItem(0));

    const summary = await runIngest({
      store,
      fetchers: [okFetcher([normalized('a')])],
      generate,
      now: NOW,
    });

    expect(summary.errors.some((e) => e.message.includes('insert exploded'))).toBe(true);
    expect(store.markProcessed).not.toHaveBeenCalled();
    expect(store.recordRun).toHaveBeenCalledOnce(); // still recorded
  });

  it('records an upsert failure but continues the run', async () => {
    const store = makeStore({ unprocessed: [], newCount: 0 });
    store.upsertRawPosts = vi.fn(async () => {
      throw new Error('db down');
    });

    const summary = await runIngest({ store, fetchers: [okFetcher([normalized('a')])], now: NOW });

    expect(summary.errors.some((e) => e.message.includes('db down'))).toBe(true);
    expect(store.recordRun).toHaveBeenCalledOnce();
  });
});
