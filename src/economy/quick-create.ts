import type { Subscription } from '@/types';

import { periodOf, rollSubscription } from './plans';

/**
 * Quick create's daily allowance (owner, 2026-10-25): 3 written drafts a day for free. One
 * setting, so it can follow the unit economics later (backend-plan §12.17). Only a draft that
 * came back counts; writing one field again does not, and the form is always free.
 */
export const FREE_QUICK_CREATES_PER_DAY = 3;

/** How many drafts were written on `day` (a day key). */
export interface QuickCreateUse {
  day: string;
  used: number;
}

const usedOn = (use: QuickCreateUse | undefined, today: string) => (use?.day === today ? use.used : 0);

export const quickCreatesLeft = (use: QuickCreateUse | undefined, today: string) =>
  Math.max(0, FREE_QUICK_CREATES_PER_DAY - usedOn(use, today));

/** The allowance after one more draft today, or null when today's are used up. */
export function spendQuickCreate(use: QuickCreateUse | undefined, today: string): QuickCreateUse | null {
  if (quickCreatesLeft(use, today) === 0) return null;
  return { day: today, used: usedOn(use, today) + 1 };
}

/**
 * A picture drawn from their looks, the costly part (≈ $0.08 a picture; backend-plan §12.18).
 * Owner, 2026-10-25: drawn once, when the character is created without a photo; 15 shells
 * without a plan, and a plan draws 10 a period for free. Charged only when a picture came back.
 */
export const PORTRAIT_SHELLS = 15;
export const PLAN_PORTRAITS = 10;

const portraitsUsed = (sub: Subscription, now: number) =>
  Date.parse(sub.usage.periodStart) === periodOf(sub, now).start ? (sub.usage.portraits ?? 0) : 0;

/** Free pictures left this period: the plan's, none without one. */
export function portraitsLeft(sub: Subscription | undefined, now: number) {
  const live = rollSubscription(sub, now);
  return live ? Math.max(0, PLAN_PORTRAITS - portraitsUsed(live, now)) : 0;
}

/** What the next picture costs in shells: 0 while the plan has free ones. */
export const portraitPrice = (sub: Subscription | undefined, now: number) => (portraitsLeft(sub, now) > 0 ? 0 : PORTRAIT_SHELLS);

/** Takes one of the plan's free pictures; null when there is none left. */
export function consumePortrait(sub: Subscription | undefined, now: number): Subscription | null {
  if (portraitsLeft(sub, now) <= 0) return null;
  const live = rollSubscription(sub, now)!;
  const { start } = periodOf(live, now);
  const usage =
    Date.parse(live.usage.periodStart) === start ? live.usage : { periodStart: new Date(start).toISOString(), callSeconds: 0, voiceSeconds: 0 };
  return { ...live, usage: { ...usage, portraits: (usage.portraits ?? 0) + 1 } };
}
