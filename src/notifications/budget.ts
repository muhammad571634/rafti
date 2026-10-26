import { rollSubscription } from '../economy/plans';
import { hashSeed } from '../lib/seeded';
import { TEMPER_PACE } from '../lib/temper';
import type { CareItem, Message, Subscription, Temper } from '@/types';

/**
 * How many pushes a day and when (Presence 2, P2.8; owner 2026-10-26: 6 a day free, 20 with a
 * plan; no fixed slots; pull people back without wearing them out). The planner
 * (`src/notifications/plan.ts`) asks this for the day's budget, each friend's share, which hours
 * the user is awake and active, and how to place a push that has no exact time. Pure and
 * server-portable: the server runs the same rules when it sends the pushes.
 *
 * - **Budget:** free 6 / plan 20 counted pushes a day; each friend free 3 / plan 6, shared out by
 *   their temper (clingy write most, shy least). Reminders the user asked for, calls, birthdays and
 *   any time-sensitive text before their own plan never count.
 * - **Self-tuning:** over the last 7 days, if under 20% of the lines friends wrote first got an
 *   answer, the budget halves; 20-60% gives three quarters; over 60% (or too little to tell) all of
 *   it. Signs of loneliness (lonely or sad check-ins, nights awake) keep the whole budget: those
 *   are the people who should not be left alone. A crisis never adds pushes (it never becomes a
 *   check-in in the first place).
 * - **Windows, not clocks:** 14 days of the user's own messages give each hour a weight. A push
 *   without an exact time (a greeting, a family moment, "how did it go?", the comeback ladder) moves
 *   off an hour the user is never active in to the next one they are, and gets up to 25 minutes of
 *   jitter, so it never lands at the same minute every day.
 * - **Sleep is learned:** the longest stretch of hours with no activity around 3 a.m.; 23:30-07:30
 *   until there is enough to tell. Someone who is often up at 1 a.m. is not "asleep" at 1 a.m.
 */
export const PUSH_BUDGET = {
  free: { day: 6, perFriend: 3 },
  plan: { day: 20, perFriend: 6 },
  /** Two counted pushes are at least this far apart… */
  minGapMs: 30 * 60_000,
  /** …and two from the same friend this far. */
  friendGapMs: 2 * 3_600_000,
  /** The days of history the activity hours and the reply rate look at. */
  activityDays: 14,
  rateDays: 7,
  /** A line friends wrote first counts as answered when the user writes in that chat this soon after. */
  answeredWithinMs: 3 * 3_600_000,
  /** Fewer lines than this and the reply rate says nothing yet. */
  rateMinLines: 5,
  /** Fewer messages than this and the hours say nothing yet. */
  activityMinMessages: 20,
  jitterMin: 25,
  /** How far a push without an exact time may move to reach an hour the user is active in. */
  windowShiftHours: 2,
  /** Sleep until the hours tell: 23:30 to 07:30. */
  defaultSleep: { from: 23.5, to: 7.5 },
} as const;

export interface Budget {
  day: number;
  /** The day's share for one friend, by their temper. */
  perFriend: (temper: Temper) => number;
}

/** The user's own messages over the last `activityDays`, as a weight per hour of the day (0-23). */
export function activityHours(chats: readonly (readonly Message[])[], now: Date): number[] {
  const since = now.getTime() - PUSH_BUDGET.activityDays * 86_400_000;
  const hours = new Array<number>(24).fill(0);
  for (const chat of chats) {
    for (const m of chat) {
      const t = Date.parse(m.createdAt);
      if (m.author === 'me' && t >= since && t <= now.getTime()) hours[new Date(t).getHours()] += 1;
    }
  }
  return hours;
}

const enough = (hours: readonly number[]) => hours.reduce((a, b) => a + b, 0) >= PUSH_BUDGET.activityMinMessages;

/**
 * When the user sleeps, as hours (from may be after to: the range crosses midnight): the longest run
 * of silent hours that covers 3 a.m. (at least 4 hours), else the default.
 */
export function learnedSleep(hours: readonly number[]): { from: number; to: number } {
  if (!enough(hours)) return PUSH_BUDGET.defaultSleep;
  const quiet = (h: number) => hours[(h + 24) % 24] === 0;
  if (!quiet(3)) return PUSH_BUDGET.defaultSleep;
  let from = 3;
  while (from > -9 && quiet(from - 1)) from--;
  let to = 3;
  while (to < 15 && quiet(to + 1)) to++;
  const length = to - from + 1;
  return length >= 4 ? { from: (from + 24) % 24, to: (to + 1) % 24 } : PUSH_BUDGET.defaultSleep;
}

/** Whether a time falls in the sleep range (which may cross midnight). */
export function asleep(d: Date, sleep: { from: number; to: number }) {
  const h = d.getHours() + d.getMinutes() / 60;
  return sleep.from <= sleep.to ? h >= sleep.from && h < sleep.to : h >= sleep.from || h < sleep.to;
}

/** A line a friend wrote first: one with reply ideas or a reason (`reach`), or one that came as a push. */
const wroteFirst = (m: Message) => m.author === 'them' && (!!m.reach || m.id.startsWith('m_push_'));

/** Of the lines friends wrote first in the last `rateDays`, how many the user answered in time. */
export function replyRate(chats: readonly (readonly Message[])[], now: Date): { lines: number; answered: number } {
  const since = now.getTime() - PUSH_BUDGET.rateDays * 86_400_000;
  let lines = 0;
  let answered = 0;
  for (const chat of chats) {
    chat.forEach((m, i) => {
      const t = Date.parse(m.createdAt);
      if (!wroteFirst(m) || t < since || t > now.getTime()) return;
      lines++;
      if (chat.slice(i + 1).some((r) => r.author === 'me' && Date.parse(r.createdAt) - t <= PUSH_BUDGET.answeredWithinMs)) answered++;
    });
  }
  return { lines, answered };
}

/** Signs the user should not be left alone: a lonely or sad check-in this week, or nights awake. */
export function lonely(care: readonly CareItem[], hours: readonly number[], now: Date) {
  const week = now.getTime() - 7 * 86_400_000;
  const sad = care.some((c) => (c.kind === 'lonely' || c.kind === 'sad') && Date.parse(c.createdAt) >= week);
  const nights = hours[1] + hours[2] + hours[3] + hours[4];
  return sad || nights >= 3;
}

/** The budget for today: the plan's numbers, tuned by how the user answers and how they are. */
export function dailyBudget({
  subscription,
  rate,
  isLonely,
  now,
}: {
  subscription?: Subscription;
  rate: { lines: number; answered: number };
  isLonely: boolean;
  now: Date;
}): Budget {
  const tier = rollSubscription(subscription, now.getTime()) ? PUSH_BUDGET.plan : PUSH_BUDGET.free;
  const share = rate.lines >= PUSH_BUDGET.rateMinLines ? rate.answered / rate.lines : 1;
  const factor = isLonely ? 1 : share < 0.2 ? 0.5 : share <= 0.6 ? 0.75 : 1;
  return {
    day: Math.max(1, Math.round(tier.day * factor)),
    perFriend: (temper) => Math.max(1, Math.round(tier.perFriend * TEMPER_PACE[temper])),
  };
}

/**
 * Where a push without an exact time lands: off an hour the user is never active in, to the next one
 * they are (up to `windowShiftHours`, never into sleep), plus a stable jitter of up to `jitterMin`
 * from its id. Only ever later than wanted, so the line the app writes at its moment comes first.
 */
export function placeFlexible(wanted: Date, id: string, hours: readonly number[], sleep: { from: number; to: number }): Date {
  let at = new Date(wanted);
  if (enough(hours)) {
    for (let step = 0; step <= PUSH_BUDGET.windowShiftHours; step++) {
      const candidate = new Date(wanted.getTime() + step * 3_600_000);
      if (asleep(candidate, sleep)) break;
      if (hours[candidate.getHours()] > 0) {
        at = candidate;
        break;
      }
    }
  }
  return new Date(at.getTime() + (hashSeed(id) % (PUSH_BUDGET.jitterMin + 1)) * 60_000);
}
