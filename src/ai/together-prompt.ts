/**
 * What a friend knows about the user's world in this moment, beyond the chat (0z135): what time it
 * is where the user is, and what the two of them set up together in the app (plans from Us' +,
 * alarms this friend wakes them with). Before this, a plan made on Us reached the friend only as
 * the one line they said when it was added, and a chat reply had no clock at all, so a friend could
 * not tell morning from night or remember tomorrow's coffee once the line scrolled away.
 *
 * Pure: the app builds `ChatClock` and `Together`, the server cleans them (`cleanClock`,
 * `cleanTogether`) and the prompt turns them into lines (`clockLines`, `togetherLines`).
 */

/** The user's clock: now (ISO, UTC) and their offset from UTC in minutes (Tashkent: 300). */
export interface ChatClock {
  now: string;
  utcOffsetMin: number;
}

/** A plan made together; `date` is the user's day key ("2026-11-08"), `time` their clock ("18:30"). */
export interface TogetherPlan {
  title: string;
  date: string;
  time?: string;
}

/** An alarm this friend wakes the user with; `repeat` holds weekdays, 0 = Sunday; empty = once. */
export interface TogetherWake {
  hour: number;
  minute: number;
  repeat: number[];
  label?: string;
}

export interface Together {
  plans: TogetherPlan[];
  wakes: TogetherWake[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const pad = (n: number) => String(n).padStart(2, '0');
const MAX_PLANS = 6;
const MAX_WAKES = 4;
const MAX_TITLE = 120;

/** The part of the day a person would name for this hour. */
export function dayPart(hour: number) {
  return hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 22 ? 'evening' : 'night';
}

/** "UTC+05:00". */
const offsetLabel = (min: number) => `UTC${min < 0 ? '-' : '+'}${pad(Math.floor(Math.abs(min) / 60))}:${pad(Math.abs(min) % 60)}`;

/** "IT IS NOW: Saturday 2026-11-07 18:20 where they are (UTC+05:00, evening)." */
export function clockLines(clock?: ChatClock): string[] {
  if (!clock) return [];
  const local = new Date(Date.parse(clock.now) + clock.utcOffsetMin * 60_000);
  if (Number.isNaN(local.getTime())) return [];
  const hour = local.getUTCHours();
  const stamp = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ${pad(hour)}:${pad(local.getUTCMinutes())}`;
  return [
    `IT IS NOW: ${DAYS[local.getUTCDay()]} ${stamp} where they are (${offsetLabel(clock.utcOffsetMin)}, ${dayPart(hour)}). Live in this time like a person: the hour, the day of the week. Write any time you give in this same clock.`,
  ];
}

/** "Sun 2026-11-08". */
const dayOf = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? date : `${SHORT[d.getUTCDay()]} ${date}`;
};

/** "on weekdays", "every day", "on Sat and Sun", "once". */
function repeatLabel(repeat: readonly number[]) {
  const days = [...new Set(repeat)].filter((d) => d >= 0 && d <= 6).sort();
  if (!days.length) return 'once, the next time that hour comes';
  if (days.length === 7) return 'every day';
  if (days.join() === '1,2,3,4,5') return 'on weekdays';
  if (days.join() === '0,6') return 'on weekends';
  return `on ${days.map((d) => SHORT[d]).join(', ')}`;
}

/**
 * When a wake-up rings next on the user's clock, as minutes from the local midnight of `local`'s
 * day (a clock whose UTC fields are the user's wall time); null if it never rings again.
 */
export function nextRing(w: Pick<TogetherWake, 'hour' | 'minute' | 'repeat'>, local: Date): number | null {
  const nowMin = local.getUTCHours() * 60 + local.getUTCMinutes();
  const at = w.hour * 60 + w.minute;
  for (let d = 0; d <= 7; d++) {
    const weekday = (local.getUTCDay() + d) % 7;
    if (w.repeat.length && !w.repeat.includes(weekday)) continue;
    if (d === 0 && at <= nowMin) continue;
    return d * 1440 + at;
  }
  return null;
}

/** "today 22:10", "tomorrow 07:24", "Mon 2026-11-09 07:00". */
function ringLabel(minutes: number, local: Date) {
  const days = Math.floor(minutes / 1440);
  const time = `${pad(Math.floor((minutes % 1440) / 60))}:${pad(minutes % 60)}`;
  if (days === 0) return `today ${time}`;
  if (days === 1) return `tomorrow ${time}`;
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + days, 12));
  return `${dayOf(d.toISOString().slice(0, 10))} ${time}`;
}

/**
 * The plans and wake-ups the two of them set up in the app, so the friend remembers them like
 * anything else they agreed on: brings them up before and after, never reads them out as a list.
 * With the clock, each wake-up says when it rings next and the soonest one is named, so a friend
 * with two alarms (07:24 and 22:10) names the right one.
 */
export function togetherLines(together?: Together, clock?: ChatClock): string[] {
  const plans = together?.plans ?? [];
  const wakes = together?.wakes ?? [];
  if (!plans.length && !wakes.length) return [];
  const local = clock ? new Date(Date.parse(clock.now) + clock.utcOffsetMin * 60_000) : undefined;
  const nowLocal = local && !Number.isNaN(local.getTime()) ? local.toISOString().slice(0, 16).replace('T', ' ') : undefined;
  const passed = (p: TogetherPlan) => !!nowLocal && `${p.date} ${p.time ?? '23:59'}` < nowLocal;
  const rings = wakes.map((w) => (local && nowLocal ? nextRing(w, local) : null));
  const soonest = rings.reduce<number | null>((min, r) => (r !== null && (min === null || r < min) ? r : min), null);
  const when = (i: number) => {
    const r = rings[i];
    if (r === null || !local) return '';
    return `; next rings ${ringLabel(r, local)}${wakes.length > 1 && r === soonest ? ' (the next of your wake-ups)' : ''}`;
  };
  return [
    'WHAT YOU SET UP TOGETHER IN THE APP (you both know this; remember it like anything you agreed on, bring it up when it fits, before it or after, never as a list):',
    ...plans.map((p) => `- Plan: ${dayOf(p.date)}${p.time ? ` ${p.time}` : ' (no set time)'}: "${p.title}"${passed(p) ? ' (already passed; you may ask how it went)' : ''}`),
    ...wakes.map((w, i) => `- You wake them up at ${pad(w.hour)}:${pad(w.minute)} ${repeatLabel(w.repeat)}${w.label ? ` ("${w.label}")` : ''}${when(i)}.`),
  ];
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isDayKey = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const isClock = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/** The server's check of what the app sent: a real time and an offset within ±14 hours, else none. */
export function cleanClock(value: unknown): ChatClock | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { now, utcOffsetMin } = value as Record<string, unknown>;
  if (typeof now !== 'string' || Number.isNaN(Date.parse(now))) return undefined;
  if (typeof utcOffsetMin !== 'number' || !Number.isInteger(utcOffsetMin) || Math.abs(utcOffsetMin) > 14 * 60) return undefined;
  return { now: new Date(Date.parse(now)).toISOString(), utcOffsetMin };
}

/** The server's check of the plans and wake-ups: well-formed, short, a handful at most. */
export function cleanTogether(value: unknown): Together | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { plans, wakes } = value as Record<string, unknown>;
  const cleanPlans = (Array.isArray(plans) ? plans : [])
    .map((p) => {
      const r = (p ?? {}) as Record<string, unknown>;
      const title = str(r.title, MAX_TITLE);
      const date = str(r.date, 10);
      const time = str(r.time, 5);
      return title && isDayKey(date) ? { title, date, ...(isClock(time) ? { time } : {}) } : null;
    })
    .filter((p): p is TogetherPlan => !!p)
    .slice(0, MAX_PLANS);
  const cleanWakes = (Array.isArray(wakes) ? wakes : [])
    .map((w) => {
      const r = (w ?? {}) as Record<string, unknown>;
      const hour = r.hour;
      const minute = r.minute;
      if (!Number.isInteger(hour) || !Number.isInteger(minute) || (hour as number) < 0 || (hour as number) > 23 || (minute as number) < 0 || (minute as number) > 59) return null;
      const repeat = (Array.isArray(r.repeat) ? r.repeat : []).filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6);
      const label = str(r.label, 40);
      return { hour: hour as number, minute: minute as number, repeat, ...(label ? { label } : {}) };
    })
    .filter((w): w is TogetherWake => !!w)
    .slice(0, MAX_WAKES);
  return cleanPlans.length || cleanWakes.length ? { plans: cleanPlans, wakes: cleanWakes } : undefined;
}
