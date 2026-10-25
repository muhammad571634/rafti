import type { Subscription } from '@/types';

import { rollSubscription } from './plans';

/**
 * Things a plan gives more of (owner, 2026-10-25: every feature has to make sense for us and for
 * the user). Each one costs us next to nothing (a few hundred prompt tokens a message), so it is a
 * reason to subscribe rather than a cost to cover; what costs money stays on shells and minutes.
 * Each is one setting, to tune with the numbers after launch (backend-plan §12.18).
 */
export const PERKS = {
  /** Personas besides the profile. */
  personas: { free: 1, plan: 5 },
  /** The user's own scenes; the ones that come with the app are free for everyone. */
  ownScenes: { free: 3, plan: 10 },
} as const;

export type Perk = keyof typeof PERKS;

/** How many the user may have: any plan or the trial gets the plan's number. */
export function perkLimit(perk: Perk, sub: Subscription | undefined, now: number) {
  return rollSubscription(sub, now) ? PERKS[perk].plan : PERKS[perk].free;
}

/** At the limit, but a plan would allow more: the place to offer one. */
export const planWouldAllowMore = (perk: Perk, count: number, limit: number) => count >= limit && limit < PERKS[perk].plan;
