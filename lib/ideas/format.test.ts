import { describe, expect, it } from 'vitest';

import { effortLabel, formatDayMonth, formatUtcTime, sourceLabel, statusLabel, urgencyOpacity } from '@/lib/ideas/format';

describe('effortLabel', () => {
  it('renders lowercase effort copy', () => {
    expect(effortLabel('weekend')).toBe('weekend');
    expect(effortLabel('1_week')).toBe('1 week');
    expect(effortLabel('too_big')).toBe('too big');
  });
});

describe('statusLabel', () => {
  it('maps status to the UI language', () => {
    expect(statusLabel('new')).toBe('heard');
    expect(statusLabel('interesting')).toBe('worth building');
    expect(statusLabel('building')).toBe('building');
    expect(statusLabel('skipped')).toBe('let go');
  });
});

describe('urgencyOpacity', () => {
  it('scales linearly and floors at 0.15', () => {
    expect(urgencyOpacity(100)).toBe(1);
    expect(urgencyOpacity(50)).toBe(0.5);
    expect(urgencyOpacity(0)).toBe(0.15);
    expect(urgencyOpacity(10)).toBe(0.15); // below floor
  });
});

describe('formatDayMonth', () => {
  it('renders "day month" lowercase in UTC', () => {
    expect(formatDayMonth(new Date('2026-07-18T00:00:00Z'))).toBe('18 july');
    expect(formatDayMonth(new Date('2026-01-03T00:00:00Z'))).toBe('3 january');
  });
});

describe('formatUtcTime', () => {
  it('renders "hh:mm utc" or null', () => {
    expect(formatUtcTime('2026-07-18T06:00:00Z')).toBe('06:00 utc');
    expect(formatUtcTime('2026-07-18T23:09:00Z')).toBe('23:09 utc');
    expect(formatUtcTime(null)).toBeNull();
    expect(formatUtcTime('not a date')).toBeNull();
  });
});

describe('sourceLabel', () => {
  it('labels hacker news and reddit subreddits', () => {
    expect(sourceLabel('hackernews', 'https://news.ycombinator.com/item?id=1')).toBe('hacker news');
    expect(sourceLabel('reddit', 'https://www.reddit.com/r/freelance/comments/abc/x/')).toBe('r/freelance');
    expect(sourceLabel('reddit', 'https://example.com/nope')).toBe('reddit');
  });
});
