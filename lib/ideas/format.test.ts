import { describe, expect, it } from 'vitest';

import { effortLabel, statusLabel, urgencyTone } from '@/lib/ideas/format';

describe('effortLabel', () => {
  it('humanizes effort enums', () => {
    expect(effortLabel('weekend')).toBe('Weekend');
    expect(effortLabel('1_week')).toBe('1 week');
    expect(effortLabel('too_big')).toBe('Too big');
  });
});

describe('statusLabel', () => {
  it('humanizes status enums', () => {
    expect(statusLabel('new')).toBe('New');
    expect(statusLabel('building')).toBe('Building');
  });
});

describe('urgencyTone', () => {
  it('buckets by threshold', () => {
    expect(urgencyTone(85)).toBe('high');
    expect(urgencyTone(70)).toBe('high');
    expect(urgencyTone(69)).toBe('medium');
    expect(urgencyTone(40)).toBe('medium');
    expect(urgencyTone(39)).toBe('low');
    expect(urgencyTone(0)).toBe('low');
  });
});
