import type { SetupOffer } from '@/types';

/**
 * Setting things up from the chat (0z136): "wake me at 7", "put our coffee on Saturday on the plans".
 * The model answers in its own words and adds a `setup` field; the chat shows a card under its
 * reply and one tap makes the real alarm or plan (`answerSetup` in the store). Nothing is made
 * without that tap, so a wrong guess costs nothing. Same reply, same call: no extra model work.
 */
export const SETUP_RULES_LINES = [
  'SETTING THINGS UP: you can set a real alarm that wakes them with your voice, or put a plan with you on your shared plans in the app.',
  '- Only when they ask you to (wake me, remind me, put it on our plans) or clearly say yes to your offer; never on your own.',
  '- Add to the same JSON a "setup" field: {"kind":"alarm|plan","title":"a few words in their language","date":"YYYY-MM-DD","time":"HH:MM","repeat":[]}. Date and time on their clock (IT IS NOW). "repeat": weekdays for an alarm that repeats, 0 = Sunday; empty = once. A plan may leave "time" out.',
  '- They confirm it with one tap on a card under your reply, so say in your own words that you will do it; do not say it is already done.',
  '- If the day or the hour is unclear, ask first and leave "setup" out. One per reply; leave it out when nothing is asked.',
];

const TITLE_MAX = 40;
const KINDS: readonly SetupOffer['kind'][] = ['alarm', 'plan'];

const dayOk = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`)) && new Date(`${s}T12:00:00Z`).toISOString().startsWith(s);
const timeOk = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/**
 * The model's `setup` field, or undefined; anything malformed is dropped, never guessed. An alarm
 * needs a time; a plan without a day is dropped. The server and the app both run it.
 */
export function cleanSetup(value: unknown): SetupOffer | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  const kind = KINDS.find((k) => k === v.kind);
  const title = typeof v.title === 'string' ? v.title.trim().replace(/\s+/g, ' ').slice(0, TITLE_MAX) : '';
  const date = typeof v.date === 'string' ? v.date.trim() : '';
  const rawTime = typeof v.time === 'string' ? v.time.trim() : '';
  // "7:00" is read as "07:00".
  const time = /^\d:\d{2}$/.test(rawTime) ? `0${rawTime}` : rawTime;
  if (!kind || !dayOk(date)) return undefined;
  if (time && !timeOk(time)) return undefined;
  if (kind === 'alarm' && !time) return undefined;
  if (kind === 'plan' && !title) return undefined;
  const repeat =
    kind === 'alarm' && Array.isArray(v.repeat)
      ? [...new Set(v.repeat.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
      : [];
  return {
    kind,
    title,
    date,
    ...(time ? { time } : {}),
    ...(kind === 'alarm' ? { repeat } : {}),
  };
}

const dayKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Whether the offer can still be made, on the phone's clock: a plan whose moment is past is not
 * ("today at 7" tapped at 9). A one-time alarm rings at the next time its hour comes round, so its
 * day must be that one (an alarm "on Monday, once" is not something an alarm can hold). A repeating
 * alarm always can.
 */
export function setupUsable(offer: SetupOffer, now: Date): boolean {
  const [hh, mm] = (offer.time ?? '23:59').split(':').map(Number);
  if (offer.kind === 'alarm') {
    if (offer.repeat?.length) return true;
    const ring = new Date(now);
    ring.setHours(hh, mm, 0, 0);
    if (ring.getTime() <= now.getTime()) ring.setDate(ring.getDate() + 1);
    return dayKeyOf(ring) === offer.date;
  }
  const [y, m, d] = offer.date.split('-').map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime() >= now.getTime();
}
