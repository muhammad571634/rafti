import Constants from 'expo-constants';

import type { ChatPromptInput } from './chat-prompt';
import type { FirstTextRequest } from './first-text';
import type {
  BootstrapInput,
  BootstrapResult,
  CheckInResult,
  ClientConfig,
  GrantRequest,
  MessageSyncRequest,
  MessageSyncResult,
  MessagesPage,
  SpendRequest,
  SpinResult,
  WalletState,
} from './session-types';

/**
 * The phone's side of the Sigmazam API (`server/`). While testing, the server runs on the same
 * laptop as Metro, so a development build finds it at Metro's host on port 8787; a release build
 * reads `EXPO_PUBLIC_API_URL`. Every call has a deadline and any failure returns null: the caller
 * then writes the stand-in reply, so the chat never stalls on a network or a free-tier daily cap.
 */
const DEV_PORT = 8787;
const TIMEOUT_MS = 25_000;
/** Nobody waits on a text they write first, but "typing…" shows meanwhile: past this the scripted line goes. */
const FIRST_TEXT_TIMEOUT_MS = 15_000;

export function apiBase(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (!__DEV__) return null;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:${DEV_PORT}` : null;
}

async function call<T>(path: string, init?: RequestInit, timeoutMs = TIMEOUT_MS): Promise<T | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Which model the server runs, or null when it is off or unreachable. */
export async function serverModel(): Promise<string | null> {
  const health = await call<{ ok: boolean; model: string | null }>('/health', undefined, 4000);
  return health?.model ?? null;
}

/** Where the app signs in (the Supabase URL and publishable key), or null when the server has no database. */
export function serverClientConfig(): Promise<ClientConfig | null> {
  return call<ClientConfig>('/v1/client-config', undefined, 4000);
}

/** The signed-in user's profile, wallet and plan; the first call creates them and pays the welcome gift. */
export function serverBootstrap(accessToken: string, input: BootstrapInput): Promise<BootstrapResult | null> {
  return call<BootstrapResult>('/v1/session/bootstrap', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  });
}

const withToken = (accessToken: string, init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
});
const post = (accessToken: string, body: unknown) => withToken(accessToken, { method: 'POST', body: JSON.stringify(body) });

/**
 * The wallet on the server (B1.2). Each call answers the server's wallet, or null when the server is
 * off or refused (no shells, a grant on a server that takes none); the caller then reads the wallet
 * again and takes it as the truth.
 */
export const serverWallet = {
  state: (accessToken: string) => call<WalletState>('/v1/wallet', withToken(accessToken), 8000),
  spend: (accessToken: string, request: SpendRequest) => call<WalletState>('/v1/wallet/spend', post(accessToken, request), 8000),
  grant: (accessToken: string, request: GrantRequest) => call<WalletState>('/v1/wallet/grant', post(accessToken, request), 8000),
  checkIn: (accessToken: string) => call<CheckInResult>('/v1/wallet/check-in', post(accessToken, {}), 8000),
  spin: (accessToken: string) => call<SpinResult>('/v1/wallet/spin', post(accessToken, {}), 8000),
};

/**
 * The chats on the server (B1.3b): the phone's unsent rows go up, a new install reads them back,
 * and deleting the account deletes the server's copy. Null when the server is off or refused.
 */
export const serverMessages = {
  sync: (accessToken: string, request: MessageSyncRequest) =>
    call<MessageSyncResult>('/v1/messages/sync', post(accessToken, request), 20_000),
  page: (accessToken: string, after: number) => call<MessagesPage>(`/v1/messages?after=${after}`, withToken(accessToken), 20_000),
  deleteAccount: (accessToken: string) =>
    call<{ ok: true }>('/v1/account', withToken(accessToken, { method: 'DELETE' }), 15_000),
};

/**
 * The real model's reply as chat bubbles, or null (fall back to the stand-in). With the account's
 * token the server ties the call's cost to this user (`usage_events`); without one it still answers.
 */
export async function serverReply(input: ChatPromptInput, accessToken?: string | null): Promise<string[] | null> {
  const reply = await call<{ messages?: string[] }>('/v1/chat/reply', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
    body: JSON.stringify(input),
  });
  const lines = reply?.messages?.filter((line) => typeof line === 'string' && line.trim());
  return lines?.length ? lines : null;
}

/**
 * A text they write first, in the model's words (B1.4a): `skip` when the model passed (the chat
 * already settled it), null when the server is off, busy or slow (the caller writes the scripted line).
 */
export async function serverFirstText(request: FirstTextRequest, accessToken?: string | null): Promise<{ skip: boolean; lines: string[] } | null> {
  const reply = await call<{ skip?: boolean; lines?: unknown[] }>(
    '/v1/ai/first-text',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(request),
    },
    FIRST_TEXT_TIMEOUT_MS,
  );
  if (!reply) return null;
  const lines = (reply.lines ?? []).filter((line): line is string => typeof line === 'string' && !!line.trim());
  return { skip: reply.skip === true || !lines.length, lines };
}
