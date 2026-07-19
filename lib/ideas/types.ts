import type { ScoreBreakdown } from '@/lib/ai/scoring';

export const IDEA_STATUSES = ['new', 'interesting', 'building', 'skipped'] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const EFFORTS = ['weekend', '1_week', '1_month', 'too_big'] as const;
export type Effort = (typeof EFFORTS)[number];

/** Source info joined from raw_posts for linking back to the original post. */
export interface IdeaSource {
  source: string;
  url: string;
  title: string;
}

export interface Idea {
  id: string;
  raw_post_id: string;
  pain_point: string;
  target_user: string;
  existing_workaround: string | null;
  solution_pitch: string;
  mvp_scope: string;
  effort: Effort;
  suggested_stack: string[];
  portfolio_value: string;
  urgency_score: number;
  score_breakdown: ScoreBreakdown | null;
  status: IdeaStatus;
  notes: string | null;
  created_at: string;
  raw_posts: IdeaSource | null;
}

export interface IdeaFilters {
  status?: IdeaStatus;
  effort?: Effort;
}
