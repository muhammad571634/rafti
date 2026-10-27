import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { serverBootstrap, serverClientConfig } from './server';
import type { BootstrapResult, ClientConfig } from './session-types';

/**
 * The phone's account on the Sigmazam backend (B0, backend-plan §11). The app signs in to Supabase
 * Auth anonymously (a real account can be linked later), keeps the session on the device, and asks
 * the server for the profile, wallet and plan. Only the publishable key lives in the app; the
 * server holds the secret one. Every failure is a reason, never a throw, so callers stay simple.
 */
export type AccountResult =
  | { ok: true; session: BootstrapResult }
  /** noServer: the server or its database is off; signInOff: anonymous sign-ins are disabled in the project. */
  | { ok: false; reason: 'noServer' | 'signInOff' | 'failed' };

let client: SupabaseClient | null = null;

/** A release build carries the config at build time; a development build asks the local server. */
async function clientConfig(): Promise<ClientConfig | null> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (supabaseUrl && supabaseKey) return { supabaseUrl, supabaseKey };
  return serverClientConfig();
}

async function supabase(): Promise<SupabaseClient | null> {
  if (client) return client;
  const config = await clientConfig();
  if (!config) return null;
  client = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
  // Tokens refresh only while the app is in front (Supabase's advice for mobile).
  AppState.addEventListener('change', (state) => {
    if (state === 'active') client?.auth.startAutoRefresh();
    else client?.auth.stopAutoRefresh();
  });
  return client;
}

/** Signs in (anonymously the first time) and returns the server's view of this account. */
export async function connectAccount(): Promise<AccountResult> {
  const auth = (await supabase())?.auth;
  if (!auth) return { ok: false, reason: 'noServer' };

  let { data } = await auth.getSession();
  if (!data.session) {
    const signIn = await auth.signInAnonymously();
    if (signIn.error) return { ok: false, reason: signIn.error.code === 'anonymous_provider_disabled' ? 'signInOff' : 'failed' };
    data = { session: signIn.data.session };
  }
  if (!data.session) return { ok: false, reason: 'failed' };

  const { locale, timeZone } = Intl.DateTimeFormat().resolvedOptions();
  const session = await serverBootstrap(data.session.access_token, { locale, timeZone });
  return session ? { ok: true, session } : { ok: false, reason: 'noServer' };
}
