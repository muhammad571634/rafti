import type { ChatClock, Together } from '../ai/together-prompt';
import type { Alarm, ScheduleItem } from '../types';

/**
 * What a reply sends about the user's world (0z135): their clock, and what they set up with this
 * friend in the app. Pure, so the same picks feed the chat and the call.
 */

/** The phone's clock for a reply: now and the offset from UTC (Tashkent: 300). */
export function chatClock(now: Date = new Date()): ChatClock {
  return { now: now.toISOString(), utcOffsetMin: -now.getTimezoneOffset() };
}

/** The day before a day key ("2026-11-07" -> "2026-11-06"), at noon so no clock change moves it. */
function dayBefore(today: string) {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * The plans with this friend from yesterday on (yesterday's, so they can still ask how it went),
 * soonest first, a handful; and the alarms that are on and that this friend wakes the user with.
 */
export function togetherWith(
  state: { schedules: readonly Pick<ScheduleItem, 'characterId' | 'title' | 'date' | 'time'>[]; alarms: readonly Pick<Alarm, 'characterId' | 'enabled' | 'hour' | 'minute' | 'repeat' | 'label'>[] },
  characterId: string,
  today: string,
): Together | undefined {
  const from = dayBefore(today);
  const plans = state.schedules
    .filter((p) => p.characterId === characterId && p.date >= from)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
    .slice(0, 6)
    .map((p) => ({ title: p.title, date: p.date, ...(p.time ? { time: p.time } : {}) }));
  const wakes = state.alarms
    .filter((a) => a.enabled && a.characterId === characterId)
    .slice(0, 4)
    .map((a) => ({ hour: a.hour, minute: a.minute, repeat: [...a.repeat], ...(a.label ? { label: a.label } : {}) }));
  return plans.length || wakes.length ? { plans, wakes } : undefined;
}
