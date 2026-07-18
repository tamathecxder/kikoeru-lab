import type { AiIdea } from '@/lib/ai/schema';

/** Weights sum to 1.0. Engagement dominates, then pain and willingness-to-pay. */
export const WEIGHTS = {
  engagement: 0.3,
  pain_intensity: 0.25,
  willingness_to_pay: 0.25,
  recency: 0.1,
  feasibility: 0.1,
} as const;

/** Engagement raw value that maps to a ~100 normalized score (log scale). */
const ENGAGEMENT_CAP = 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ScoreInput {
  score: number;
  num_comments: number;
  posted_at: string | null;
  pain_intensity: AiIdea['pain_intensity'];
  willingness_to_pay: boolean;
  effort: AiIdea['effort'];
  /** Reference "now" in ms; defaults to Date.now() so the function stays testable. */
  now?: number;
}

export interface ScoreBreakdown {
  engagement: number;
  pain_intensity: number;
  willingness_to_pay: number;
  recency: number;
  feasibility: number;
  raw_engagement: number;
  weights: typeof WEIGHTS;
  weighted: {
    engagement: number;
    pain_intensity: number;
    willingness_to_pay: number;
    recency: number;
    feasibility: number;
  };
}

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

function engagementScore(score: number, numComments: number): { normalized: number; raw: number } {
  const raw = score + 2 * numComments;
  const normalized = clamp(0, 100, Math.round((100 * Math.log10(1 + raw)) / Math.log10(1 + ENGAGEMENT_CAP)));
  return { normalized, raw };
}

function painScore(pain: ScoreInput['pain_intensity']): number {
  return pain === 'high' ? 100 : pain === 'medium' ? 50 : 0;
}

function recencyScore(postedAt: string | null, now: number): number {
  if (!postedAt) return 10;
  const posted = Date.parse(postedAt);
  if (Number.isNaN(posted)) return 10;
  const days = (now - posted) / DAY_MS;
  if (days < 30) return 100;
  if (days < 90) return 60;
  if (days < 180) return 30;
  return 10;
}

function feasibilityScore(effort: ScoreInput['effort']): number {
  switch (effort) {
    case 'weekend':
      return 100;
    case '1_week':
      return 80;
    case '1_month':
      return 50;
    case 'too_big':
      return 10;
  }
}

/**
 * Deterministic urgency score (0–100) computed entirely in code — the AI only
 * supplies the categorical inputs. Every component and its weighted contribution
 * is returned in `breakdown` so the score can be audited in the UI.
 */
export function computeUrgency(input: ScoreInput): { urgency_score: number; breakdown: ScoreBreakdown } {
  const now = input.now ?? Date.now();

  const { normalized: engagement, raw: raw_engagement } = engagementScore(input.score, input.num_comments);
  const pain = painScore(input.pain_intensity);
  const wtp = input.willingness_to_pay ? 100 : 0;
  const recency = recencyScore(input.posted_at, now);
  const feasibility = feasibilityScore(input.effort);

  const weighted = {
    engagement: engagement * WEIGHTS.engagement,
    pain_intensity: pain * WEIGHTS.pain_intensity,
    willingness_to_pay: wtp * WEIGHTS.willingness_to_pay,
    recency: recency * WEIGHTS.recency,
    feasibility: feasibility * WEIGHTS.feasibility,
  };

  const urgency_score = clamp(
    0,
    100,
    Math.round(weighted.engagement + weighted.pain_intensity + weighted.willingness_to_pay + weighted.recency + weighted.feasibility),
  );

  return {
    urgency_score,
    breakdown: {
      engagement,
      pain_intensity: pain,
      willingness_to_pay: wtp,
      recency,
      feasibility,
      raw_engagement,
      weights: WEIGHTS,
      weighted,
    },
  };
}
