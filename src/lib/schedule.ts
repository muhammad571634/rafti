import { dateFromKey, dayKeyFromToday } from '@/mock/time';
import type { ScheduleItem } from '@/types';

export interface DetectedPlan {
  title: string;
  /** Day key the plan falls on */
  date: string;
  /** "HH:MM" when the message named a time */
  time?: string;
  /** The time phrase as the user said it, e.g. "tomorrow", "on Friday" */
  when: string;
}

/** The character texts this long before a timed plan starts. */
export const REMIND_BEFORE_MIN = 10;
/** A timed plan is taken to be over this long after it starts. */
const PLAN_LENGTH_MIN = 120;
/** Plans without a time: a morning reminder and an evening "how did it go?". */
const UNTIMED_REMIND_HOUR = 8;
const UNTIMED_FOLLOW_UP_HOUR = 20;
/** Asking about a plan days later sounds odd, so a late follow-up is dropped. */
const FOLLOW_UP_WINDOW_MS = 36 * 3_600_000;

const pad = (n: number) => String(n).padStart(2, '0');

function at(dateKey: string, hours: number, minutes = 0) {
  const d = dateFromKey(dateKey);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/** When the plan starts; a plan without a time starts with the day. */
export function planStart(item: Pick<ScheduleItem, 'date' | 'time'>) {
  if (!item.time) return at(item.date, 0);
  const [h, m] = item.time.split(':').map(Number);
  return at(item.date, h, m);
}

export function reminderAt(item: Pick<ScheduleItem, 'date' | 'time'>) {
  if (!item.time) return at(item.date, UNTIMED_REMIND_HOUR);
  return new Date(planStart(item).getTime() - REMIND_BEFORE_MIN * 60_000);
}

export function followUpAt(item: Pick<ScheduleItem, 'date' | 'time'>) {
  if (!item.time) return at(item.date, UNTIMED_FOLLOW_UP_HOUR);
  return new Date(planStart(item).getTime() + PLAN_LENGTH_MIN * 60_000);
}

export type PlanStep = 'remind' | 'followUp' | 'skipRemind' | 'skipFollowUp' | null;

/**
 * What a plan needs right now. A reminder only goes out between its moment and
 * the start (a plan added after that moment was already acknowledged in chat);
 * a follow-up only inside its window.
 */
export function planStep(item: ScheduleItem, now = new Date()): PlanStep {
  const t = now.getTime();
  if (!item.reminded) {
    const remind = reminderAt(item).getTime();
    const end = item.time ? planStart(item).getTime() : followUpAt(item).getTime();
    if (t >= remind) {
      const addedLate = new Date(item.createdAt).getTime() > remind;
      return t < end && !addedLate ? 'remind' : 'skipRemind';
    }
    return null;
  }
  if (!item.followedUp) {
    const follow = followUpAt(item).getTime();
    if (t >= follow) return t - follow < FOLLOW_UP_WINDOW_MS ? 'followUp' : 'skipFollowUp';
  }
  return null;
}

/** "3pm", "at 15:30", "at 7" (an hour from 1 to 7 alone reads as the afternoon). */
function findTime(lower: string): { time: string; phrase: string } | null {
  let m = lower.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/);
  if (m) {
    let h = Number(m[1]) % 12;
    if (m[3].startsWith('p')) h += 12;
    const min = Number(m[2] ?? 0);
    if (Number(m[1]) > 12 || min > 59) return null;
    return { time: `${pad(h)}:${pad(min)}`, phrase: m[0] };
  }
  m = lower.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m) return { time: `${pad(Number(m[1]))}:${m[2]}`, phrase: m[0] };
  m = lower.match(/\bat\s+(\d{1,2})\b/);
  if (m) {
    let h = Number(m[1]);
    if (h > 23) return null;
    if (h >= 1 && h <= 7) h += 12;
    return { time: `${pad(h)}:00`, phrase: m[0] };
  }
  return null;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Only first-person plans count — "what are you doing tomorrow?" is not a schedule. */
const LEAD_IN =
  /^\s*(?:and\s+|so\s+|well\s+)?(?:i have|i've got|i got|i'm going to|i am going to|i'm going|i am going|i'll|i will|i need to|i have to|i must|we have|we're going to|we're going|my)\b\s*/i;

const FILLER_START = /^(?:to|a|an|the|my|our)\s+/i;
const FILLER_END = /\s+(?:is|are|at|on|in|will be|coming up)$/i;

function findWhen(lower: string, now: Date): { offset: number; phrase: string; when: string } | null {
  let m = lower.match(/\bday after tomorrow\b/);
  if (m) return { offset: 2, phrase: m[0], when: 'the day after tomorrow' };

  m = lower.match(/\b(tonight|today|this evening)\b/);
  if (m) return { offset: 0, phrase: m[0], when: m[1] };

  m = lower.match(/\b(tomorrow|tmrw|tmr)\b/);
  if (m) return { offset: 1, phrase: m[0], when: 'tomorrow' };

  m = lower.match(/\bnext week\b/);
  if (m) return { offset: 7, phrase: m[0], when: 'next week' };

  m = lower.match(/\bin (\d{1,2}) days?\b/);
  if (m) return { offset: Number(m[1]), phrase: m[0], when: m[0] };

  m = lower.match(/\b(?:on |this |next )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (m) {
    const target = WEEKDAYS.indexOf(m[1]);
    let diff = (target - now.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    const day = m[1][0].toUpperCase() + m[1].slice(1);
    return { offset: diff, phrase: m[0], when: `on ${day}` };
  }

  return null;
}

/**
 * "I have an exam tomorrow" -> { title: "Exam", when: "tomorrow" }.
 * Stands in for the model's structured extraction of the reference app's
 * "Smart Auto Schedule Creation".
 */
export function detectPlan(text: string, now = new Date()): DetectedPlan | null {
  const sentence = text.trim();
  if (!LEAD_IN.test(sentence)) return null;

  const lower = sentence.toLowerCase();
  const clock = findTime(lower);
  let found = findWhen(lower, now);
  // "I have a meeting at 5pm": today, or tomorrow once that time has passed.
  if (!found && clock) {
    const [h, m] = clock.time.split(':').map(Number);
    const passed = now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
    found = passed ? { offset: 1, phrase: '', when: 'tomorrow' } : { offset: 0, phrase: '', when: 'today' };
  }
  if (!found) return null;

  let title = sentence
    .replace(found.phrase ? new RegExp(escape(found.phrase), 'i') : '', ' ')
    .replace(clock ? new RegExp(escape(clock.phrase), 'i') : '', ' ')
    .replace(LEAD_IN, '')
    .replace(/[!?.,~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (let i = 0; i < 3; i += 1) {
    title = title.replace(FILLER_START, '').replace(FILLER_END, '').trim();
  }

  if (title.length < 3) return null;
  if (title.length > 40) title = `${title.slice(0, 39).trim()}…`;

  return {
    title: title[0].toUpperCase() + title.slice(1),
    date: dayKeyFromToday(found.offset),
    time: clock?.time,
    when: clock ? `${found.when} at ${clock.time}` : found.when,
  };
}
