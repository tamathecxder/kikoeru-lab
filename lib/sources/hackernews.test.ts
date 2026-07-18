import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchHackerNews, parseHnResponse } from '@/lib/sources/hackernews';
import realFixture from '@/lib/sources/__fixtures__/hackernews.json';
import brokenFixture from '@/lib/sources/__fixtures__/hackernews-broken.json';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseHnResponse (real fixture)', () => {
  const result = parseHnResponse(realFixture);

  it('parses every hit with no errors', () => {
    expect(result.errors).toHaveLength(0);
    expect(result.posts.length).toBe(realFixture.hits.length);
  });

  it('normalizes link-only stories (no story_text) to body null', () => {
    const linkOnly = realFixture.hits.filter((h) => h.story_text == null);
    expect(linkOnly.length).toBeGreaterThan(0);
    for (const h of linkOnly) {
      const post = result.posts.find((p) => p.external_id === h.objectID);
      expect(post?.body).toBeNull();
    }
  });

  it('falls back to the HN item page when a story has no url', () => {
    const noUrl = realFixture.hits.filter((h) => h.url == null);
    expect(noUrl.length).toBeGreaterThan(0);
    for (const h of noUrl) {
      const post = result.posts.find((p) => p.external_id === h.objectID);
      expect(post?.url).toBe(`https://news.ycombinator.com/item?id=${h.objectID}`);
    }
  });

  it('hashes authors (never stores plaintext) or leaves null', () => {
    for (const post of result.posts) {
      if (post.author_hash !== null) expect(post.author_hash).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});

describe('parseHnResponse (broken hits)', () => {
  it('skips hits missing title or objectID without throwing, keeps the good one', () => {
    const result = parseHnResponse(brokenFixture);
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].external_id).toBe('99000001');
    expect(result.errors.length).toBe(2); // null title + null objectID
  });

  it('returns an error (not a throw) when hits is not an array', () => {
    const result = parseHnResponse({ nope: true });
    expect(result.posts).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });
});

describe('fetchHackerNews (network stubbed — never real)', () => {
  it('stops early on HTTP 429 and records the error, no throw', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 429, ok: false });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchHackerNews();

    expect(result.posts).toHaveLength(0);
    expect(result.errors.some((e) => e.message.includes('429'))).toBe(true);
    // Broke out after the first request instead of hammering all keywords.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('records per-keyword failures on non-OK responses and continues', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 500, ok: false });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchHackerNews();

    expect(result.posts).toHaveLength(0);
    // One error per keyword, and it did not stop early.
    expect(result.errors.length).toBeGreaterThan(1);
    expect(fetchMock).toHaveBeenCalledTimes(result.errors.length);
  });
});
