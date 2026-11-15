import type { Subscription } from '@/types';

import { rollSubscription } from './plans';

/**
 * Messages without a shell (audit 2026-11-15 §6.3, owner's pick "B" of `docs/pricing-6-3.md`): talking to a
 * friend is not metered. Everyone gets a daily count of messages free; a plan (Basic, Pro, the trial) chats
 * under a fair-use count instead. Past the count a message costs a shell as before, so nobody hits a wall
 * while they have shells. Shells are for things with a real cost: photos, calls past the plan, voice,
 * dates, plans, notes. Pure on purpose, like plans.ts: the server copies the numbers.
 */
export const FREE_MESSAGES_PER_DAY = 30;
/** A plan's fair use: far above a heavy day (~150), low enough that a script cannot run up the bill. */
export const PLAN_MESSAGES_PER_DAY = 200;
/** The chat says how many are left only from here down ("5 left today"). */
export const SHOW_LEFT_FROM = 5;

/** Today's messages without a shell for this user. */
export function freeMessagesPerDay(sub: Subscription | undefined, now: number): number {
  return rollSubscription(sub, now) ? PLAN_MESSAGES_PER_DAY : FREE_MESSAGES_PER_DAY;
}

/** Messages already used today: the count resets on a new day (the user's own midnight). */
export function usedToday(day: string | undefined, used: number | undefined, today: string): number {
  return day === today ? Math.max(0, used ?? 0) : 0;
}

/** How many free messages are left today (0 when the count is used up). */
export function messagesLeft(sub: Subscription | undefined, used: number, now: number): number {
  return Math.max(0, freeMessagesPerDay(sub, now) - used);
}

/** The small "N left today" note: only for the free count's last few, never for a plan. */
export function showLeft(sub: Subscription | undefined, used: number, now: number): number | null {
  if (rollSubscription(sub, now)) return null;
  const left = messagesLeft(sub, used, now);
  return left > 0 && left <= SHOW_LEFT_FROM ? left : null;
}
