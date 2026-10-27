import { createClient } from '@supabase/supabase-js';

import type { BootstrapInput, BootstrapResult, Db } from './types.ts';

/**
 * Supabase with the server's secret key (service role): RLS does not apply to it, so every write
 * goes through here and through the SQL functions that keep the ledger and the wallet together
 * (`book_shells`, `bootstrap_user` in supabase/migrations). The key never leaves the server.
 */
export function supabaseDb(opts: { url: string; secretKey: string }): Db {
  const client = createClient(opts.url, opts.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return {
    name: 'supabase',

    async userIdFromToken(token) {
      const { data, error } = await client.auth.getUser(token);
      return error || !data.user ? null : data.user.id;
    },

    async bootstrap(userId, input: BootstrapInput) {
      const { data, error } = await client.rpc('bootstrap_user', {
        p_user: userId,
        p_locale: input.locale ?? null,
        p_time_zone: input.timeZone ?? null,
      });
      if (error) throw new Error(`bootstrap_user: ${error.message}`);
      return data as BootstrapResult;
    },
  };
}
