import type { Wallet } from '@/types';

/**
 * The 7-day check-in ladder ("Log in daily to unlock surprise shells"): shells for
 * days 1-7. Day 7 is a surprise: its entry is the floor, and the roll goes up to
 * `DAILY_CHECK_IN_TOP`. The server passes these to its SQL (`wallet_check_in`).
 */
export const DAILY_CHECK_IN = [30, 30, 35, 35, 40, 40, 50] as const;
export const DAILY_CHECK_IN_TOP = 100;

/** The lucky wheel's one spin a day; the app has no ads to buy more (owner, 2026-10-22). */
export const FREE_SPINS_PER_DAY = 1;

/** Lucky Wheel segments, clockwise from the pointer. */
export const WHEEL_SEGMENTS = [5, 20, 10, 50, 5, 30, 10, 100] as const;
/** Relative odds per segment: the big prizes are rare, and a spin pays about 8 shells on average. */
export const WHEEL_WEIGHTS = [75, 8, 55, 2, 75, 2, 30, 1] as const;

/**
 * Free shells (check-in, wheel, ads, share, invite) live in today's free bucket:
 * spent first and burnt to zero at the user's midnight. Bought shells and the one-time welcome
 * gift stay (owner decision 2026-10-13). Pure on purpose, like plans.ts: the server copies it.
 */
export function creditFree(wallet: Wallet, amount: number, today: string): Wallet {
  const already = wallet.free && wallet.free.day === today ? wallet.free.amount : 0;
  return { ...wallet, shells: wallet.shells + amount, free: { day: today, amount: already + amount } };
}
