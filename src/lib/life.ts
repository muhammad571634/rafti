import type { Message } from '@/types';

/**
 * Real life first (owner, 2026-10-26: help people off the endless scroll; research in
 * docs/digital-wellbeing.md). The rules for the moments a friend steps in for the user's life
 * away from the screen, inside the chat and in their own words: "it's late, sleep?", "a break?"
 * after a long sitting, a small real-life quest in the daytime, and the plan helpers (a nudge when
 * they are still home, an alarm before a big morning). The model writes every line; these numbers
 * only say when. Pure and server-portable.
 */
export const LIFE = {
  /** From 00:30 to 05:00 a friend says it is late (once a night). */
  nightFrom: 0.5,
  nightTo: 5,
  /** A sitting this long, with this many of the user's messages, earns "a break?" (once a day). */
  breakAfterMin: 40,
  breakAfterMessages: 25,
  /** Quests come in the daytime, once a day, after a few messages in this sitting. */
  questFromHour: 10,
  questToHour: 20,
  questAfterMessages: 3,
  /** "Did you do it?" this long after the offer. */
  questCheckMin: 180,
  /** "Still home": asked once more this soon. */
  hurryAfterMin: 10,
  /** "Wake me up": the alarm rings this long before the thing, never before 05:00. */
  wakeBeforeMin: 90,
  wakeEarliestHour: 5,
  /** A big plan starting before this ("HH:MM") gets "Wake me up" on its acknowledgement. */
  wakeOfferBefore: '09:30',
  /** A quiet gap this long ends a sitting. */
  sittingGapMs: 30 * 60_000,
} as const;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The night it is, keyed by the evening it began ("2026-10-26" from 00:30 to 05:00 on the 27th), or
 * null in the day: "it's late" goes once per night, not once per date.
 */
export function lateNight(now: Date): string | null {
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour < LIFE.nightFrom || hour >= LIFE.nightTo) return null;
  const evening = new Date(now);
  evening.setDate(evening.getDate() - 1);
  return `${evening.getFullYear()}-${pad(evening.getMonth() + 1)}-${pad(evening.getDate())}`;
}

/** How long the current sitting has lasted, in minutes: back to the last gap of `sittingGapMs`. */
export function sittingMinutes(messages: readonly Message[], now: number) {
  if (!messages.length) return 0;
  let start = Date.parse(messages[messages.length - 1].createdAt);
  for (let i = messages.length - 2; i >= 0; i--) {
    const at = Date.parse(messages[i].createdAt);
    if (start - at > LIFE.sittingGapMs) break;
    start = at;
  }
  return now - Date.parse(messages[messages.length - 1].createdAt) > LIFE.sittingGapMs ? 0 : Math.round((now - start) / 60_000);
}
