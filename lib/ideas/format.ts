import type { Effort, IdeaStatus } from '@/lib/ideas/types';

const EFFORT_LABELS: Record<Effort, string> = {
  weekend: 'Weekend',
  '1_week': '1 week',
  '1_month': '1 month',
  too_big: 'Too big',
};

const STATUS_LABELS: Record<IdeaStatus, string> = {
  new: 'New',
  interesting: 'Interesting',
  building: 'Building',
  skipped: 'Skipped',
};

export function effortLabel(effort: Effort): string {
  return EFFORT_LABELS[effort];
}

export function statusLabel(status: IdeaStatus): string {
  return STATUS_LABELS[status];
}

export type UrgencyTone = 'high' | 'medium' | 'low';

/** Bucket an urgency score for color coding. */
export function urgencyTone(score: number): UrgencyTone {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
