import type { Alarm, AlarmSound } from '@/types';

/** The melodies in the Sound picker, in order. */
export const ALARM_SOUNDS: AlarmSound[] = ['morningTide', 'shellChimes', 'seaBreeze', 'softBells', 'lighthouse'];

/** Snooze length, as on the iPhone. */
export const SNOOZE_MIN = 9;
/** How many days of a repeating alarm are handed to the OS at once (re-synced on every open). */
export const SCHEDULE_DAYS = 7;

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

/** The next time the alarm rings after `now` (local time). */
export function nextAlarmAt(alarm: Pick<Alarm, 'hour' | 'minute' | 'repeat'>, now: Date): Date {
  for (let offset = 0; offset <= 7; offset += 1) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, alarm.hour, alarm.minute, 0, 0);
    if (at.getTime() <= now.getTime()) continue;
    if (alarm.repeat.length === 0 || alarm.repeat.includes(at.getDay())) return at;
  }
  // Unreachable for a valid alarm; tomorrow at the time keeps callers safe.
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, alarm.hour, alarm.minute, 0, 0);
}

/**
 * Whether the alarm rings on that day (YYYY-MM-DD, local): a repeating one on its weekdays, a
 * one-time one on the day of its next ring. Us lists a friend's wake-ups on the day they ring.
 */
export function ringsOnDay(alarm: Pick<Alarm, 'hour' | 'minute' | 'repeat' | 'enabled'>, day: string, now: Date): boolean {
  if (!alarm.enabled) return false;
  const [y, m, d] = day.split('-').map(Number);
  if (alarm.repeat.length) return alarm.repeat.includes(new Date(y, m - 1, d).getDay());
  const next = nextAlarmAt(alarm, now);
  return next.getFullYear() === y && next.getMonth() === m - 1 && next.getDate() === d;
}

/** Every ring within the next `days` days: one for a one-time alarm, up to `days` for a repeating one. */
export function ringsWithin(alarm: Pick<Alarm, 'hour' | 'minute' | 'repeat'>, now: Date, days = SCHEDULE_DAYS): Date[] {
  if (alarm.repeat.length === 0) return [nextAlarmAt(alarm, now)];
  const end = now.getTime() + days * 86_400_000;
  const rings: Date[] = [];
  let at = nextAlarmAt(alarm, now);
  while (at.getTime() <= end) {
    rings.push(at);
    at = nextAlarmAt(alarm, at);
  }
  return rings;
}

/** How the Repeat row reads: a named set, or the days themselves (as day numbers). */
export function repeatKind(repeat: number[]): 'never' | 'everyDay' | 'weekdays' | 'weekends' | 'days' {
  const days = [...new Set(repeat)].sort();
  if (days.length === 0) return 'never';
  if (days.length === 7) return 'everyDay';
  if (days.join() === WEEKDAYS.join()) return 'weekdays';
  if (days.join() === WEEKEND.join()) return 'weekends';
  return 'days';
}

/** A ring counts as due for this long after its minute (the app was busy or just opened). */
const DUE_WINDOW_MS = 2 * 60_000;

/**
 * Today's ring when it is due right now: its minute has come in the last two minutes, today is
 * one of its days, and it was not armed after that minute (saving at 7:00:30 does not ring 7:00).
 */
export function dueRing(alarm: Pick<Alarm, 'hour' | 'minute' | 'repeat' | 'armedAt'>, now: Date): Date | null {
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), alarm.hour, alarm.minute, 0, 0);
  const late = now.getTime() - at.getTime();
  if (late < 0 || late > DUE_WINDOW_MS) return null;
  if (alarm.repeat.length > 0 && !alarm.repeat.includes(at.getDay())) return null;
  if (alarm.armedAt && Date.parse(alarm.armedAt) >= at.getTime()) return null;
  return at;
}
