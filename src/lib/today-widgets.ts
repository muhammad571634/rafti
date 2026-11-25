import { nextAlarmAt } from './alarms';
import { planStart } from './schedule';
import type { Alarm, CallRecord, DailyState, ScheduleItem, Wallet } from '../types';

/**
 * The pure picks and contextual deep-links behind Today's widgets: what each one shows at a given
 * moment, when that changes by itself (a plan starts, an alarm rings, a missed call ages out, a
 * relative timestamp ticks), and the exact contextual screen + friend each tap opens (Apple HIG
 * Widgets: "Targeted Deep Links" + "Timeline Entry Relevance").
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
/** A missed call stays on the Calls widget for a day, unless a later call with that friend settles it. */
export const MISSED_CALL_MS = 24 * HOUR;

/** The earliest of several moments; undefined when there is none. */
export function earliest(...moments: (number | undefined)[]): number | undefined {
  const due = moments.filter((m): m is number => m != null && Number.isFinite(m));
  return due.length ? Math.min(...due) : undefined;
}

/**
 * When a relative timestamp ("Just now", "5m ago", "2h ago") next changes its text: every minute
 * in the first hour, every hour in the first day, and never after that.
 */
export function nextRelativeWakeAt(iso: string | undefined, now: number): number | undefined {
  if (!iso) return undefined;
  const at = Date.parse(iso);
  if (!Number.isFinite(at) || at > now) return undefined;
  const age = now - at;
  if (age < HOUR) return now + (MINUTE - (age % MINUTE));
  if (age < MISSED_CALL_MS) return now + (HOUR - (age % HOUR));
  return undefined;
}

/**
 * The coming plans, nearest first: today's untimed ones and timed ones still ahead, then later
 * days. `changesAt` is when the first timed plan of today starts and so leaves the list.
 */
export function upcomingPlans<T extends Pick<ScheduleItem, 'date' | 'time'>>(
  plans: readonly T[],
  today: string,
  now: number,
): { plans: T[]; changesAt?: number } {
  const ahead = plans
    .filter((p) => (p.date === today ? !p.time || planStart(p).getTime() > now : p.date > today))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  const starts = ahead.filter((p) => p.date === today && p.time).map((p) => planStart(p).getTime());
  return { plans: ahead, changesAt: earliest(...starts) };
}

/**
 * Alarms that are on, the next to ring first. `changesAt` is that ring: after it, the alarm's next
 * ring moves on and the order can change.
 */
export function alarmsInOrder<T extends Pick<Alarm, 'enabled' | 'hour' | 'minute' | 'repeat'>>(
  alarms: readonly T[],
  now: number,
): { alarms: T[]; changesAt?: number } {
  const ringing = alarms
    .filter((a) => a.enabled)
    .map((a) => ({ a, at: nextAlarmAt(a, new Date(now)).getTime() }))
    .sort((x, y) => x.at - y.at);
  return { alarms: ringing.map((r) => r.a), changesAt: ringing[0]?.at };
}

/**
 * The friend whose last call was theirs and went unanswered, within the last day: the Calls widget
 * offers to call them back. Any later call with that friend, either way, settles it. `changesAt` is
 * when it gets too old to show.
 */
export function missedCall(
  calls: readonly Pick<CallRecord, 'characterId' | 'startedAt' | 'direction' | 'missed'>[],
  now: number,
): { call?: (typeof calls)[number]; changesAt?: number } {
  const newestFirst = [...calls].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  const seen = new Set<string>();
  for (const call of newestFirst) {
    if (seen.has(call.characterId)) continue;
    seen.add(call.characterId);
    const at = Date.parse(call.startedAt);
    if (!(now - at < MISSED_CALL_MS)) break;
    if (call.direction === 'incoming' && call.missed && at <= now) return { call, changesAt: at + MISSED_CALL_MS };
  }
  return {};
}

/** Today's free shells still in the wallet; they go at midnight (`src/economy/shells.ts`). */
export function freeShellsLeft(wallet: Pick<Wallet, 'free'>, today: string): number {
  const free = wallet.free;
  return free && free.day >= today ? Math.max(0, free.amount) : 0;
}

export interface ActiveDateInput {
  characterId: string;
  placeId: string;
  theme?: { title: string };
  live?: { title: string };
}

export type DateWidgetState<P extends Pick<ScheduleItem, 'characterId' | 'date' | 'time' | 'title'>> =
  | {
      mode: 'activeDate';
      characterId: string;
      placeId: string;
      customTitle?: string;
      changesAt?: number;
    }
  | {
      mode: 'plan';
      plan: P;
      nextPlan?: P;
      changesAt?: number;
    }
  | {
      mode: 'empty';
      partnerId?: string;
      changesAt?: undefined;
    };

/**
 * Resolves the Date / Plans widget chain:
 * 1. An unfinished active date leads and resumes `/date/[placeId]?characterId=...`.
 * 2. Otherwise the nearest upcoming calendar plan leads and deep-links to `/(tabs)/us` on that exact friend & day.
 * 3. Otherwise empty, pre-selecting `heroId` for `/dating` and new plans.
 */
export function resolveDateWidget<P extends Pick<ScheduleItem, 'characterId' | 'date' | 'time' | 'title'>>(input: {
  activeDate?: ActiveDateInput | null;
  schedules: readonly P[];
  today: string;
  now: number;
  heroId?: string;
  hasCharacter: (id: string) => boolean;
}): DateWidgetState<P> {
  const validPlans = input.schedules.filter((p) => input.hasCharacter(p.characterId));
  const coming = upcomingPlans(validPlans, input.today, input.now);
  if (input.activeDate && input.hasCharacter(input.activeDate.characterId)) {
    return {
      mode: 'activeDate',
      characterId: input.activeDate.characterId,
      placeId: input.activeDate.placeId,
      customTitle: input.activeDate.live?.title ?? input.activeDate.theme?.title,
      changesAt: coming.changesAt,
    };
  }
  const [plan, nextPlan] = coming.plans;
  if (plan) {
    return {
      mode: 'plan',
      plan,
      nextPlan,
      changesAt: coming.changesAt,
    };
  }
  return {
    mode: 'empty',
    partnerId: input.heroId && input.hasCharacter(input.heroId) ? input.heroId : undefined,
  };
}

export type SleepWidgetState<A extends Pick<Alarm, 'id' | 'enabled' | 'hour' | 'minute' | 'repeat' | 'label' | 'characterId'>> =
  | {
      mode: 'alarm';
      alarm: A;
      later: A[];
      targetRoute: '/alarms';
      addFriendId?: string;
      changesAt?: number;
    }
  | {
      mode: 'empty';
      targetRoute: '/bedtime';
      partnerId?: string;
      addFriendId?: string;
      changesAt?: undefined;
    };

/**
 * Resolves the Sleep / Wake-up widget chain:
 * - An enabled alarm opens `/alarms` (where that alarm leads at the top with its switch and editor),
 *   and `+` pre-selects the alarm's waker (or `heroId`).
 * - When no alarm is enabled, tapping opens `/bedtime` pre-selected with `heroId`, and `+` opens
 *   `/alarms/edit` pre-selected with `heroId`.
 */
export function resolveSleepWidget<
  A extends Pick<Alarm, 'id' | 'enabled' | 'hour' | 'minute' | 'repeat' | 'label' | 'characterId'>,
>(input: {
  alarms: readonly A[];
  now: number;
  heroId?: string;
  hasCharacter: (id: string) => boolean;
}): SleepWidgetState<A> {
  const valid = input.alarms.filter((a) => !a.characterId || input.hasCharacter(a.characterId));
  const ordered = alarmsInOrder(valid, input.now);
  const hero = input.heroId && input.hasCharacter(input.heroId) ? input.heroId : undefined;
  const [alarm, ...later] = ordered.alarms;
  if (alarm) {
    return {
      mode: 'alarm',
      alarm,
      later,
      targetRoute: '/alarms',
      addFriendId: alarm.characterId ?? hero,
      changesAt: ordered.changesAt,
    };
  }
  return {
    mode: 'empty',
    targetRoute: '/bedtime',
    partnerId: hero,
    addFriendId: hero,
  };
}

export type GiftsWidgetAction = 'spin' | 'checkIn' | 'firstStep' | 'none';

/**
 * Unifies all three reward sources (free daily spin, daily check-in, and completed First Steps) so
 * Today's Gifts widget and Today's More badge always agree 100%.
 */
export function resolveGiftsAction(input: {
  daily: Pick<DailyState, 'spinDay' | 'spinsUsed'>;
  today: string;
  checkInClaimed: boolean;
  stepReady: boolean;
  freeSpinsPerDay?: number;
}): GiftsWidgetAction {
  const limit = input.freeSpinsPerDay ?? 1;
  const spinReady = input.daily.spinDay !== input.today || input.daily.spinsUsed < limit;
  if (spinReady) return 'spin';
  if (!input.checkInClaimed) return 'checkIn';
  if (input.stepReady) return 'firstStep';
  return 'none';
}
