import type { Effort, IdeaStatus } from '@/lib/ideas/types';

// UI language — all lowercase. Copy is part of the feel (see CLAUDE.md).
const EFFORT_LABELS: Record<Effort, string> = {
  weekend: 'weekend',
  '1_week': '1 week',
  '1_month': '1 month',
  too_big: 'too big',
};

const STATUS_LABELS: Record<IdeaStatus, string> = {
  new: 'heard',
  interesting: 'worth building',
  building: 'building',
  skipped: 'let go',
};

export function effortLabel(effort: Effort): string {
  return EFFORT_LABELS[effort];
}

export function statusLabel(status: IdeaStatus): string {
  return STATUS_LABELS[status];
}

/** Dot opacity for the urgency signal — clamped to a 0.15 floor so it stays visible. */
export function urgencyOpacity(score: number): number {
  return Math.min(1, Math.max(0.15, score / 100));
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** e.g. "18 july" (lowercase). */
export function formatDayMonth(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** e.g. "06:00 utc" from an ISO timestamp, or null when there is none. */
export function formatUtcTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm} utc`;
}

/** Human source label: "hacker news" or "r/{sub}" parsed from a reddit permalink. */
export function sourceLabel(source: string, url: string): string {
  if (source === 'hackernews') return 'hacker news';
  if (source === 'reddit') {
    const match = url.match(/reddit\.com\/(r\/[^/]+)/i);
    return match ? match[1].toLowerCase() : 'reddit';
  }
  return source;
}
