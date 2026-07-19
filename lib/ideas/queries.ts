import 'server-only';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Effort, Idea, IdeaFilters } from '@/lib/ideas/types';

const IDEA_COLUMNS = '*, raw_posts (source, url, title)';

/** Landing "an example" pulls one idea per effort tier, smallest first. */
const EXAMPLE_EFFORTS: Effort[] = ['weekend', '1_week', '1_month'];

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

/**
 * Landing "an example": the highest-urgency idea in each of the weekend /
 * 1_week / 1_month effort tiers (skipped excluded). Missing tiers are dropped,
 * so this returns 0–3 ideas ordered smallest-effort first.
 */
export async function getExampleIdeas(): Promise<Idea[]> {
  const client = getSupabaseServerClient();
  const rows = await Promise.all(
    EXAMPLE_EFFORTS.map(async (effort) => {
      const { data, error } = await client
        .from('ideas')
        .select(IDEA_COLUMNS)
        .neq('status', 'skipped')
        .eq('effort', effort)
        .order('urgency_score', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(`getExampleIdeas(${effort}): ${error.message}`);
      return (data as unknown as Idea) ?? null;
    }),
  );
  return rows.filter((r): r is Idea => r !== null);
}

/** Hero stats: total posts read, ideas found, and when the last run finished. */
export async function getHeroStats(): Promise<{
  postsRead: number;
  ideasFound: number;
  lastListened: string | null;
}> {
  const client = getSupabaseServerClient();
  const [posts, ideas, run] = await Promise.all([
    client.from('raw_posts').select('id', { count: 'exact', head: true }),
    client.from('ideas').select('id', { count: 'exact', head: true }),
    client
      .from('ingest_runs')
      .select('finished_at')
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (posts.error) throw new Error(`getHeroStats(posts): ${posts.error.message}`);
  if (ideas.error) throw new Error(`getHeroStats(ideas): ${ideas.error.message}`);
  if (run.error) throw new Error(`getHeroStats(run): ${run.error.message}`);
  return {
    postsRead: posts.count ?? 0,
    ideasFound: ideas.count ?? 0,
    lastListened: (run.data?.finished_at as string | undefined) ?? null,
  };
}

/** Frustration markers used to find a quotable complaint title. */
const FRUSTRATION_RE =
  /hate|annoying|frustrat|can'?t|struggle|tired of|no (good|simple) way|why is|broken|sucks|painful|wish there was/i;

/**
 * A short, quotable real complaint for the hero blockquote — the shortest
 * raw_posts title (20–140 chars) that reads as a frustration. PostgREST can't
 * filter by char_length, so we fetch a bounded candidate set and pick in code.
 * Returns null when nothing suitable exists (caller falls back to a static quote).
 */
export async function getQuotePost(): Promise<{
  title: string;
  source: string;
  url: string;
  at: string | null;
} | null> {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from('raw_posts')
    .select('title, source, url, posted_at, fetched_at')
    .order('num_comments', { ascending: false })
    .limit(50); // bounded candidate set; the real pick happens in code below
  if (error) throw new Error(`getQuotePost: ${error.message}`);

  const candidates = (data ?? [])
    .filter((p) => {
      const len = p.title?.length ?? 0;
      return len >= 20 && len <= 140 && FRUSTRATION_RE.test(p.title);
    })
    .sort((a, b) => a.title.length - b.title.length);

  const pick = candidates[0];
  if (!pick) return null;
  return {
    title: pick.title,
    source: pick.source,
    url: pick.url,
    at: (pick.posted_at as string | null) ?? (pick.fetched_at as string | null) ?? null,
  };
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
