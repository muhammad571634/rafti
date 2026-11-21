import type { NextKind } from '@/types';

import { part, type PromptPart } from './prompt-layout';

/**
 * The next moment (0z283; the owner's pick from docs/polybuzz-core.md §5.2): after a reply, one
 * thing worth doing together that the talk itself leads to: a call, a date, a quiz, truth or dare,
 * a page of the user's diary, a secret note, falling asleep together, a photo. PolyBuzz's server
 * picks a feature after each turn by counting rounds; ours is picked by the friend, in their own
 * words, only when it flows from what was just said, and only from what the app says is open now
 * (`nextChoices`). The reply's last bubble then carries one button that opens it.
 *
 * Rare on purpose: never in the first lines of a chat, then at most one per chat in `GAP_MS` and
 * `GAP_LINES` of the user's, the same kind not again within `KIND_REST_MS`, never in a scene, a
 * group, a call or near a crisis, never one the user cannot open (a call without minutes, a date
 * that is still locked). A paywall never hides behind it. The model adds a `next` field to the
 * reply it already writes: no extra call. Built once for every character, in every language.
 */

export const NEXT_KINDS: readonly NextKind[] = ['call', 'date', 'quiz', 'truthOrDare', 'diary', 'secretNote', 'bedtime', 'photo'];

/** What each moment is, for the model. */
const WHAT: Record<NextKind, string> = {
  call: 'a voice call with you, now',
  date: 'you ask them out on a date at a place in the app (not just "come over")',
  quiz: 'a quiz about each other',
  truthOrDare: 'a game of truth or dare',
  diary: 'they write today in their diary (their day, how they feel)',
  secretNote: 'they write you a sealed secret note',
  bedtime: 'falling asleep together, your voice beside them',
  photo: 'they show you a photo of what they are talking about',
};

/** The user's own lines a chat needs before the first one. */
export const FIRST_AFTER_LINES = 6;
/** Between two in one chat: this long, and this many lines of the user's. */
export const GAP_MS = 6 * 3_600_000;
export const GAP_LINES = 8;
/** The same kind is not offered again in a chat for this long. */
export const KIND_REST_MS = 3 * 24 * 3_600_000;
/** A crisis card within this many lines: nothing is offered. */
const CRISIS_LINES = 20;

export const NEXT_RULES_LINES = [
  'NEXT MOMENT: below, NEXT MOMENT OPEN lists what you may invite them to now: one of those things, if and only if it follows naturally from the last lines (they are bored: a game; they talk about their day: their diary; they cannot sleep at night: falling asleep together; they describe something they see: a photo; you want to hear their voice: a call).',
  '- Say it in your own words inside your messages, as a person would ("wanna call?", "show me!"), and add "next":"<one key from the list>" to the same JSON: the key of exactly what your words invite (truth or dare is truthOrDare, never another game). A button under your reply then opens it.',
  '- Most replies have none. Never two in a row, never when they are busy with something else, never as a sales line. When they are upset, only a call, to be there for them, never a game or a feature. Leave it out whenever the list is missing or nothing fits.',
];

/** This turn's open moments, near the end where the model looks last. */
export const nextTurnLine = (kinds: readonly NextKind[]) =>
  `NEXT MOMENT OPEN (only if it truly fits now; usually leave "next" out): ${kinds.map((k) => `${k} = ${WHAT[k]}`).join('; ')}.`;

/**
 * The rule and the turn's list, texting only, and only on a turn with something open: that is rare
 * (`nextChoices`), so the rule rides on those turns instead of on every reply's cached rules.
 */
export const nextParts = (mode: string | undefined, kinds: readonly NextKind[] | undefined): PromptPart[] => {
  const on = (!mode || mode === 'chat') && !!kinds?.length;
  return [part('nextNow', 'turn', on ? [...NEXT_RULES_LINES, nextTurnLine(kinds!)] : [])];
};

/**
 * The model's `next` field, or undefined: a known key, and one the turn offered when `open` is
 * given (the model may not invent a moment the app did not open). Server and app both run it.
 */
export function cleanNext(value: unknown, open?: readonly NextKind[]): NextKind | undefined {
  if (typeof value !== 'string') return undefined;
  const kind = NEXT_KINDS.find((k) => k.toLowerCase() === value.trim().toLowerCase());
  if (!kind) return undefined;
  return !open || open.includes(kind) ? kind : undefined;
}

/** The lines of one chat, as much as `nextChoices` reads of them. */
export interface NextLine {
  author: 'me' | 'them';
  kind: string;
  card?: string;
  next?: NextKind;
  createdAt: string;
}

export interface NextContext {
  now: Date;
  /** A scene runs in this chat: the story leads, nothing else is offered. */
  inScene: boolean;
  /** A call can be placed now (a plan with calls, or minutes left). */
  canCall: boolean;
  /** A date place is open at this friend's level. */
  dateOpen: boolean;
}

const userLine = (m: NextLine) => m.author === 'me' && m.kind !== 'system' && m.kind !== 'call' && !m.card;

/** The moments open in this chat right now (none most of the time). Pure, so `node --test` can load it. */
export function nextChoices(lines: readonly NextLine[], ctx: NextContext): NextKind[] {
  if (ctx.inScene) return [];
  if (lines.slice(-CRISIS_LINES).some((m) => m.card === 'helpline')) return [];
  if (lines.filter(userLine).length < FIRST_AFTER_LINES) return [];
  const now = ctx.now.getTime();
  const lastAt = lines.findLastIndex((m) => m.author === 'them' && !!m.next);
  if (lastAt >= 0) {
    const last = lines[lastAt];
    if (now - Date.parse(last.createdAt) < GAP_MS) return [];
    if (lines.slice(lastAt + 1).filter(userLine).length < GAP_LINES) return [];
  }
  const rested = new Set(lines.filter((m) => m.author === 'them' && m.next && now - Date.parse(m.createdAt) < KIND_REST_MS).map((m) => m.next));
  const hour = ctx.now.getHours();
  const night = hour >= 21 || hour < 3;
  return NEXT_KINDS.filter((k) => {
    if (rested.has(k)) return false;
    if (k === 'call') return ctx.canCall;
    if (k === 'date') return ctx.dateOpen;
    if (k === 'bedtime') return night;
    return true;
  });
}
