import type { BootstrapInput, BootstrapResult } from '../../../src/ai/session-types.ts';

export type { BootstrapInput, BootstrapResult };

/**
 * The database behind the API (backend-plan §1.4: every provider sits behind an interface).
 * Supabase today (`supabase.ts`); tests pass a fake.
 */
export interface Db {
  name: string;
  /** The signed-in user behind an access token, or null when the token is not valid. */
  userIdFromToken(token: string): Promise<string | null>;
  /** First call creates the profile and wallet and pays the welcome gift; later calls only read. */
  bootstrap(userId: string, input: BootstrapInput): Promise<BootstrapResult>;
  /** One row of the cost log (`usage_events`, server only, never shown to users). */
  logUsage(event: UsageEvent): Promise<void>;
}

/** What one model or voice call cost (backend-plan §1.5, §9: the unit economics come from these rows). */
export interface UsageEvent {
  /** Null when the call came without a signed-in user. */
  userId: string | null;
  kind: 'llm' | 'tts' | 'stt' | 'call' | 'image';
  /** What the call was for: 'chat' now; 'brief', 'quickCreate'… as those move to the server. */
  mode?: string;
  model?: string;
  promptVersion?: string;
  inputTokens?: number;
  cachedTokens?: number;
  outputTokens?: number;
  seconds?: number;
  /** At the paid tier's list price; null for a model with no price on file. */
  costUsd?: number | null;
}
