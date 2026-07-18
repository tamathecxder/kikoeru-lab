/**
 * Shared shape for every data source. A `NormalizedPost` maps 1:1 onto a
 * `raw_posts` insert, minus the DB-generated columns (id, fetched_at, processed).
 */

export type Source = 'hackernews' | 'reddit';

export interface NormalizedPost {
  source: Source;
  external_id: string;
  title: string;
  body: string | null;
  url: string;
  /** SHA-256 hash of the author's username, or null when the author is deleted/unknown. */
  author_hash: string | null;
  score: number;
  num_comments: number;
  /** ISO 8601, or null when the source gives no timestamp. */
  posted_at: string | null;
}

export interface SourceError {
  /** Where the failure happened, e.g. a keyword, subreddit, or item id. */
  context: string;
  message: string;
}

/**
 * The result of an adapter fetch. Adapters NEVER throw: partial success is
 * expressed as some posts plus some errors. A single broken item or a single
 * failed request must not lose the rest of the batch.
 */
export interface FetchResult {
  posts: NormalizedPost[];
  errors: SourceError[];
}

export interface SourceAdapter {
  source: Source;
  fetch(): Promise<FetchResult>;
}
