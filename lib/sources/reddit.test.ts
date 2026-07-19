import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchReddit, parseRedditResponse } from '@/lib/sources/reddit';
import realFixture from '@/lib/sources/__fixtures__/reddit.json';
import brokenFixture from '@/lib/sources/__fixtures__/reddit-broken.json';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('parseRedditResponse (normal fixture)', () => {
  const result = parseRedditResponse(realFixture);

  it('parses both posts with no errors', () => {
    expect(result.errors).toHaveLength(0);
    expect(result.posts).toHaveLength(2);
  });

  it('keeps selftext as body and links to the discussion permalink', () => {
    const post = result.posts.find((p) => p.external_id === 'abc123');
    expect(post?.body).toContain('spreadsheets');
    expect(post?.url).toBe('https://www.reddit.com/r/freelance/comments/abc123/struggling_to_keep_client_invoices_organized/');
    expect(post?.author_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('treats an empty-selftext link post as body null', () => {
    const post = result.posts.find((p) => p.external_id === 'def456');
    expect(post?.body).toBeNull();
  });
});

describe('parseRedditResponse (broken cases)', () => {
  const result = parseRedditResponse(brokenFixture);

  it('skips the fully deleted post but keeps the other three, no throw', () => {
    const ids = result.posts.map((p) => p.external_id);
    expect(ids).toEqual(['del001', 'rem002', 'link003']);
    expect(ids).not.toContain('gone004');
  });

  it('nulls author_hash for a [deleted] author but keeps the body', () => {
    const post = result.posts.find((p) => p.external_id === 'del001');
    expect(post?.author_hash).toBeNull();
    expect(post?.body).toContain('remains');
  });

  it('nulls body for [removed] selftext and for empty selftext', () => {
    expect(result.posts.find((p) => p.external_id === 'rem002')?.body).toBeNull();
    expect(result.posts.find((p) => p.external_id === 'link003')?.body).toBeNull();
  });
});

describe('fetchReddit (network stubbed — never real)', () => {
  it('sends the truthful User-Agent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 429, ok: false });
    vi.stubGlobal('fetch', fetchMock);

    await fetchReddit();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['user-agent']).toBe(
      'Kikoeru Lab/1.0 (personal research tool; github.com/tamathecxder/kikoeru-lab)',
    );
  });

  it('stops early on HTTP 429 and records the error, no throw', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 429, ok: false });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchReddit();

    expect(result.posts).toHaveLength(0);
    expect(result.errors.some((e) => e.message.includes('429'))).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no sleep before first request
  });

  it('stops early on HTTP 403 (datacenter block) instead of looping every subreddit', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 403, ok: false });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchReddit();

    expect(result.posts).toHaveLength(0);
    expect(result.errors.some((e) => e.message.includes('403'))).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('records a JSON-parse failure (block page) and continues to other subreddits', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.reject(new Error('Unexpected token < in JSON')),
    });
    vi.stubGlobal('fetch', fetchMock);

    const promise = fetchReddit();
    await vi.runAllTimersAsync(); // skip the 2s inter-request delays
    const result = await promise;

    expect(result.posts).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(1); // one per subreddit, did not stop early
    expect(result.errors.every((e) => e.message.toLowerCase().includes('json'))).toBe(true);
  });
});
