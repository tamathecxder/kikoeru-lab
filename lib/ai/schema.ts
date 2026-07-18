import { z } from 'zod';

import type { SourceError } from '@/lib/sources/types';

/** The exact shape the model must emit per idea. Validated before any DB write. */
export const aiIdeaSchema = z.object({
  post_index: z.number().int().min(0),
  pain_point: z.string().min(1),
  target_user: z.string().min(1),
  existing_workaround: z.string().nullable(),
  solution_pitch: z.string().min(1),
  mvp_scope: z.string().min(1),
  effort: z.enum(['weekend', '1_week', '1_month', 'too_big']),
  suggested_stack: z.array(z.string()).max(5),
  portfolio_value: z.string().min(1),
  pain_intensity: z.enum(['low', 'medium', 'high']),
  willingness_to_pay: z.boolean(),
});

export type AiIdea = z.infer<typeof aiIdeaSchema>;

/** Strip a single ```json ... ``` (or bare ```) fence if the model added one. */
function stripFence(text: string): string {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
  const match = trimmed.match(fence);
  return match ? match[1].trim() : trimmed;
}

/**
 * Parse and validate a batch response.
 *
 *  - JSON.parse; on failure strip a code fence and retry ONCE. Still failing
 *    or not an array -> skip the whole batch (one error, no items).
 *  - Otherwise validate each element with Zod; keep valid ones, record a
 *    SourceError for each invalid element (skip item, keep the batch).
 *
 * Never throws.
 */
export function parseAiResponse(text: string): { items: AiIdea[]; errors: SourceError[] } {
  const errors: SourceError[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    try {
      parsed = JSON.parse(stripFence(text));
    } catch {
      return { items: [], errors: [{ context: 'batch', message: 'response was not valid JSON after fence retry' }] };
    }
  }

  if (!Array.isArray(parsed)) {
    return { items: [], errors: [{ context: 'batch', message: 'response JSON was not an array' }] };
  }

  const items: AiIdea[] = [];
  parsed.forEach((element, i) => {
    const result = aiIdeaSchema.safeParse(element);
    if (result.success) {
      items.push(result.data);
    } else {
      errors.push({ context: `item[${i}]`, message: result.error.issues.map((x) => x.message).join('; ') });
    }
  });

  return { items, errors };
}
