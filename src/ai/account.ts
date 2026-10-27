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

type SignedIn = { token: string } | { reason: 'noServer' | 'signInOff' | 'failed' };

let client: Promise<SupabaseClient | null> | null = null;
let signingIn: Promise<SignedIn> | null = null;

/** A release build carries the config at build time; a development build asks the local server. */
async function clientConfig(): Promise<ClientConfig | null> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (supabaseUrl && supabaseKey) return { supabaseUrl, supabaseKey };
  return serverClientConfig();
}

/** One client for the app's life; when the backend is off, the next call asks again. */
function supabase(): Promise<SupabaseClient | null> {
  client ??= clientConfig().then((config) => {
    if (!config) {
      client = null;
      return null;
    }
    const created = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
    // Tokens refresh only while the app is in front (Supabase's advice for mobile).
    AppState.addEventListener('change', (state) => {
      if (state === 'active') created.auth.startAutoRefresh();
      else created.auth.stopAutoRefresh();
    });
    return created;
  });
  return client;
}

/** The kept session, else an anonymous sign-in; calls made meanwhile share it, so only one account is made. */
function signIn(): Promise<SignedIn> {
  signingIn ??= (async (): Promise<SignedIn> => {
    const auth = (await supabase())?.auth;
    if (!auth) return { reason: 'noServer' };
    const { data } = await auth.getSession();
    if (data.session) return { token: data.session.access_token };
    const anonymous = await auth.signInAnonymously();
    if (anonymous.error) return { reason: anonymous.error.code === 'anonymous_provider_disabled' ? 'signInOff' : 'failed' };
    return anonymous.data.session ? { token: anonymous.data.session.access_token } : { reason: 'failed' };
  })()
    .catch((): SignedIn => ({ reason: 'failed' }))
    .finally(() => {
      signingIn = null;
    });
  return signingIn;
}

/**
 * The access token for API calls, signing in the first time. Never throws and never holds a reply
 * up for long: when the backend is off or slow it gives null and the call goes out without one.
 */
export async function accessToken(waitMs = 2500): Promise<string | null> {
  const token = signIn().then((result) => ('token' in result ? result.token : null));
  const late = new Promise<null>((resolve) => setTimeout(() => resolve(null), waitMs));
  return Promise.race([token, late]);
}

/** Runs a call with the account's token; null when there is no account to run it with. */
export async function withAccount<T>(run: (accessToken: string) => Promise<T | null>): Promise<T | null> {
  const token = await accessToken();
  return token ? run(token) : null;
}

/** Signs in (anonymously the first time) and returns the server's view of this account. */
export async function connectAccount(): Promise<AccountResult> {
  const signedIn = await signIn();
  if ('reason' in signedIn) return { ok: false, reason: signedIn.reason };
  const { locale, timeZone } = Intl.DateTimeFormat().resolvedOptions();
  const session = await serverBootstrap(signedIn.token, { locale, timeZone });
  return session ? { ok: true, session } : { ok: false, reason: 'noServer' };
}
