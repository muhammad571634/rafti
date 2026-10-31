import type { Subscription } from '@/types';

import { rollSubscription } from './plans';

/**
 * What a stream round costs (owner's rule, 2026-10-25: every feature has to make sense for us and
 * for the user). A round is up to 8 model calls, one per line (≈ $0.005, backend-plan §12.20).
 * A few rounds a day are free, more with a plan; each one after that costs `STREAM_SHELLS`. One
 * setting each, to tune with the numbers after launch. Resuming a paused round is always free.
 */
export const FREE_STREAM_ROUNDS = { free: 1, plan: 5 } as const;
export const STREAM_SHELLS = 2;

/** Free rounds used on `day` (a day key). */
export interface StreamUse {
  day: string;
  used: number;
}

const usedOn = (use: StreamUse | undefined, today: string) => (use?.day === today ? use.used : 0);

/** Free rounds left today: the plan's number with any plan or the trial, the free one otherwise. */
export function freeRoundsLeft(use: StreamUse | undefined, today: string, sub: Subscription | undefined, now: number) {
  const daily = rollSubscription(sub, now) ? FREE_STREAM_ROUNDS.plan : FREE_STREAM_ROUNDS.free;
  return Math.max(0, daily - usedOn(use, today));
}

/** The use after one more free round today, or null when today's are gone (the round then costs shells). */
export function takeFreeRound(use: StreamUse | undefined, today: string, sub: Subscription | undefined, now: number): StreamUse | null {
  if (freeRoundsLeft(use, today, sub, now) === 0) return null;
  return { day: today, used: usedOn(use, today) + 1 };
}
