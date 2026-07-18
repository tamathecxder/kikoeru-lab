import { describe, expect, it } from 'vitest';

import { parseAiResponse } from '@/lib/ai/schema';

const validItem = {
  post_index: 0,
  pain_point: 'Freelancers lose track of unpaid invoices.',
  target_user: 'Solo freelancers billing multiple clients',
  existing_workaround: 'Spreadsheets and email',
  solution_pitch: 'A tiny invoice tracker with payment reminders.',
  mvp_scope: 'Add invoices, mark paid, send a reminder.',
  effort: 'weekend',
  suggested_stack: ['next', 'postgres'],
  portfolio_value: 'CRUD + scheduled jobs',
  pain_intensity: 'medium',
  willingness_to_pay: true,
};

describe('parseAiResponse', () => {
  it('parses a clean JSON array', () => {
    const { items, errors } = parseAiResponse(JSON.stringify([validItem]));
    expect(errors).toHaveLength(0);
    expect(items).toHaveLength(1);
    expect(items[0].effort).toBe('weekend');
  });

  it('strips a ```json code fence and retries once', () => {
    const fenced = '```json\n' + JSON.stringify([validItem]) + '\n```';
    const { items, errors } = parseAiResponse(fenced);
    expect(errors).toHaveLength(0);
    expect(items).toHaveLength(1);
  });

  it('skips the whole batch when JSON is unparseable after the fence retry', () => {
    const { items, errors } = parseAiResponse('not json at all {');
    expect(items).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].context).toBe('batch');
  });

  it('treats a non-array payload as a batch error', () => {
    const { items, errors } = parseAiResponse(JSON.stringify({ post_index: 0 }));
    expect(items).toHaveLength(0);
    expect(errors[0].message).toContain('not an array');
  });

  it('drops an invalid element but keeps valid ones', () => {
    const bad = { ...validItem, effort: 'someday', pain_intensity: 'extreme' };
    const { items, errors } = parseAiResponse(JSON.stringify([validItem, bad, { ...validItem, post_index: 2 }]));
    expect(items).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0].context).toBe('item[1]');
  });

  it('rejects more than 5 suggested_stack items', () => {
    const tooMany = { ...validItem, suggested_stack: ['a', 'b', 'c', 'd', 'e', 'f'] };
    const { items, errors } = parseAiResponse(JSON.stringify([tooMany]));
    expect(items).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });
});
