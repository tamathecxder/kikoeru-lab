import { describe, expect, it } from 'vitest';

import { computeUrgency } from '@/lib/ai/scoring';

const NOW = Date.parse('2026-07-18T00:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

describe('computeUrgency', () => {
  it('reaches 100 when every component maxes out', () => {
    const { urgency_score, breakdown } = computeUrgency({
      score: 1000,
      num_comments: 500,
      posted_at: daysAgo(1),
      pain_intensity: 'high',
      willingness_to_pay: true,
      effort: 'weekend',
      now: NOW,
    });
    expect(urgency_score).toBe(100);
    expect(breakdown.engagement).toBe(100);
    expect(breakdown.feasibility).toBe(100);
  });

  it('floors near zero for a weak, old, too-big idea', () => {
    const { urgency_score, breakdown } = computeUrgency({
      score: 0,
      num_comments: 0,
      posted_at: null,
      pain_intensity: 'low',
      willingness_to_pay: false,
      effort: 'too_big',
      now: NOW,
    });
    // engagement 0, pain 0, wtp 0, recency 10 (null), feasibility 10 -> 1 + 1 = 2
    expect(urgency_score).toBe(2);
    expect(breakdown.recency).toBe(10);
  });

  it('computes a known mid-range score', () => {
    const { urgency_score, breakdown } = computeUrgency({
      score: 30,
      num_comments: 0,
      posted_at: daysAgo(5),
      pain_intensity: 'medium',
      willingness_to_pay: false,
      effort: '1_week',
      now: NOW,
    });
    // engagement 50, pain 50, wtp 0, recency 100, feasibility 80
    // 15 + 12.5 + 0 + 10 + 8 = 45.5 -> 46
    expect(breakdown.engagement).toBe(50);
    expect(breakdown.raw_engagement).toBe(30);
    expect(urgency_score).toBe(46);
  });

  it('applies recency buckets at the boundaries', () => {
    const base = {
      score: 0,
      num_comments: 0,
      pain_intensity: 'low',
      willingness_to_pay: false,
      effort: 'too_big',
      now: NOW,
    } as const;
    expect(computeUrgency({ ...base, posted_at: daysAgo(29) }).breakdown.recency).toBe(100);
    expect(computeUrgency({ ...base, posted_at: daysAgo(30) }).breakdown.recency).toBe(60);
    expect(computeUrgency({ ...base, posted_at: daysAgo(89) }).breakdown.recency).toBe(60);
    expect(computeUrgency({ ...base, posted_at: daysAgo(90) }).breakdown.recency).toBe(30);
    expect(computeUrgency({ ...base, posted_at: daysAgo(179) }).breakdown.recency).toBe(30);
    expect(computeUrgency({ ...base, posted_at: daysAgo(180) }).breakdown.recency).toBe(10);
  });

  it('weights sum to 1.0', () => {
    const { breakdown } = computeUrgency({
      score: 0,
      num_comments: 0,
      posted_at: null,
      pain_intensity: 'low',
      willingness_to_pay: false,
      effort: 'too_big',
      now: NOW,
    });
    const sum = Object.values(breakdown.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });
});
