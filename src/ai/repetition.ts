import type { Message } from '@/types';

import { messageText } from '../lib/story-continuity';

/**
 * The repetition guard (backend-plan §12.7: "it repeats itself" is the second most common complaint
 * in BIMOBIMO's reviews). Both layers read the chat the request already carries, so nothing is kept
 * for it on the server:
 * - before the reply: how their recent replies opened goes into the turn tier (`openerLines`), so
 *   this one starts somewhere new;
 * - after it: the reply is compared with their last `REPEAT_WINDOW` replies (`findRepeat`, the
 *   trigram similarity of Postgres' pg_trgm). At `REPEAT_THRESHOLD` or more the server asks once more
 *   with the echoed line named (`repeatCue`). That is rare, so it costs little.
 */

/** How many of their replies the guard reads. */
export const REPEAT_WINDOW = 30;
/** How many recent openers the prompt lists. */
export const OPENERS_MAX = 10;
/** The words that make an opener. */
export const OPENER_WORDS = 6;
/** A reply this similar to an earlier one is a repeat. */
export const REPEAT_THRESHOLD = 0.6;
/** Lines shorter than this never count: "haha" or "good night" may well come back. */
const MIN_WORDS = 5;

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean);
/** Lower case letters and digits only, for comparing. */
const normal = (text: string) => (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).join(' ');

/**
 * Their replies, oldest first, the newest `max`: each a run of their lines between two turns of the
 * user's (a time skip is the user's turn; a continue is not, as in `chatTurns`). Calls and pictures
 * are left out.
 */
export function theirReplies(messages: readonly Message[], max = REPEAT_WINDOW): string[][] {
  const replies: string[][] = [];
  let open = false;
  for (const message of messages) {
    const text = messageText(message);
    if (text === null) continue;
    if (message.author === 'me' || message.card === 'skip') {
      open = false;
      continue;
    }
    if (message.kind === 'call' || message.kind === 'image') continue;
    if (!open) replies.push([]);
    open = true;
    replies[replies.length - 1].push(text);
  }
  return replies.slice(-max);
}

/** How a reply starts: its first words, as written. */
export const openerOf = (reply: readonly string[]) => words(reply[0] ?? '').slice(0, OPENER_WORDS).join(' ');

/**
 * This reply's turn lines: the ways their recent replies opened (newest `OPENERS_MAX`, no repeats),
 * and a word that started most of the last five, if one did ("Haha", "Oh").
 */
export function openerLines(messages: readonly Message[]): string[] {
  const replies = theirReplies(messages);
  const seen = new Set<string>();
  const openers: string[] = [];
  for (const reply of [...replies].reverse()) {
    const opener = openerOf(reply);
    const key = normal(opener);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    openers.push(opener);
    if (openers.length === OPENERS_MAX) break;
  }
  if (!openers.length) return [];

  const counts = new Map<string, number>();
  for (const reply of replies.slice(-5)) {
    const first = normal(words(reply[0] ?? '')[0] ?? '').split(' ')[0];
    if (first) counts.set(first, (counts.get(first) ?? 0) + 1);
  }
  const tics = [...counts].filter(([, n]) => n >= 3).map(([word]) => `"${word}"`);
  return [
    'YOUR RECENT REPLIES OPENED WITH (start this one differently):',
    ...openers.reverse().map((opener) => `- "${opener}…"`),
    ...(tics.length ? [`- Lately you keep starting with ${tics.join(' or ')}: not this time.`] : []),
  ];
}

/** A text's trigrams as pg_trgm takes them: per word, lower case, padded as "  word ". */
function trigrams(text: string): Set<string> {
  const set = new Set<string>();
  for (const word of normal(text).split(' ').filter(Boolean)) {
    const chars = [...`  ${word} `];
    for (let i = 0; i + 3 <= chars.length; i++) set.add(chars.slice(i, i + 3).join(''));
  }
  return set;
}

/** pg_trgm's similarity: shared trigrams over all trigrams, 0 to 1. */
export function similarity(a: string, b: string): number {
  const x = trigrams(a);
  const y = trigrams(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  return shared / (x.size + y.size - shared);
}

export interface Repeat {
  /** How close it came, 0 to 1. */
  score: number;
  /** The earlier line it echoes. */
  line: string;
}

/**
 * The earlier line this reply echoes most, when it reaches `REPEAT_THRESHOLD`; else null. Each
 * bubble is held against each of their recent lines, and the whole reply against each whole reply,
 * so a line split into other bubbles is caught too. `also` adds lines that are not in the chat, such
 * as the versions a ↻ asked to replace.
 */
export function findRepeat(bubbles: readonly string[], messages: readonly Message[], also: readonly string[] = []): Repeat | null {
  const earlier = [...theirReplies(messages), ...also.map((line) => [line])];
  let best: Repeat | null = null;
  const hold = (text: string, line: string) => {
    if (words(text).length < MIN_WORDS || words(line).length < MIN_WORDS) return;
    const score = similarity(text, line);
    if (!best || score > best.score) best = { score, line };
  };
  const whole = bubbles.join(' ');
  for (const reply of earlier) {
    hold(whole, reply.join(' '));
    for (const bubble of bubbles) for (const line of reply) hold(bubble, line);
  }
  const found = best as Repeat | null;
  return found && found.score >= REPEAT_THRESHOLD ? found : null;
}

/** The second try's cue: the line the first draft echoed. */
export const repeatCue = (line: string) => [
  'DO NOT REPEAT YOURSELF: your first draft echoed something you already said in this chat:',
  `- "${line}"`,
  'Write a new reply: other words, another angle, something you have not said yet.',
];
