import type { SupabaseClient } from '@supabase/supabase-js';

import type { AnalyzablePost, IdeaDraft } from '@/lib/ai/analyze';
import type { NormalizedPost } from '@/lib/sources/types';

export interface RunRecord {
  started_at: string;
  finished_at: string;
  source: string;
  posts_fetched: number;
  posts_new: number;
  ideas_created: number;
  errors: unknown;
}

/**
 * The database operations the ingest pipeline needs. Abstracting them keeps all
 * Supabase specifics in one place and lets runIngest be tested with a fake.
 */
export interface IngestStore {
  /** Upsert scraped posts; returns how many were newly inserted (dedup ignored). */
  upsertRawPosts(posts: NormalizedPost[]): Promise<number>;
  /** Fetch up to `limit` posts still needing analysis. */
  fetchUnprocessed(limit: number): Promise<AnalyzablePost[]>;
  /** Insert idea drafts; returns how many rows were created. */
  insertIdeas(drafts: IdeaDraft[]): Promise<number>;
  /** Mark the given raw_posts as processed. */
  markProcessed(ids: string[]): Promise<void>;
  /** Append one observability row for this run. */
  recordRun(run: RunRecord): Promise<void>;
}

/** Real store backed by the Supabase service-role client. */
export function createSupabaseStore(client: SupabaseClient): IngestStore {
  return {
    async upsertRawPosts(posts) {
      if (posts.length === 0) return 0;
      const { data, error } = await client
        .from('raw_posts')
        .upsert(posts, { onConflict: 'source,external_id', ignoreDuplicates: true })
        .select('id');
      if (error) throw new Error(`upsertRawPosts: ${error.message}`);
      return data?.length ?? 0;
    },

    async fetchUnprocessed(limit) {
      const { data, error } = await client
        .from('raw_posts')
        .select('id, title, body, url, score, num_comments, posted_at')
        .eq('processed', false)
        .order('fetched_at', { ascending: true })
        .limit(limit);
      if (error) throw new Error(`fetchUnprocessed: ${error.message}`);
      return (data ?? []) as AnalyzablePost[];
    },

    async insertIdeas(drafts) {
      if (drafts.length === 0) return 0;
      const { data, error } = await client.from('ideas').insert(drafts).select('id');
      if (error) throw new Error(`insertIdeas: ${error.message}`);
      return data?.length ?? 0;
    },

    async markProcessed(ids) {
      if (ids.length === 0) return;
      const { error } = await client.from('raw_posts').update({ processed: true }).in('id', ids);
      if (error) throw new Error(`markProcessed: ${error.message}`);
    },

    async recordRun(run) {
      const { error } = await client.from('ingest_runs').insert(run);
      if (error) throw new Error(`recordRun: ${error.message}`);
    },
  };
}
