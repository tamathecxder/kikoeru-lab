import { z } from 'zod';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { IDEA_STATUSES } from '@/lib/ideas/types';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({ status: z.enum(IDEA_STATUSES) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: 'status must be one of ' + IDEA_STATUSES.join(', ') }, { status: 400 });
  }

  try {
    const client = getSupabaseServerClient();
    const { data, error } = await client
      .from('ideas')
      .update({ status: parsed.data.status })
      .eq('id', id)
      .select('id, status')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return Response.json({ error: 'idea not found' }, { status: 404 });

    return Response.json({ ok: true, ...data }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'update failed';
    logger.error('idea status update failed', { id, message });
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
