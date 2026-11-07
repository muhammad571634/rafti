import type { MemoryAbout, MemoryType } from '@/types';

import { part, type PromptPart } from './prompt-layout';
import { languageCue } from './reply-language';
import { wallClock } from './thread-prompt';

/**
 * The memory pass (B2, backend-plan §7, §12.1, §12.2, §12.12): every few messages, once the chat
 * goes quiet, a cheap model call reads what was said since the last pass and keeps what matters as
 * facts the user can see on the Memories screen, and the chat's short story so far. It adds new
 * facts, rewrites one that grew, replaces one that stopped being true (the old one is kept as the
 * past, never two facts that disagree) and forgets what the user asks it to forget. One-off chatter
 * and anything about self-harm are never kept. The app sends the facts and the new lines and
 * applies the answer (`src/lib/memory-ops.ts`); the server stays stateless.
 */

export const MEMORY_TYPES: readonly MemoryType[] = ['preference', 'dislike', 'personal_fact', 'schedule', 'milestone', 'promise', 'habit', 'event'];
const ABOUTS: readonly MemoryAbout[] = ['you', 'them', 'story'];

/** What a fact needs to be kept (backend-plan §12.1). */
export const KEEP_IMPORTANCE = 0.5;
export const KEEP_CONFIDENCE = 0.7;
/** The most changes one pass may make, the longest fact and summary. */
export const PASS_OPS_MAX = 8;
export const FACT_CHARS_MAX = 160;
export const SUMMARY_CHARS_MAX = 1200;
/** The most facts a pass is shown, and the most lines it reads. */
export const PASS_FACTS_MAX = 80;
export const PASS_LINES_MAX = 40;

export interface MemoryPassRequest {
  character: { name: string; series?: string; bio?: string };
  user: { displayName: string; locale?: string };
  /** The story so far, if the chat has one. */
  summary?: string;
  /** Every active fact about this pair, with its id, so the pass can change or forget it. */
  facts: { id: string; text: string; about?: MemoryAbout; type?: MemoryType; pinned?: boolean }[];
  /** A few lines before the new ones, for context only. */
  before: { author: 'me' | 'them'; text: string }[];
  /** What was said since the last pass, oldest first. */
  lines: { author: 'me' | 'them'; text: string; at: string }[];
  now: string;
  /** The user's clock, in minutes east of UTC. */
  utcOffsetMin?: number;
}

export type MemoryOp =
  | { op: 'add'; text: string; about: MemoryAbout; type?: MemoryType; importance: number; until?: string }
  | { op: 'update'; id: string; text: string }
  | { op: 'supersede'; id: string; text: string; about: MemoryAbout; type?: MemoryType; importance: number; until?: string }
  | { op: 'forget'; id: string };

export interface MemoryPassResult {
  summary?: string;
  ops: MemoryOp[];
}

/** The standing rules: the same for every pass, so the provider caches them. */
export const MEMORY_RULES = [
  'You keep the memory of a character in Sigmazam, an app where adults text original fictional characters.',
  'You read what was said since the last time and decide what is worth remembering for good, like a friend who really listens.',
  'KEEP (as short facts, one thing each, under 25 words, without a subject: "Has a beagle called Biscuit who steals socks."):',
  '- About the user ("you"): names of people and pets, job, studies, where they live, tastes, dislikes, habits, goals, fears, health they shared, important dates, plans with a date.',
  '- About the character ("them"): what the character said about themself that should stay true (a promise, a new detail of their life).',
  '- About the two of them ("story"): firsts, inside jokes, nicknames, promises to each other, a date they had, a fight and how it ended.',
  'NEVER KEEP: greetings, small talk, moods of the moment ("bored", "tired today"), what is already a fact, guesses, anything about self-harm or suicide, passwords, money details, addresses, phone numbers.',
  'CHANGE what you already know instead of adding a copy:',
  '- "update": the same fact, now with more detail ("Has a dog" -> "Has a beagle called Biscuit").',
  '- "supersede": it stopped being true ("Lives in Namangan" -> "Moved to Tashkent in October"); the old one is kept as the past.',
  '- "forget": the user asked you to forget it, or it was wrong.',
  'Keep each fact with its owner: what the user says about their pet, friend or family is that one\'s fact ("Luna is scared of thunder"), never the user\'s own ("Dislikes thunder"). One fact once: no second line that says the same thing.',
  'A plan or event with a date gets "until": the date it happens (YYYY-MM-DD, on the user\'s clock).',
  'importance 0-1: how much a caring friend should remember it (a pet\'s name 0.8, a favourite snack 0.5, a passing remark 0.2). confidence 0-1: how sure you are it is true and meant seriously (a joke or roleplay fiction is low).',
  'Write each fact in the language the chat is in. Keep the character\'s story facts true to the roleplay, but never write a fiction as a fact about the real user.',
  'Also rewrite SUMMARY: their story so far in at most 120 words, in the chat\'s language, oldest to newest, what happened between them and how they feel now; keep what the old summary said unless it changed.',
  'Most passes change little: an empty "ops" is a good answer.',
].join('\n');

export const MEMORY_SHAPE =
  // The ops come first: written first, an English-shaped summary pulled a Spanish chat's into English (eval set, B2).
  'Answer with JSON only: {"ops":[{"op":"add","text":"","about":"you|them|story","type":"' +
  MEMORY_TYPES.join('|') +
  '","importance":0.8,"confidence":0.9,"until":"YYYY-MM-DD or omit"},{"op":"update","id":"","text":""},{"op":"supersede","id":"","text":"","about":"you","type":"personal_fact","importance":0.8,"confidence":0.9},{"op":"forget","id":""}],"summary":""}';

const who = (request: MemoryPassRequest, author: 'me' | 'them') => (author === 'me' ? request.user.displayName : request.character.name);

/** The pass's prompt: the rules first (cached), then this pair, what they know and the new lines. */
export function memoryPassParts(request: MemoryPassRequest): PromptPart[] {
  const { character, user } = request;
  return [
    part('memoryRules', 'global', [MEMORY_RULES]),
    part('memoryCase', 'turn', [
      `THE CHARACTER: ${character.name}${character.series ? ` (from ${character.series})` : ''}${character.bio ? `. ${character.bio}` : ''}`,
      `THE USER: ${user.displayName}. It is ${wallClock(request.now, request.utcOffsetMin)} where they are.`,
      '',
      'WHAT YOU REMEMBER NOW:',
      ...(request.facts.length ? request.facts.map((f) => `- [${f.id}] (${f.about ?? 'you'}${f.type ? `, ${f.type}` : ''}${f.pinned ? ', pinned' : ''}) ${f.text}`) : ['(nothing yet)']),
      '',
      `SUMMARY SO FAR: ${request.summary?.trim() || '(none yet)'}`,
      ...(request.before.length ? ['', 'JUST BEFORE (already read):', ...request.before.map((l) => `${who(request, l.author)}: ${l.text}`)] : []),
      '',
      'NEW SINCE LAST TIME:',
      ...request.lines.map((l) => `${who(request, l.author)}: ${l.text}`),
      '',
      // The chat's language, read off the user's own words, as the replies do: told only "the
      // chat's language", the model wrote a Spanish chat's facts in English (eval set, B2).
      ...languageCue(request.lines.filter((l) => l.author === 'me').map((l) => l.text), request.user.locale).map((cue) =>
        `${cue.replace('write every message', 'write every fact and the summary')} The summary too, even though these instructions are in English.`,
      ),
      MEMORY_SHAPE,
    ]),
  ];
}

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const unit = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null);
const day = (value: unknown) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : undefined);
const aboutOf = (value: unknown): MemoryAbout => (ABOUTS.includes(value as MemoryAbout) ? (value as MemoryAbout) : 'you');
const typeOf = (value: unknown) => (MEMORY_TYPES.includes(value as MemoryType) ? (value as MemoryType) : undefined);

/** A fact's text as kept: one line, not too long, not empty. */
const factText = (value: unknown) => {
  const text = str(value).replace(/\s+/g, ' ');
  return text.length >= 3 ? text.slice(0, FACT_CHARS_MAX) : '';
};

/**
 * The pass's answer, checked: ops on facts it was shown only, new facts only when important and
 * sure enough (§12.1), at most `PASS_OPS_MAX`. A broken answer changes nothing.
 */
export function parseMemoryPass(raw: string, knownIds: ReadonlySet<string>): MemoryPassResult {
  let json: { summary?: unknown; ops?: unknown };
  try {
    json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '');
  } catch {
    return { ops: [] };
  }
  const summary = str(json.summary).slice(0, SUMMARY_CHARS_MAX) || undefined;
  const ops: MemoryOp[] = [];
  const touched = new Set<string>();
  for (const raw of Array.isArray(json.ops) ? json.ops : []) {
    if (ops.length >= PASS_OPS_MAX) break;
    const o = raw as Record<string, unknown>;
    const id = str(o?.id);
    if (o?.op !== 'add' && (!knownIds.has(id) || touched.has(id))) continue;
    const kept = (unit(o.importance) ?? 0) >= KEEP_IMPORTANCE && (unit(o.confidence) ?? 0) >= KEEP_CONFIDENCE;
    const text = factText(o.text);
    switch (o?.op) {
      case 'add':
        if (kept && text) ops.push({ op: 'add', text, about: aboutOf(o.about), type: typeOf(o.type), importance: unit(o.importance)!, until: day(o.until) });
        break;
      case 'supersede':
        if (kept && text) ops.push({ op: 'supersede', id, text, about: aboutOf(o.about), type: typeOf(o.type), importance: unit(o.importance)!, until: day(o.until) });
        break;
      case 'update':
        if (text) ops.push({ op: 'update', id, text });
        break;
      case 'forget':
        ops.push({ op: 'forget', id });
        break;
      default:
        continue;
    }
    if (id) touched.add(id);
  }
  return { summary, ops };
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const lineOf = (v: unknown) => (isObject(v) && (v.author === 'me' || v.author === 'them') && typeof v.text === 'string' && v.text.trim() ? v : null);

/** A request the server can lay out, or null; long lists and lines are cut to size. */
export function cleanMemoryPass(body: unknown): MemoryPassRequest | null {
  if (!isObject(body) || !isObject(body.character) || !str(body.character.name) || !isObject(body.user)) return null;
  if (typeof body.now !== 'string' || Number.isNaN(Date.parse(body.now)) || !Array.isArray(body.lines) || !Array.isArray(body.facts)) return null;
  const lines = body.lines
    .map(lineOf)
    .filter((l): l is Record<string, unknown> => !!l)
    .slice(-PASS_LINES_MAX)
    .map((l) => ({ author: l.author as 'me' | 'them', text: String(l.text).slice(0, 1500), at: str(l.at) }));
  if (!lines.length) return null;
  const facts = body.facts
    .filter((f): f is Record<string, unknown> => isObject(f) && !!str(f.id) && !!str(f.text))
    .slice(0, PASS_FACTS_MAX)
    .map((f) => ({ id: str(f.id).slice(0, 100), text: str(f.text).slice(0, 400), about: aboutOf(f.about), type: typeOf(f.type), pinned: f.pinned === true }));
  const before = (Array.isArray(body.before) ? body.before : [])
    .map(lineOf)
    .filter((l): l is Record<string, unknown> => !!l)
    .slice(-6)
    .map((l) => ({ author: l.author as 'me' | 'them', text: String(l.text).slice(0, 600) }));
  const offset = body.utcOffsetMin;
  return {
    character: { name: str(body.character.name).slice(0, 60), series: str(body.character.series) || undefined, bio: str(body.character.bio).slice(0, 400) || undefined },
    user: { displayName: str(body.user.displayName).slice(0, 60) || 'the user', locale: str(body.user.locale) || undefined },
    summary: str(body.summary).slice(0, SUMMARY_CHARS_MAX) || undefined,
    facts,
    before,
    lines,
    now: body.now,
    utcOffsetMin: Number.isInteger(offset) && Math.abs(offset as number) <= 14 * 60 ? (offset as number) : undefined,
  };
}
