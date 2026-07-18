import { runIngest } from '@/lib/ingest/ingest';
import { createSupabaseStore } from '@/lib/ingest/store';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { timingSafeCompare } from '@/lib/utils/auth';
import { logger } from '@/lib/utils/logger';

// Needs node:crypto and the service-role key — never edge, never static.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    logger.error('ingest misconfigured: CRON_SECRET not set');
    return Response.json({ error: 'server misconfigured' }, { status: 500 });
  }

  const provided = request.headers.get('x-cron-secret') ?? '';
  if (!timingSafeCompare(provided, expected)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const store = createSupabaseStore(getSupabaseServerClient());
    const summary = await runIngest({ store });
    logger.info('ingest complete', {
      posts_fetched: summary.posts_fetched,
      posts_new: summary.posts_new,
      ideas_created: summary.ideas_created,
      errors: summary.errors.length,
    });
    return Response.json({ ok: true, ...summary }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ingest failed';
    logger.error('ingest failed', { message });
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
