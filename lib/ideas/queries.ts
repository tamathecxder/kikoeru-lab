import 'server-only';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Idea, IdeaFilters } from '@/lib/ideas/types';

const IDEA_COLUMNS = '*, raw_posts (source, url, title)';

/** List ideas, default sort urgency_score DESC, optionally filtered. */
export async function getIdeas(filters: IdeaFilters = {}): Promise<Idea[]> {
  const client = getSupabaseServerClient();
  let query = client.from('ideas').select(IDEA_COLUMNS).order('urgency_score', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.effort) query = query.eq('effort', filters.effort);

  const { data, error } = await query;
  if (error) throw new Error(`getIdeas: ${error.message}`);
  return (data ?? []) as unknown as Idea[];
}

/** Fetch a single idea by id, or null if it does not exist. */
export async function getIdeaById(id: string): Promise<Idea | null> {
  const client = getSupabaseServerClient();
  const { data, error } = await client.from('ideas').select(IDEA_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(`getIdeaById: ${error.message}`);
  return (data as unknown as Idea) ?? null;
}
