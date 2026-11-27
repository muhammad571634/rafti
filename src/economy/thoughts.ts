import type { Subscription } from '@/types';

import { rollSubscription } from './plans';

/**
 * Opening a friend's inner thought (owner, 2026-11-18, canvas "Inner thoughts"): a few a day are free,
 * more with a plan; past them one costs `THOUGHT_SHELLS`. The thought rides on the reply the model
 * already writes, so it costs us a few output tokens (docs/cost-ledger.md): the count is there to keep
 * the peek special, not to cover a cost. Pure on purpose, like free-messages.ts.
 */
export const FREE_THOUGHTS_PER_DAY = 3;
export const PLAN_THOUGHTS_PER_DAY = 10;
export const THOUGHT_SHELLS = 2;

/** Today's free thoughts for this user. */
export function freeThoughtsPerDay(sub: Subscription | undefined, now: number): number {
  return rollSubscription(sub, now) ? PLAN_THOUGHTS_PER_DAY : FREE_THOUGHTS_PER_DAY;
}

/** How many free thoughts are left today: the count starts again on a new day (the user's own midnight). */
export function thoughtsLeft(sub: Subscription | undefined, day: string | undefined, used: number | undefined, today: string, now: number): number {
  const spent = day === today ? Math.max(0, used ?? 0) : 0;
  return Math.max(0, freeThoughtsPerDay(sub, now) - spent);
}
