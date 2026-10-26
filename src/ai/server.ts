import Constants from 'expo-constants';

import type { ChatPromptInput } from './chat-prompt';

/**
 * The phone's side of the Sigmazam API (`server/`). While testing, the server runs on the same
 * laptop as Metro, so a development build finds it at Metro's host on port 8787; a release build
 * reads `EXPO_PUBLIC_API_URL`. Every call has a deadline and any failure returns null: the caller
 * then writes the stand-in reply, so the chat never stalls on a network or a free-tier daily cap.
 */
const DEV_PORT = 8787;
const TIMEOUT_MS = 25_000;

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

/** The real model's reply as chat bubbles, or null (fall back to the stand-in). */
export async function serverReply(input: ChatPromptInput): Promise<string[] | null> {
  const reply = await call<{ messages?: string[] }>('/v1/chat/reply', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const lines = reply?.messages?.filter((line) => typeof line === 'string' && line.trim());
  return lines?.length ? lines : null;
}
