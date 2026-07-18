import { createHash } from 'node:crypto';

/**
 * SHA-256 hex of a username. Usernames are hashed before storage so no
 * plaintext PII ever reaches the database (architecture rule 7). Callers must
 * NOT pass sentinel values like `[deleted]` — map those to null upstream.
 */
export function hashUsername(name: string): string {
  return createHash('sha256').update(name, 'utf8').digest('hex');
}
