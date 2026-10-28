import type { LedgerReason, MemoryItem, Message, PlanId } from '@/types';

/**
 * What `POST /v1/session/bootstrap` takes and returns, shared by the app (`src/ai/account.ts`) and
 * the server (`server/src/db/types.ts`) so the two never drift.
 */
export interface BootstrapInput {
  /** BCP 47, e.g. "en-US". */
  locale?: string;
  /** IANA zone, e.g. "Asia/Tashkent": the server counts the user's days in it (§14.3.6). */
  timeZone?: string;
}

/** The app's own shapes (`User`, `Wallet`, `Subscription`), filled from the database. */
export interface BootstrapResult {
  isNew: boolean;
  profile: {
    id: string;
    displayName: string;
    handle: string | null;
    locale: string;
    timeZone: string;
    birthYear: number | null;
    onboardedAt: string | null;
  };
  wallet: {
    shells: number;
    free: { day: string; amount: number } | null;
    trialUsed: boolean;
    boughtShells: boolean;
  };
  subscription: {
    plan: PlanId;
    status: 'trial' | 'active';
    termStart: string;
    termEnd: string;
    willRenew: boolean;
  } | null;
}

/** The wallet as the server keeps it: `GET /v1/wallet` and every wallet call's answer (B1.2). */
export interface WalletState {
  shells: number;
  /** Today's free bucket: spent first, burnt at the user's midnight. */
  free: { day: string; amount: number } | null;
  trialUsed: boolean;
  boughtShells: boolean;
  /** The user's today on the server, in their time zone ("2026-10-27"). */
  today: string;
  checkIn: { lastDay: string | null; streak: number };
  spinsToday: number;
}

/**
 * `POST /v1/wallet/spend`. The app names the amount for now: the goods (dates, notes, replies) are
 * still made on the phone, so a price check on the server would guard nothing yet. Each feature's
 * price moves to the server together with the feature. `key` makes a retry book once.
 */
export interface SpendRequest {
  amount: number;
  reason: LedgerReason;
  key: string;
  characterId?: string;
}

/** `POST /v1/wallet/grant`: earnings whose rules are not on the server yet; the test server only. */
export interface GrantRequest {
  amount: number;
  reason: LedgerReason;
  key: string;
}

/** `POST /v1/wallet/check-in`: amount 0 when today is already claimed; day is 1-7 of the streak. */
export interface CheckInResult {
  amount: number;
  day: number;
  wallet: WalletState;
}

/** `POST /v1/wallet/spin`: the segment (0-based, clockwise from the pointer), or null with no spin left. */
export interface SpinResult {
  index: number | null;
  reward: number;
  wallet: WalletState;
}

/** `GET /v1/client-config`: where the app signs in. The publishable key is public by design. */
export interface ClientConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

/**
 * `POST /v1/messages/sync` (B1.3b): what the phone has not sent yet. The server drops the chats
 * first, then deletes the single messages, then writes the upserts in the order sent.
 */
export interface MessageSyncRequest {
  /** Chats gone from the phone, or about to be sent whole again in a new order. */
  droppedChats: string[];
  deletedIds: string[];
  upserts: { chatId: string; message: Message }[];
}

/** The most one sync may carry: the server refuses more, the phone sends its outbox in batches this size. */
export const MESSAGE_SYNC_LIMITS = { upserts: 500, deletedIds: 5000, droppedChats: 500, messageBytes: 32_768 } as const;

/** The user's newest `seq`, and how many upserts the server could not take (kept on the phone only). */
export interface MessageSyncResult {
  seq: number | null;
  skipped: number;
}

/** `GET /v1/messages?after=<seq>`: the next page of the user's messages, in chat order. */
export interface MessagesPage {
  messages: { chatId: string; seq: number; message: Message }[];
  /** Pass as `after` for the next page; null on the last page. */
  next: number | null;
}

/**
 * `POST /v1/memories/sync` (B2.3): the memory the phone changed. Each character goes up whole and
 * replaces the server's list for it, so a fact the user had forgotten is gone from the server too.
 * A chat goes up with its summary and how far the memory pass read; without either, it is dropped.
 */
export interface MemorySyncRequest {
  characters: CharacterMemory[];
  chats: ChatMemory[];
}

export interface CharacterMemory {
  characterId: string;
  items: MemoryItem[];
}

export interface ChatMemory {
  chatId: string;
  summary?: string;
  /** The last message the memory pass read (`Conversation.memoryMark`). */
  mark?: string;
}

/** The most one sync may carry; the phone sends the rest in the next one. */
export const MEMORY_SYNC_LIMITS = { characters: 50, items: 400, chats: 200, itemBytes: 4096, summaryChars: 2000 } as const;

/** `GET /v1/memories`: everything the server keeps of the user's memory. */
export type MemoriesState = MemorySyncRequest;

export interface MemorySyncResult {
  /** Items the server could not take (a bad date, too big): they stay on the phone only. */
  skipped: number;
}
