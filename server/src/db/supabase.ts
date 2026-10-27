import { createClient } from '@supabase/supabase-js';

import type { BootstrapInput, BootstrapResult, Db, UsageEvent } from './types.ts';

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

    async logUsage(event: UsageEvent) {
      const { error } = await client.from('usage_events').insert({
        user_id: event.userId,
        kind: event.kind,
        mode: event.mode ?? null,
        model: event.model ?? null,
        prompt_version: event.promptVersion ?? null,
        input_tokens: event.inputTokens ?? null,
        cached_tokens: event.cachedTokens ?? null,
        output_tokens: event.outputTokens ?? null,
        seconds: event.seconds ?? null,
        cost_usd: event.costUsd ?? null,
      });
      if (error) throw new Error(`usage_events: ${error.message}`);
    },
  };
}
