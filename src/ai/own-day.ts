import type { DayLog, DayNote } from '@/types';

import { part, type PromptPart } from './prompt-layout';

/** A time as the user's clock shows it ("2026-11-08 09:10"); the same as `wallClock` in thread-prompt, kept here so the two files do not import each other. */
const wallClock = (iso: string, utcOffsetMin: number) => new Date(Date.parse(iso) + utcOffsetMin * 60_000).toISOString().slice(0, 16).replace('T', ' ');

/**
 * The friend's own day (0z144, "characters feel human"): a person who texted at noon that they
 * overslept and burned the toast does not say at six that they had a calm morning at the gym.
 * Before, every reply made up the friend's day again from the persona and the hour, so a day drifted
 * as soon as its lines left the history window, and "how was your practice yesterday?" had nothing
 * behind it.
 *
 * Now the model writes down, in the same reply, each new thing it says about its own day (`day`
 * field, a few words each); the app keeps them per friend on the user's calendar (today and the last
 * day before it that had any), and every reply reads them back as true. No extra call: a few cached
 * rule lines, a short list in the turn, a few output tokens only when something new is said.
 */

export type { DayLog, DayNote };

/** What a reply sends: today's notes, and the last day before it that had any. */
export interface OwnDay {
  today: DayNote[];
  before?: { date: string; notes: string[] };
}

/** Notes kept for one day (the newest), and how many a reply may add. */
export const DAY_NOTES_MAX = 10;
const NEW_NOTES_MAX = 3;
const NOTE_CHARS = 80;

export const OWN_DAY_RULES_LINES = [
  'YOUR OWN DAY: between their messages you live a day of your own, on their clock (IT IS NOW), true to who you are and your world.',
  '- YOUR DAY SO FAR (when there is one) is what you already said about your day: it happened. Keep to it, build on it, never contradict it or tell it again as new. YOUR LAST DAY is what you told them about the day before: you may come back to it ("practice ran late yesterday").',
  '- Whenever this reply mentions anything of your own day that YOUR DAY SO FAR does not have yet (what you did, are doing now, or will do later today), even in passing, add to the same JSON a "day" field: a few words in English for each new thing, e.g. "day":["overslept, burned the toast","band practice at 20:00"]. Without it, you forget it by the next reply. Only your own life, never theirs; leave it out when nothing new about your day is said.',
];

const oneLine = (text: string) => text.trim().replace(/\s+/g, ' ');
const same = (a: string, b: string) => oneLine(a).toLowerCase() === oneLine(b).toLowerCase();
const wordsOf = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
/** A note says nothing new when each of its words is already in one note ("missed bus" in "overslept, missed the bus"). */
const told = (note: string, notes: readonly string[]) => {
  const words = wordsOf(note);
  return notes.some((n) => {
    const have = new Set(wordsOf(n));
    return words.length > 0 && words.every((w) => have.has(w));
  });
};

/** The notes that say something `known` does not (a note whose words are all in one known note is not new). */
export const newDayNotes = (notes: readonly string[], known: readonly string[]) => notes.filter((n) => !told(n, known));

/** The model's `day` field: a few short notes, or none. The server and the app both run it. */
export function cleanDayNotes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const notes: string[] = [];
  for (const v of value) {
    if (typeof v !== 'string') continue;
    const text = oneLine(v).slice(0, NOTE_CHARS);
    if (text && !notes.some((n) => same(n, text))) notes.push(text);
  }
  return notes.slice(0, NEW_NOTES_MAX);
}

/**
 * The friend's days with this reply's notes added under `date` (the user's day key): a note
 * already there is not added twice, a day keeps its newest `DAY_NOTES_MAX`, and only today and the
 * last earlier day stay.
 */
export function addDayNotes(logs: readonly DayLog[] | undefined, notes: readonly string[], at: Date, date: string): DayLog[] {
  const kept = (logs ?? []).filter((l) => l.date <= date);
  const today = kept.find((l) => l.date === date);
  const before = kept.filter((l) => l.date < date && l.notes.length).sort((a, b) => (a.date < b.date ? -1 : 1)).pop();
  const old = today?.notes ?? [];
  const fresh = notes.filter((n) => !told(n, old.map((o) => o.text))).map((text) => ({ at: at.toISOString(), text }));
  const todayNotes = [...old, ...fresh].slice(-DAY_NOTES_MAX);
  return [...(before ? [before] : []), ...(todayNotes.length ? [{ date, notes: todayNotes }] : [])];
}

/** What a reply sends of the friend's days, or undefined when there is nothing. */
export function ownDayOf(logs: readonly DayLog[] | undefined, date: string): OwnDay | undefined {
  const today = logs?.find((l) => l.date === date)?.notes ?? [];
  const before = (logs ?? []).filter((l) => l.date < date && l.notes.length).sort((a, b) => (a.date < b.date ? -1 : 1)).pop();
  if (!today.length && !before) return undefined;
  return { today, ...(before ? { before: { date: before.date, notes: before.notes.map((n) => n.text) } } : {}) };
}

const isDayKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** The server's check of what the app sent: well-formed, short, a day's worth at most. */
export function cleanOwnDay(value: unknown): OwnDay | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { today, before } = value as Record<string, unknown>;
  const notes = (Array.isArray(today) ? today : [])
    .map((n) => {
      const r = (n ?? {}) as Record<string, unknown>;
      const text = typeof r.text === 'string' ? oneLine(r.text).slice(0, NOTE_CHARS) : '';
      return text && typeof r.at === 'string' && !Number.isNaN(Date.parse(r.at)) ? { at: new Date(Date.parse(r.at)).toISOString(), text } : null;
    })
    .filter((n): n is DayNote => !!n)
    .slice(-DAY_NOTES_MAX);
  const b = (before ?? {}) as Record<string, unknown>;
  const beforeNotes = (Array.isArray(b.notes) ? b.notes : [])
    .filter((n): n is string => typeof n === 'string' && !!n.trim())
    .map((n) => oneLine(n).slice(0, NOTE_CHARS))
    .slice(-DAY_NOTES_MAX);
  const last = isDayKey(b.date) && beforeNotes.length ? { date: b.date, notes: beforeNotes } : undefined;
  return notes.length || last ? { today: notes, ...(last ? { before: last } : {}) } : undefined;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** "Yesterday" when the day is the one before `today`, else its weekday and date. */
function dayName(date: string, today: string | undefined) {
  const d = new Date(`${date}T12:00:00Z`);
  if (today) {
    const t = new Date(`${today}T12:00:00Z`);
    if (Math.round((t.getTime() - d.getTime()) / 86_400_000) === 1) return 'yesterday';
  }
  return `${WEEKDAYS[d.getUTCDay()]} ${date}`;
}

/** The friend's days for this reply: today's notes with their hour on the user's clock, then the last day. */
export function ownDayLines(day: OwnDay | undefined, clock?: { now: string; utcOffsetMin: number }): string[] {
  const offset = clock?.utcOffsetMin ?? 0;
  const today = clock ? wallClock(clock.now, offset).slice(0, 10) : undefined;
  return [
    ...(day?.today.length ? ['YOUR DAY SO FAR (you said these; they happened):', ...day.today.map((n) => `- ${wallClock(n.at, offset).slice(11)} ${n.text}`)] : []),
    ...(day?.before ? [`YOUR LAST DAY (${dayName(day.before.date, today)}): ${day.before.notes.join('; ')}.`] : []),
    // Near the end, where the model looks last: a rule only in the cached head was followed about half the time.
    'Anything new of your own day in this reply goes into "day".',
  ];
}

/** The parts of a reply's prompt that carry the friend's own day: the standing rule and the notes. */
export const ownDayParts = (day: OwnDay | undefined, clock?: { now: string; utcOffsetMin: number }): PromptPart[] => [
  part('ownDayRules', 'global', OWN_DAY_RULES_LINES),
  part('ownDay', 'turn', ownDayLines(day, clock)),
];
