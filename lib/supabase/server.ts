import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The ONLY point of access to Supabase in this codebase.
 *
 * Architecture rule: Supabase is a database, not a backend. It is reached
 * exclusively from the server (API Routes / Server Components) using the
 * service-role key, which bypasses RLS. The client never queries Supabase
 * directly. The `server-only` import above makes any client-side import of
 * this module fail the build.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cachedClient: SupabaseClient | undefined;

export function getSupabaseServerClient(): SupabaseClient {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL and ' +
        'SUPABASE_SERVICE_ROLE_KEY must both be set.',
    );
  }

  // Reuse a single client per server runtime. The service role is stateless
  // (no user session), so persistence and token refresh are disabled.
  cachedClient ??= createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}
