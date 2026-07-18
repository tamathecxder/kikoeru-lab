import { describe, expect, it, vi } from 'vitest';

import { analyzePosts, type AnalyzablePost } from '@/lib/ai/analyze';

const NOW = Date.parse('2026-07-18T00:00:00.000Z');

const mkPost = (n: number, body: string | null = `body ${n}`): AnalyzablePost => ({
  id: `id${n}`,
  title: `title ${n}`,
  body,
  url: `https://example.com/${n}`,
  score: 10,
  num_comments: 2,
  posted_at: '2026-07-10T00:00:00.000Z',
});

const aiItem = (index: number) => ({
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
});

describe('analyzePosts', () => {
  it('batches posts 5 at a time (7 posts -> 2 generate calls)', async () => {
    const posts = Array.from({ length: 7 }, (_, i) => mkPost(i));
    const generate = vi.fn().mockResolvedValue(JSON.stringify([aiItem(0)]));

    const { drafts, errors, analyzedIds } = await analyzePosts(posts, { generate, now: NOW });

    expect(generate).toHaveBeenCalledTimes(2);
    expect(errors).toHaveLength(0);
    // one draft per batch (each references its own index 0)
    expect(drafts.map((d) => d.raw_post_id)).toEqual(['id0', 'id5']);
    expect(drafts[0].urgency_score).toBeGreaterThan(0);
    // both batches completed -> every post is analyzed
    expect(analyzedIds).toHaveLength(7);
  });

  it('drops an out-of-range post_index and records an error', async () => {
    const posts = [mkPost(0), mkPost(1)];
    const generate = vi.fn().mockResolvedValue(JSON.stringify([aiItem(0), aiItem(9)]));

    const { drafts, errors } = await analyzePosts(posts, { generate, now: NOW });

    expect(drafts).toHaveLength(1);
    expect(drafts[0].raw_post_id).toBe('id0');
    expect(errors.some((e) => e.message.includes('out-of-range post_index 9'))).toBe(true);
  });

  it('clamps body to 2000 chars in the prompt sent to the model', async () => {
    const posts = [mkPost(0, 'A'.repeat(2500))];
    const generate = vi.fn().mockResolvedValue('[]');

    await analyzePosts(posts, { generate, now: NOW });

    const prompt = generate.mock.calls[0][0] as string;
    expect(prompt).toContain('A'.repeat(2000));
    expect(prompt).not.toContain('A'.repeat(2001));
  });

  it('skips a failed batch but keeps drafts from good batches, no throw', async () => {
    const posts = Array.from({ length: 6 }, (_, i) => mkPost(i)); // 2 batches
    const generate = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify([aiItem(0)])) // batch 1 ok
      .mockRejectedValueOnce(new Error('503 model overloaded')); // batch 2 fails

    const { drafts, errors, analyzedIds } = await analyzePosts(posts, { generate, now: NOW });

    expect(drafts).toHaveLength(1);
    expect(drafts[0].raw_post_id).toBe('id0');
    expect(errors.some((e) => e.message.includes('503'))).toBe(true);
    // batch 1 (id0..id4) analyzed; the failed batch 2 (id5) is left unprocessed
    expect(analyzedIds).toEqual(['id0', 'id1', 'id2', 'id3', 'id4']);
    expect(analyzedIds).not.toContain('id5');
  });

  it('records unparseable batch output as an error and continues', async () => {
    const posts = [mkPost(0)];
    const generate = vi.fn().mockResolvedValue('garbage {not json');

    const { drafts, errors, analyzedIds } = await analyzePosts(posts, { generate, now: NOW });

    expect(drafts).toHaveLength(0);
    expect(errors.some((e) => e.context === 'batch')).toBe(true);
    // unparseable batch is not analyzed -> post left for retry
    expect(analyzedIds).toHaveLength(0);
  });
});
