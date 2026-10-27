import type {
  BootstrapInput,
  BootstrapResult,
  CheckInResult,
  GrantRequest,
  MessageSyncRequest,
  MessagesPage,
  SpendRequest,
  SpinResult,
  WalletState,
} from '../../../src/ai/session-types.ts';

export type { BootstrapInput, BootstrapResult, CheckInResult, GrantRequest, MessageSyncRequest, MessagesPage, SpendRequest, SpinResult, WalletState };

/** A wallet call the database refused: too few shells, no wallet yet (before bootstrap), a bad amount. */
export class WalletError extends Error {
  // A plain field: Node runs this file by stripping types, which parameter properties defeat.
  readonly code: 'noShells' | 'noWallet' | 'badAmount';
  constructor(code: 'noShells' | 'noWallet' | 'badAmount') {
    super(code);
    this.code = code;
  }
}

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

  // The wallet (B1.2, supabase/migrations/*_b1_wallet.sql). Each throws WalletError when refused.
  walletState(userId: string): Promise<WalletState>;
  walletSpend(userId: string, request: SpendRequest): Promise<WalletState>;
  /** Earnings: `free` ones go to today's bucket and burn at midnight, the rest are kept. */
  walletCredit(userId: string, request: GrantRequest & { free: boolean }): Promise<WalletState>;
  walletCheckIn(userId: string, rules: { ladder: readonly number[]; top: number }): Promise<CheckInResult>;
  walletSpin(userId: string, rules: { segments: readonly number[]; weights: readonly number[]; freeSpins: number }): Promise<SpinResult>;

  // The chats (B1.3b, supabase/migrations/*_b1_message_sync.sql).
  /** One sync, all or nothing; answers the user's newest `seq`. */
  syncMessages(userId: string, request: MessageSyncRequest): Promise<number | null>;
  /** The user's messages after `after`, in `seq` order. */
  messagesAfter(userId: string, after: number, limit: number): Promise<MessagesPage>;
  /** Deletes the account and, through the foreign keys, every row it owns (App Store 5.1.1(v)). */
  deleteUser(userId: string): Promise<void>;
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
