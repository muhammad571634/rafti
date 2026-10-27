import type { LedgerReason, PlanId } from '@/types';

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
