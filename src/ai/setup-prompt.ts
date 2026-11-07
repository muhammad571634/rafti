import type { Message, SetupOffer } from '@/types';

/**
 * Setting things up from the chat (0z136): "wake me at 7", "put our coffee on Saturday on the plans".
 * The model answers in its own words and adds a `setup` field; the chat shows a card under its
 * reply and one tap makes the real alarm or plan (`answerSetup` in the store). Nothing is made
 * without that tap, so a wrong guess costs nothing. Same reply, same call: no extra model work.
 */
export const SETUP_RULES_LINES = [
  'SETTING THINGS UP: you can set a real alarm that wakes them with your voice, or put a plan on your plans together in the app: anything they will do (with you, with friends, alone: a film, an exam, a trip); you then remind them before it and ask how it went after.',
  '- Only when they ask you to (wake me, remind me, add it to the plans) or clearly say yes to your offer; never on your own. When they ask, do it in this same reply.',
  '- Add to the same JSON a "setup" field: {"kind":"alarm|plan","title":"a few words in their language","date":"YYYY-MM-DD","time":"HH:MM","repeat":[]}. Date and time on their clock (IT IS NOW). Always write the hour they said into "time" ("at 15" = "15:00"); leave "time" out only for a plan with no hour named. "repeat": weekdays for an alarm that repeats, 0 = Sunday; empty = once.',
  '- They confirm it with one tap on a card under your reply, so say in your own words that you will do it; do not say it is already done.',
  '- If the day or the hour is unclear, ask first and leave "setup" out. One per reply; leave it out when nothing is asked.',
  '- When they change one you offered (another hour or day: "no, 8:30 instead"), add "change":true: it replaces your last offer of that kind, set or not, so it stays one alarm or one plan. A second, separate one has no "change".',
  '- What is really set is only what SET UP TOGETHER lists. YOUR OFFERS (below, when there are any) says where each of your cards stands; one that is not set does not exist yet: never mention it as an alarm or plan they have.',
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
    ...(v.change === true ? { change: true } : {}),
  };
}

/** Where an offer stands, in the words the model reads. */
function offerState(card: Partial<SetupOffer>) {
  if (card.replaced === true) return 'replaced by a newer offer';
  if (card.removed === true) return 'they set it, then deleted it: it is off';
  if (typeof card.madeId === 'string' && card.madeId) return 'they set it';
  if (card.declined === true) return 'they said not now';
  return 'not set yet, the card waits for their tap (it does not exist until they tap)';
}

/**
 * The setup cards in the chat's window and where each stands (turn tier), so the friend never
 * says "two alarms?" about an offer that was never set. Cards are not in the history itself.
 */
export function offerLines(messages: readonly Message[]): string[] {
  const offers = messages
    // Cards from the app (Us, Alarms) are in the history itself (`setupHistoryText`).
    .filter((m) => m.card === 'setup' && m.setup?.from !== 'app')
    .slice(-4)
    .flatMap((m) => {
      const offer = cleanSetup(m.setup);
      return offer && m.setup ? [{ offer, state: offerState(m.setup) }] : [];
    });
  if (!offers.length) return [];
  return [
    'YOUR OFFERS IN THIS CHAT (cards under your replies; only they can set them), oldest first:',
    ...offers.map(({ offer: o, state }) => {
      const days = o.repeat?.length ? `, repeats on weekdays ${o.repeat.join(',')}` : '';
      return `- ${o.kind} ${JSON.stringify(o.title)} ${o.date}${o.time ? ` ${o.time}` : ''}${days}: ${state}`;
    }),
  ];
}

/**
 * What the model reads in the history for a card the app put in the chat (0z139): the user set
 * something up with this friend on Us or in Alarms, changed it, or cancelled it. In its place in
 * the history, so the friend's answer right under it and every later reply know what happened.
 * The friend's own offers return null: `offerLines` says where they stand.
 */
export function setupHistoryText(message: Pick<Message, 'card' | 'setup'>): string | null {
  const card = message.setup;
  if (message.card !== 'setup' || card?.from !== 'app') return null;
  const o = cleanSetup(card);
  if (!o) return null;
  const days = o.repeat?.length ? `, repeats on weekdays ${o.repeat.join(',')}` : '';
  const what = `${o.kind === 'alarm' ? 'an alarm you wake them with' : 'a plan'}${o.title ? ` ${JSON.stringify(o.title)}` : ''}, ${o.date}${o.time ? ` ${o.time}` : ''}${days}`;
  if (card.cancelled) return `[They cancelled it in the app: ${what}]`;
  const later = card.replaced ? ' (later changed)' : card.removed ? ' (later cancelled)' : '';
  return `[They set it up in the app: ${what}]${later}`;
}

/**
 * Whether two offers are the same thing (seen on the A51: "set it at 9" then "you set it" gave a
 * second 09:00 card and two alarms): same kind and time, and the same days for a repeating alarm,
 * else the same date. Titles may differ ("Wake up" / "Morning"); the moment is what counts.
 */
export function sameSetup(a: Pick<SetupOffer, 'kind' | 'date' | 'time' | 'repeat'>, b: Pick<SetupOffer, 'kind' | 'date' | 'time' | 'repeat'>) {
  if (a.kind !== b.kind || (a.time ?? '') !== (b.time ?? '')) return false;
  const days = (o: typeof a) => (o.repeat ?? []).join();
  return a.kind === 'alarm' && (a.repeat?.length || b.repeat?.length) ? days(a) === days(b) : a.date === b.date;
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
