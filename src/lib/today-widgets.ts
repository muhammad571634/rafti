import { nextAlarmAt } from './alarms';
import { planStart } from './schedule';
import type { Alarm, CallRecord, ScheduleItem, Wallet } from '../types';

/**
 * The pure picks behind Today's widgets: what each one shows at a given moment and when that
 * changes by itself (a plan starts, an alarm rings, a missed call gets old). A widget re-renders at
 * that moment instead of waiting for something else to touch the store (HIG Widgets: "prefer
 * dynamic information that changes throughout the day").
 */

const HOUR = 60 * 60 * 1000;
/** A missed call stays on the Calls widget for a day, unless a later call with that friend settles it. */
export const MISSED_CALL_MS = 24 * HOUR;

/** The earliest of several moments; undefined when there is none. */
export function earliest(...moments: (number | undefined)[]): number | undefined {
  const due = moments.filter((m): m is number => m != null && Number.isFinite(m));
  return due.length ? Math.min(...due) : undefined;
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
