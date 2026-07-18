import { describe, expect, it } from 'vitest';

import { hashUsername } from '@/lib/utils/hash';

describe('hashUsername', () => {
  it('produces the known SHA-256 hex digest', () => {
    // Known-answer test: SHA-256("abc").
    expect(hashUsername('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('is deterministic for the same input', () => {
    expect(hashUsername('freelance_dev')).toBe(hashUsername('freelance_dev'));
  });

  it('differs for different inputs and is 64 hex chars', () => {
    const a = hashUsername('alice');
    const b = hashUsername('bob');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
