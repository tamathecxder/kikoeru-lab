import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time secret comparison. Both inputs are SHA-256 hashed first so the
 * buffers are always 32 bytes — this avoids leaking length via an early return
 * and avoids timingSafeEqual throwing on length mismatch.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}
