import { GoogleGenAI } from '@google/genai';

import { buildPrompt } from '@/lib/ai/prompt';
import { parseAiResponse } from '@/lib/ai/schema';
import { computeUrgency, type ScoreBreakdown } from '@/lib/ai/scoring';
import { logger } from '@/lib/utils/logger';
import type { SourceError } from '@/lib/sources/types';

const MODEL = 'gemini-2.0-flash';
const BATCH_SIZE = 5;

/** A raw_posts row, as supplied by the ingest route in Milestone 5. */
export interface AnalyzablePost {
  id: string;
  title: string;
  body: string | null;
  url: string;
  score: number;
  num_comments: number;
  posted_at: string | null;
}

/** A row ready to insert into `ideas` (status defaults to `new` in the DB). */
export interface IdeaDraft {
  raw_post_id: string;
  pain_point: string;
  target_user: string;
  existing_workaround: string | null;
  solution_pitch: string;
  mvp_scope: string;
  effort: string;
  suggested_stack: string[];
  portfolio_value: string;
  urgency_score: number;
  score_breakdown: ScoreBreakdown;
}

/** Injectable model call so tests can run without hitting the network. */
export type GenerateFn = (prompt: string) => Promise<string>;

/** Default generator: real Gemini call. Built lazily so tests never need a key. */
export const geminiGenerate: GenerateFn = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { temperature: 0.3 },
  });
  return res.text ?? '';
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Analyze posts in batches of 5. The AI extracts categoricals only; urgency is
 * computed in code. Never throws: a failed or unparseable batch, or an
 * out-of-range post_index, is recorded as an error and skipped while the rest
 * of the job continues.
 */
export async function analyzePosts(
  posts: AnalyzablePost[],
  opts: { generate?: GenerateFn; now?: number } = {},
): Promise<{ drafts: IdeaDraft[]; errors: SourceError[] }> {
  const generate = opts.generate ?? geminiGenerate;
  const now = opts.now ?? Date.now();
  const drafts: IdeaDraft[] = [];
  const errors: SourceError[] = [];

  for (const batch of chunk(posts, BATCH_SIZE)) {
    const prompt = buildPrompt(batch.map((p, index) => ({ index, title: p.title, body: p.body })));

    let text: string;
    try {
      text = await generate(prompt);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'generate failed';
      errors.push({ context: 'batch', message });
      logger.error('ai batch generate failed', { message });
      continue;
    }

    const { items, errors: parseErrors } = parseAiResponse(text);
    errors.push(...parseErrors);

    for (const item of items) {
      const post = batch[item.post_index];
      if (!post) {
        // Model returned an index outside this batch — never trust its indexing.
        errors.push({ context: 'batch', message: `dropped out-of-range post_index ${item.post_index}` });
        continue;
      }

      const { urgency_score, breakdown } = computeUrgency({
        score: post.score,
        num_comments: post.num_comments,
        posted_at: post.posted_at,
        pain_intensity: item.pain_intensity,
        willingness_to_pay: item.willingness_to_pay,
        effort: item.effort,
        now,
      });

      drafts.push({
        raw_post_id: post.id,
        pain_point: item.pain_point,
        target_user: item.target_user,
        existing_workaround: item.existing_workaround,
        solution_pitch: item.solution_pitch,
        mvp_scope: item.mvp_scope,
        effort: item.effort,
        suggested_stack: item.suggested_stack,
        portfolio_value: item.portfolio_value,
        urgency_score,
        score_breakdown: breakdown,
      });
    }
  }

  return { drafts, errors };
}
