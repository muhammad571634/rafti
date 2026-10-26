import { part, type PromptPart } from './prompt-layout';
import { characterParts } from './rules';
import { temperOf } from '../lib/temper';
import type { TouchDraft } from '../lib/threads';
import type { Character, Message, Relationship, Thread, ThreadOutcome, Touch, TouchPhase, User } from '@/types';

/**
 * The model's side of open threads (`src/lib/threads.ts`): no topic list and no wording on our
 * side. With every reply the model may open threads on anything the user said that has a future,
 * move them, or settle them (`THREAD_RULES_LINES` + `threadLines`, parsed by `parseThreadOps`). When
 * one of its texts is due, one call writes it in the character's own words from the chat and the
 * memories, with reply ideas, or skips it if the chat already settled it (`touchParts`,
 * `parseTouchReply`). Code only applies `THREAD_RULES` to what comes back.
 */

/** The standing instruction (global tier: the same for every chat, cached). */
export const THREAD_RULES_LINES = [
  'THREADS: you remember what the user tells you that has a future, and you come back to it like a real person texting.',
  '- Anything can be a thread, on any topic: an exam, a job interview, a report to finish, a fight, a trip, a doctor visit, results to wait for, something they want to start. Small talk with no future is not.',
  '- For each thread decide when you would text and why: before it (luck, "time to go"), after it ("how did it go?"), or to check on it ("did you finish?"). One to four texts, at times a caring person would pick for that thing, never at night unless it is happening then.',
  '- When the user says how it went or that it is off, settle the thread. When the time moves, move it.',
  'Add to the same JSON a "threads" field: {"add":[{"about":"few words","quote":"their words","happensAt":"ISO time or null","touches":[{"at":"ISO time","phase":"before|after|check","why":"your reason, own words"}]}],"move":[{"id":"","happensAt":"ISO","touches":[...]}],"close":[{"id":"","outcome":"good|bad|done|off"}]}. Leave it out when nothing changed.',
];

const when = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16).replace('T', ' ') : 'no set time');

/** The friend's open threads for this reply (turn tier), so the model can follow, move or settle them. */
export function threadLines(threads: readonly Thread[]) {
  const open = threads.filter((t) => t.status === 'open');
  if (!open.length) return [];
  return [
    'OPEN THREADS (what the user told you that has a future):',
    ...open.map((t) => {
      const next = t.touches.find((x) => !x.sent);
      return `- [${t.id}] ${t.about} (${when(t.happensAt)}); they said "${t.quote}"${next ? `; you plan to text at ${when(next.at)}: ${next.why}` : ''}`;
    }),
  ];
}

export interface ThreadOps {
  add: { about: string; quote: string; happensAt?: string; touches: TouchDraft[] }[];
  move: { id: string; happensAt?: string; touches: TouchDraft[] }[];
  close: { id: string; outcome: ThreadOutcome }[];
}

const PHASES: readonly TouchPhase[] = ['before', 'after', 'check'];
const OUTCOMES: readonly ThreadOutcome[] = ['good', 'bad', 'done', 'off'];

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const iso = (v: unknown) => {
  const s = str(v);
  return s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : undefined;
};
const drafts = (v: unknown): TouchDraft[] =>
  (Array.isArray(v) ? v : []).flatMap((x) => {
    const at = iso(x?.at);
    const phase = PHASES.find((p) => p === x?.phase);
    const why = str(x?.why);
    return at && phase && why ? [{ at, phase, why }] : [];
  });

/** The `threads` field of the model's JSON reply; anything malformed is dropped, never guessed. */
export function parseThreadOps(raw: string): ThreadOps {
  const empty: ThreadOps = { add: [], move: [], close: [] };
  let threads: Record<string, unknown> | undefined;
  try {
    threads = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}')?.threads;
  } catch {
    return empty;
  }
  if (!threads || typeof threads !== 'object') return empty;
  const list = (key: string) => (Array.isArray(threads![key]) ? (threads![key] as Record<string, unknown>[]) : []);
  return {
    add: list('add').flatMap((x) => {
      const about = str(x.about);
      return about ? [{ about: about.slice(0, 60), quote: str(x.quote).slice(0, 160), happensAt: iso(x.happensAt), touches: drafts(x.touches) }] : [];
    }),
    move: list('move').flatMap((x) => (str(x.id) ? [{ id: str(x.id), happensAt: iso(x.happensAt), touches: drafts(x.touches) }] : [])),
    close: list('close').flatMap((x) => {
      const outcome = OUTCOMES.find((o) => o === x.outcome);
      return str(x.id) && outcome ? [{ id: str(x.id), outcome }] : [];
    }),
  };
}

/** The shape of a text they write first. */
export const TOUCH_SHAPE =
  'Reply with JSON only: {"skip":false,"messages":[""],"ideas":[{"label":"2-3 words","text":"what the user would send"}]}. ' +
  'One to three short texts, like a real person; two or three ideas the user could tap. "skip":true if the chat already settled it or it would be odd now.';

export interface TouchInput {
  character: Character;
  user: User;
  relationship?: Relationship;
  thread: Thread;
  touch: Touch;
  /** The chat's last lines, oldest first: what was said since the thread began. */
  recent: readonly Message[];
  now: Date;
  replyLanguage?: string;
}

/**
 * The prompt for one text they write first about a thread: the persona (with the temper and the
 * bond), the last lines, the thread and why they write now. Nothing tells it what to say.
 */
export function touchParts(input: TouchInput): PromptPart[] {
  const { character, user, relationship, thread, touch, now } = input;
  const recent = input.recent
    .filter((m) => m.kind === 'text' && m.text && !m.card)
    .slice(-12)
    .map((m) => `${m.author === 'me' ? 'User' : 'You'}: ${m.text}`);
  return [
    ...characterParts(character, user, relationship, input.replyLanguage),
    part('recent', 'turn', recent.length ? ['THE CHAT LATELY:', ...recent] : []),
    part('touch', 'turn', [
      `You are texting first, unprompted. It is ${when(now.toISOString())}.`,
      `The thread: ${thread.about} (${when(thread.happensAt)}). They told you: "${thread.quote}".`,
      `You planned this text ${touch.phase === 'before' ? 'before it' : touch.phase === 'after' ? 'after it' : 'to check on it'} because: ${touch.why}.`,
      `Write it in your own words and your temper (${temperOf(character, relationship?.label)}); bring back what you remember about them when it fits.`,
    ]),
    part('shape', 'turn', [TOUCH_SHAPE]),
  ];
}

export interface TouchReply {
  skip: boolean;
  lines: string[];
  ideas: { label: string; text: string }[];
}

/** Reads the model's text-first JSON; a broken answer is a skip, never a half-written text. */
export function parseTouchReply(raw: string): TouchReply {
  try {
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '');
    const lines = (Array.isArray(json.messages) ? json.messages : []).map(str).filter(Boolean).slice(0, 3);
    const ideas = (Array.isArray(json.ideas) ? json.ideas : [])
      .map((x: { label?: unknown; text?: unknown }) => ({ label: str(x?.label).slice(0, 24), text: str(x?.text) }))
      .filter((x: { label: string; text: string }) => x.label && x.text)
      .slice(0, 3);
    return { skip: json.skip === true || !lines.length, lines, ideas };
  } catch {
    return { skip: true, lines: [], ideas: [] };
  }
}

/** The parts for one reply's prompt that carry the threads: the standing rule and this friend's open ones. */
export const threadParts = (threads: readonly Thread[]): PromptPart[] => [
  part('threadRules', 'global', THREAD_RULES_LINES),
  part('threads', 'turn', threadLines(threads)),
];
