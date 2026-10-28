import { briefParts, type BriefInput } from './brief-prompt';
import { dayAskParts, type DayAskInput } from './day-prompt';
import { part, type PromptPart } from './prompt-layout';
import { FOLLOW_USER_LANGUAGE, languageCue, userLines } from './reply-language';
import { touchParts, type TouchInput } from './thread-prompt';
import { weekParts, type WeekInput } from './week-prompt';

/**
 * A text a friend writes first, unprompted (B1.4a): a thread's text, the morning brief, the evening
 * "how was today?" and the Sunday recap. Code picks who writes, when and about what (unchanged);
 * the model on the server writes the words. One request shape for all four, so the app and the
 * server share it; `now` travels as an ISO string.
 */
export type FirstTextKind = 'thread' | 'brief' | 'day' | 'week';

type Wire<T> = Omit<T, 'now'> & { now: string };

export type FirstTextRequest =
  | { kind: 'thread'; input: Wire<TouchInput> }
  | { kind: 'brief'; input: Wire<BriefInput> }
  | { kind: 'day'; input: Wire<DayAskInput> }
  | { kind: 'week'; input: Wire<WeekInput> };

export const FIRST_TEXT_KINDS: readonly FirstTextKind[] = ['thread', 'brief', 'day', 'week'];

/**
 * The prompt parts for one first text; every kind answers in the thread texts' shape
 * (`parseTouchReply`). Without a stored language lock, the user's own latest words in the chat say
 * which language (`languageCue`).
 */
export function firstTextParts(request: FirstTextRequest): PromptPart[] {
  const now = new Date(request.input.now);
  const lines = request.kind === 'day' ? request.input.today : request.kind === 'week' ? [] : request.input.recent;
  const cue = part('languageNow', 'turn', request.input.replyLanguage === FOLLOW_USER_LANGUAGE ? languageCue(userLines(lines)) : []);
  switch (request.kind) {
    case 'thread':
      return [...touchParts({ ...request.input, now }), cue];
    case 'brief':
      return [...briefParts({ ...request.input, now }), cue];
    case 'day':
      return [...dayAskParts({ ...request.input, now }), cue];
    case 'week':
      return weekParts({ ...request.input, now });
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** How many chat lines a first text may carry; the prompts use the last 12 to 16. */
const MAX_LINES = 40;

/**
 * A request the prompt code can lay out, or null. Only the shape is checked: the words come from
 * the user's own app, and a long chat is cut to its last lines.
 */
export function cleanFirstText(body: unknown): FirstTextRequest | null {
  if (!isObject(body) || !FIRST_TEXT_KINDS.includes(body.kind as FirstTextKind) || !isObject(body.input)) return null;
  const input = body.input;
  const character = input.character;
  if (!isObject(character) || typeof character.name !== 'string' || !character.name || !isObject(input.user)) return null;
  if (typeof input.now !== 'string' || Number.isNaN(Date.parse(input.now))) return null;
  // UTC+14 is the furthest any clock runs from UTC.
  const offset = input.utcOffsetMin;
  if (offset !== undefined && !(Number.isInteger(offset) && Math.abs(offset as number) <= 14 * 60)) delete input.utcOffsetMin;
  const lines = (key: string) => (Array.isArray(input[key]) ? { [key]: (input[key] as unknown[]).slice(-MAX_LINES) } : null);

  switch (body.kind as FirstTextKind) {
    case 'thread': {
      const recent = lines('recent');
      if (!recent || !isObject(input.thread) || typeof input.thread.about !== 'string' || !isObject(input.touch)) return null;
      return { kind: 'thread', input: { ...input, ...recent } as FirstTextRequest['input'] } as FirstTextRequest;
    }
    case 'brief': {
      const recent = lines('recent');
      if (!recent || !isObject(input.brief) || !Array.isArray(input.brief.items) || !input.brief.items.length) return null;
      return { kind: 'brief', input: { ...input, ...recent } as FirstTextRequest['input'] } as FirstTextRequest;
    }
    case 'day': {
      const today = lines('today');
      if (!today || !Array.isArray(input.threads)) return null;
      return { kind: 'day', input: { ...input, ...today } as FirstTextRequest['input'] } as FirstTextRequest;
    }
    case 'week': {
      const week = input.week;
      if (!isObject(week) || !Number.isFinite(week.days) || !Number.isFinite(week.messages) || !Array.isArray(week.wins)) return null;
      return { kind: 'week', input } as unknown as FirstTextRequest;
    }
  }
}
