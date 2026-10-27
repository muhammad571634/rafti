import { createClient } from '@supabase/supabase-js';

import {
  WalletError,
  type BootstrapInput,
  type BootstrapResult,
  type CheckInResult,
  type Db,
  type SpinResult,
  type UsageEvent,
  type WalletState,
} from './types.ts';

/**
 * Supabase with the server's secret key (service role): RLS does not apply to it, so every write
 * goes through here and through the SQL functions that keep the ledger and the wallet together
 * (`book_shells`, `bootstrap_user` in supabase/migrations). The key never leaves the server.
 */
export function supabaseDb(opts: { url: string; secretKey: string }): Db {
  const client = createClient(opts.url, opts.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  /** A wallet function; its own refusals (`raise exception 'noShells'` …) come back as WalletError. */
  async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await client.rpc(fn, args);
    if (!error) return data as T;
    if (error.message === 'noShells' || error.message === 'noWallet' || error.message === 'badAmount') throw new WalletError(error.message);
    throw new Error(`${fn}: ${error.message}`);
  }

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

    walletState: (userId) => rpc<WalletState>('wallet_state', { p_user: userId }),

    walletSpend: (userId, { amount, reason, key, characterId }) =>
      rpc<WalletState>('wallet_spend', { p_user: userId, p_amount: amount, p_reason: reason, p_key: key, p_character_id: characterId ?? null }),

    walletCredit: (userId, { amount, reason, key, free }) =>
      rpc<WalletState>('wallet_credit', { p_user: userId, p_amount: amount, p_reason: reason, p_key: key, p_free: free }),

    walletCheckIn: (userId, { ladder, top }) => rpc<CheckInResult>('wallet_check_in', { p_user: userId, p_ladder: ladder, p_top: top }),

    walletSpin: (userId, { segments, weights, freeSpins }) =>
      rpc<SpinResult>('wallet_spin', { p_user: userId, p_segments: segments, p_weights: weights, p_free_spins: freeSpins }),
  };
}
