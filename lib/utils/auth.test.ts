import { describe, expect, it } from 'vitest';

import { timingSafeCompare } from '@/lib/utils/auth';

describe('timingSafeCompare', () => {
  it('returns true for identical secrets', () => {
    expect(timingSafeCompare('s3cr3t-token', 's3cr3t-token')).toBe(true);
  });

  it('returns false for different secrets', () => {
    expect(timingSafeCompare('s3cr3t-token', 'wrong-token')).toBe(false);
  });

  it('returns false for different-length inputs (no throw)', () => {
    expect(timingSafeCompare('short', 'a-much-longer-secret-value')).toBe(false);
  });

  it('returns false when one side is empty', () => {
    expect(timingSafeCompare('', 'something')).toBe(false);
  });
});
