import type { PlanId } from '@/types';

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

/** `GET /v1/client-config`: where the app signs in. The publishable key is public by design. */
export interface ClientConfig {
  supabaseUrl: string;
  supabaseKey: string;
}
