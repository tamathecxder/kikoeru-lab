import 'server-only';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Idea, IdeaFilters } from '@/lib/ideas/types';

const IDEA_COLUMNS = '*, raw_posts (source, url, title)';

/** List ideas, default sort urgency_score DESC, optionally filtered. */
export async function getIdeas(filters: IdeaFilters = {}): Promise<Idea[]> {
  const client = getSupabaseServerClient();
  let query = client.from('ideas').select(IDEA_COLUMNS).order('urgency_score', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  } else {
    // Hide "let go" (skipped) from the default view; still reachable via its filter.
    query = query.neq('status', 'skipped');
  }
  if (filters.effort) query = query.eq('effort', filters.effort);

  const { data, error } = await query;
  if (error) throw new Error(`getIdeas: ${error.message}`);
  return (data ?? []) as unknown as Idea[];
}

/** Highest-urgency idea for the landing page's "an example" section, or null. */
export async function getTopIdea(): Promise<Idea | null> {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from('ideas')
    .select(IDEA_COLUMNS)
    .neq('status', 'skipped')
    .order('urgency_score', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getTopIdea: ${error.message}`);
  return (data as unknown as Idea) ?? null;
}

/** Fetch a single idea by id, or null if it does not exist. */
export async function getIdeaById(id: string): Promise<Idea | null> {
  const client = getSupabaseServerClient();
  const { data, error } = await client.from('ideas').select(IDEA_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(`getIdeaById: ${error.message}`);
  return (data as unknown as Idea) ?? null;
}

/** Count of ideas heard in the last 7 days — the header's "N heard this week". */
export async function getWeeklyHeardCount(): Promise<number> {
  const client = getSupabaseServerClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await client
    .from('ideas')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);
  if (error) throw new Error(`getWeeklyHeardCount: ${error.message}`);
  return count ?? 0;
}

/** ISO timestamp of the most recent ingest run, or null if none — "last listened". */
export async function getLatestRunAt(): Promise<string | null> {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from('ingest_runs')
    .select('started_at')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestRunAt: ${error.message}`);
  return (data?.started_at as string | undefined) ?? null;
}
