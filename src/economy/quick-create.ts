import type { Subscription } from '@/types';

import { hasPro, periodOf, rollSubscription } from './plans';

/** Who gets how much: no plan, Basic, or Pro (its trial too). */
export type CreateTier = 'free' | 'basic' | 'pro';

export function createTier(sub: Subscription | undefined, now: number): CreateTier {
  if (!rollSubscription(sub, now)) return 'free';
  return hasPro(sub, now) ? 'pro' : 'basic';
}

/**
 * Quick create's daily allowance (owner, 2026-10-27): 1 written draft a day without a plan, 5 on
 * Basic, 10 on Pro, the way Character.AI caps Vibe create and keeps the form itself free. A draft
 * costs us ≈ $0.005–0.01, so the busiest user stays under $0.3 / $1.5 / $3 a month (backend-plan
 * §12.18). Only a draft that came back counts; writing one field again does not, and the form is
 * always free for everyone.
 */
export const QUICK_CREATES_PER_DAY: Record<CreateTier, number> = { free: 1, basic: 5, pro: 10 };

export const quickCreatesPerDay = (sub: Subscription | undefined, now: number) => QUICK_CREATES_PER_DAY[createTier(sub, now)];

/** How many drafts were written on `day` (a day key). */
export interface QuickCreateUse {
  day: string;
  used: number;
}

const usedOn = (use: QuickCreateUse | undefined, today: string) => (use?.day === today ? use.used : 0);

export const quickCreatesLeft = (use: QuickCreateUse | undefined, today: string, perDay: number) =>
  Math.max(0, perDay - usedOn(use, today));

/** The allowance after one more draft today, or null when today's are used up. */
export function spendQuickCreate(use: QuickCreateUse | undefined, today: string, perDay: number): QuickCreateUse | null {
  if (quickCreatesLeft(use, today, perDay) === 0) return null;
  return { day: today, used: usedOn(use, today) + 1 };
}

/**
 * A picture drawn from their looks when a character is created without a photo, the costly part
 * (≈ $0.08 a picture; backend-plan §12.18). Not Photo Booth, which has its own `PLANS.photos`.
 * 15 shells without a plan (≈ $0.17–0.30 to the user). A plan draws some free every 30 days
 * (owner, 2026-10-27: Basic 10, Pro 20; the 3-day trial 3, like its Photo Booth pictures), then 15
 * shells each. Charged only when a picture came back.
 */
export const PORTRAIT_SHELLS = 15;
export const PLAN_PORTRAITS = { basic: 10, pro: 20, trial: 3 } as const;

const portraitsUsed = (sub: Subscription, now: number) =>
  Date.parse(sub.usage.periodStart) === periodOf(sub, now).start ? (sub.usage.portraits ?? 0) : 0;

/** Free pictures a period on this plan: none without one. */
export function planPortraits(sub: Subscription | undefined, now: number) {
  const live = rollSubscription(sub, now);
  if (!live) return 0;
  if (live.status === 'trial') return PLAN_PORTRAITS.trial;
  return hasPro(live, now) ? PLAN_PORTRAITS.pro : PLAN_PORTRAITS.basic;
}

/** Free pictures left this period: the plan's, none without one. */
export function portraitsLeft(sub: Subscription | undefined, now: number) {
  const live = rollSubscription(sub, now);
  return live ? Math.max(0, planPortraits(live, now) - portraitsUsed(live, now)) : 0;
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
