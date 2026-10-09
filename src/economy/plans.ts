import type { MinutePack, PlanId, Subscription } from '@/types';

/**
 * Plans, minutes and limits (docs/backend-plan.md §13–14). Pure on purpose, like the
 * push planner: no store, no clock reads, no randomness. The app runs these rules on
 * its mock wallet today; the server copies this file and runs the same ones later.
 */

export type MinutesKind = 'call' | 'voice';

export interface PlanSpec {
  id: PlanId;
  /** Display price; real builds take the localized price from the store. */
  price: string;
  amount: number;
  /** What one purchase or renewal covers, in days. */
  termDays: number;
  /** Minutes reset every period: monthly, except the quarterly plan (every 90 days). */
  periodDays: number;
  /** Allowance per period, in seconds. */
  callSeconds: number;
  voiceSeconds: number;
}

const MIN = 60;

export const PLANS: Record<PlanId, PlanSpec> = {
  basic: {
    id: 'basic',
    price: '$9.99',
    amount: 9.99,
    termDays: 30,
    periodDays: 30,
    callSeconds: 60 * MIN,
    voiceSeconds: 30 * MIN,
  },
  quarterly: {
    id: 'quarterly',
    price: '$24.99',
    amount: 24.99,
    termDays: 90,
    periodDays: 90,
    callSeconds: 150 * MIN,
    voiceSeconds: 90 * MIN,
  },
  // Billed yearly at Basic's limits; the minutes still reset every month.
  annual: {
    id: 'annual',
    price: '$79.99',
    amount: 79.99,
    termDays: 365,
    periodDays: 30,
    callSeconds: 60 * MIN,
    voiceSeconds: 30 * MIN,
  },
  pro: {
    id: 'pro',
    price: '$29.99',
    amount: 29.99,
    termDays: 30,
    periodDays: 30,
    callSeconds: 180 * MIN,
    voiceSeconds: 120 * MIN,
  },
};

/** The store's free trial: Basic for 3 days, with a smaller allowance. One per account. */
export const TRIAL = { plan: 'basic' as PlanId, days: 3, callSeconds: 10 * MIN, voiceSeconds: 10 * MIN };

/** Members chat without limits up to this many messages a day (an anti-abuse line in the terms). */
export const FAIR_USE_PER_DAY = 300;

/** Extra minutes bought with shells. */
export const TOP_UPS: Record<MinutesKind, { seconds: number; shells: number }> = {
  call: { seconds: 10 * MIN, shells: 120 },
  voice: { seconds: 10 * MIN, shells: 100 },
};

/** Bought minutes last this long. */
export const PACK_DAYS = 90;

const DAY = 86_400_000;
const at = (iso: string) => Date.parse(iso);
const iso = (ms: number) => new Date(ms).toISOString();

/** A new subscription starting now: the trial, or a paid plan. */
export function startSubscription(plan: PlanId, now: number, trial = false): Subscription {
  const start = iso(now);
  return {
    plan: trial ? TRIAL.plan : plan,
    status: trial ? 'trial' : 'active',
    termStart: start,
    willRenew: true,
    usage: { periodStart: start, callSeconds: 0, voiceSeconds: 0 },
  };
}

/** When the current term (the trial, or one paid month, quarter or year) ends. */
export function termEnd(sub: Subscription): number {
  const days = sub.status === 'trial' ? TRIAL.days : PLANS[sub.plan].termDays;
  return at(sub.termStart) + days * DAY;
}

/**
 * The subscription as the store has it at `now`: a finished trial turns into the
 * paid plan, a finished term renews, and one set not to renew ends. The caller
 * saves the result.
 */
export function rollSubscription(sub: Subscription | undefined, now: number): Subscription | undefined {
  let next = sub;
  // A device left closed for years still settles in a bounded number of steps.
  for (let step = 0; next && step < 400 && now >= termEnd(next); step += 1) {
    if (!next.willRenew) return undefined;
    const start = iso(termEnd(next));
    next = { ...next, status: 'active', termStart: start, usage: { periodStart: start, callSeconds: 0, voiceSeconds: 0 } };
  }
  return next;
}

/** The minutes period `now` falls in: the whole trial, or a 30- or 90-day slice of the term. */
export function periodOf(sub: Subscription, now: number): { start: number; end: number } {
  const start = at(sub.termStart);
  const end = termEnd(sub);
  if (sub.status === 'trial') return { start, end };
  const length = PLANS[sub.plan].periodDays * DAY;
  const index = Math.max(0, Math.floor((now - start) / length));
  const periodStart = start + index * length;
  return { start: periodStart, end: Math.min(end, periodStart + length) };
}

/** One period's allowance. */
export function allowance(sub: Subscription, kind: MinutesKind): number {
  const spec = sub.status === 'trial' ? TRIAL : PLANS[sub.plan];
  return kind === 'call' ? spec.callSeconds : spec.voiceSeconds;
}

function usedThisPeriod(sub: Subscription, kind: MinutesKind, now: number): number {
  if (at(sub.usage.periodStart) !== periodOf(sub, now).start) return 0;
  return kind === 'call' ? sub.usage.callSeconds : sub.usage.voiceSeconds;
}

export const packExpiresAt = (pack: MinutePack) => at(pack.boughtAt) + PACK_DAYS * DAY;

/** A pack that still has minutes and has not expired. */
export const packAlive = (pack: MinutePack, now: number) => now < packExpiresAt(pack) && pack.used < pack.seconds;

export interface MinutesLeft {
  /** Left from the plan this period */
  plan: number;
  /** The plan's allowance this period (0 without a plan) */
  planTotal: number;
  /** Left in bought packs */
  packs: number;
  total: number;
  /** When the plan's minutes come back; null without a plan */
  resetsAt: number | null;
}

/** Seconds left of one kind: the plan's first, then the packs'. */
export function minutesLeft(
  sub: Subscription | undefined,
  packs: readonly MinutePack[] | undefined,
  kind: MinutesKind,
  now: number,
): MinutesLeft {
  const fromPacks = (packs ?? [])
    .filter((p) => p.kind === kind && packAlive(p, now))
    .reduce((sum, p) => sum + p.seconds - p.used, 0);
  const live = rollSubscription(sub, now);
  if (!live) return { plan: 0, planTotal: 0, packs: fromPacks, total: fromPacks, resetsAt: null };
  const planTotal = allowance(live, kind);
  const plan = Math.max(0, planTotal - usedThisPeriod(live, kind, now));
  return { plan, planTotal, packs: fromPacks, total: plan + fromPacks, resetsAt: periodOf(live, now).end };
}

/**
 * Takes `seconds` of one kind: the plan's minutes first, then the oldest packs.
 * Returns the new subscription and packs, and how much could be taken.
 */
export function consumeMinutes(
  sub: Subscription | undefined,
  packs: readonly MinutePack[] | undefined,
  kind: MinutesKind,
  seconds: number,
  now: number,
): { subscription: Subscription | undefined; packs: MinutePack[]; taken: number } {
  let rest = Math.max(0, Math.round(seconds));
  let taken = 0;
  let subscription = rollSubscription(sub, now);

  if (subscription && rest > 0) {
    const { start } = periodOf(subscription, now);
    const usage =
      at(subscription.usage.periodStart) === start
        ? subscription.usage
        : { periodStart: iso(start), callSeconds: 0, voiceSeconds: 0 };
    const used = kind === 'call' ? usage.callSeconds : usage.voiceSeconds;
    const fromPlan = Math.min(rest, Math.max(0, allowance(subscription, kind) - used));
    subscription = {
      ...subscription,
      usage: kind === 'call' ? { ...usage, callSeconds: used + fromPlan } : { ...usage, voiceSeconds: used + fromPlan },
    };
    rest -= fromPlan;
    taken += fromPlan;
  }

  // Packs are kept oldest first, so the ones closest to expiring go first.
  const next = (packs ?? []).map((pack) => {
    if (rest <= 0 || pack.kind !== kind || !packAlive(pack, now)) return pack;
    const take = Math.min(rest, pack.seconds - pack.used);
    rest -= take;
    taken += take;
    return { ...pack, used: pack.used + take };
  });

  return { subscription, packs: next.filter((pack) => packAlive(pack, now)), taken };
}

/** What the user is on right now, for labels: the plan, a trial, or nothing. */
export function planStatus(sub: Subscription | undefined, now: number) {
  const live = rollSubscription(sub, now);
  if (!live) return null;
  return { plan: live.plan, trial: live.status === 'trial', renewsAt: termEnd(live), willRenew: live.willRenew };
}
