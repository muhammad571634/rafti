import type { ReplyPrefs } from '@/lib/reply-engine';
import type { Emotion, NextKind, SetupOffer } from '@/types';

import { cleanActionText, cleanSegments, messageSpeech, partsToText, segments, speechFromParts, speechOnly, type Segment } from '../lib/reply-engine/narration';
import { cleanPhotoNotes } from './photo-prompt';
import { cleanDayNotes } from './own-day';
import { cleanThought } from './inner-thought';
import { cleanNext } from './next-moment';
import { cleanReact, type React } from './react';
import { cleanSetup } from './setup-prompt';
import { cleanThreadOps, hasThreadOps, type ThreadOps } from './thread-prompt';

/**
 * Reply style and length in the prompt (Character.AI's "Personalization": response length and
 * +dialogue / +narration). Two places, for the provider's prompt cache:
 * - `replyStyleLines`: the chat's settings, in the persona prompt (`buildCharacterPrompt`); they
 *   change only when the user changes them.
 * - `turnLines`: this turn's mood and plan (`planReply`), last, after the history and any
 *   `steerCue`, as they change every turn. They are hints: the model has the last word.
 * The model answers in `REPLY_SHAPE`; `parseModelReply` reads it and `enforceStyle` /
 * `enforceStyleBubbles` hold Talk to its promise of no narration.
 */

export const EMOTIONS: readonly Emotion[] = ['calm', 'happy', 'playful', 'shy', 'tender', 'worried', 'sad', 'annoyed'];

const STYLE_GUIDE: Record<ReplyPrefs['style'], string> = {
  talk: 'Talk: text like a real person on their phone. Spoken lines only: no narration, no asterisks.',
  mix:
    'Mixed: mostly dialogue, like texting, with at most one short action or feeling (in an "action" part or *asterisks*) ' +
    'when it says more than words (e.g. laughs into the pillow).',
  story:
    'Story: immersive roleplay prose. Narrate your actions, the place and your feelings (in "action" parts or *asterisks*), ' +
    'weave spoken dialogue between them, and move the scene on a little every turn. ' +
    'Never narrate what the user does, thinks or says: only yourself and the world.',
};

const LENGTH_GUIDE: Record<ReplyPrefs['length'], string> = {
  short: 'Short: a line or two.',
  auto: 'Match them: about as much as they write; a "lol" gets a line, a paragraph gets a paragraph.',
  long: 'Long: fuller replies with more detail and feeling.',
};

/** The chat's reply settings, for the persona prompt. */
export function replyStyleLines(prefs: ReplyPrefs) {
  return ['REPLY STYLE:', `- ${STYLE_GUIDE[prefs.style]}`, `- Length: ${LENGTH_GUIDE[prefs.length]}`];
}

/**
 * What the model answers with: the language it writes in, whether the user may be in danger, the
 * feeling it settled on, one string per bubble. Naming the language makes the model look before it
 * writes: told only "their language", a light model answered Japanese in English (eval set, B1.5).
 * It is named right before "messages" and as "the language of their latest message" (0z187): named
 * first, as "the REPLY LANGUAGE" (whose cached text ends on the phone's language, English), the A51
 * chat with ~170 English replies got "language":"Turkish" and English bubbles for a Turkish line
 * (the owner's real chat replayed: 3/4 English, now 12/12 Turkish). `crisis` is the crisis check in
 * every language (B1.6): read before the bubbles, so the reply is written with it in mind; the
 * server acts on it.
 */
export const REPLY_SHAPE =
  `Reply with JSON only: {"crisis":false,"minor":false,"emotion":"${EMOTIONS.join('|')}","intensity":0-1,"language":"the language of their latest message, named","messages":[""]}. ` +
  '"crisis" is true when the user themself seems at real risk: wanting to die or to hurt themselves, its warning signs ' +
  '(saying goodbye, giving their things away, feeling like a burden or done with everything), or in danger now; ' +
  'never for a joke, a figure of speech ("this is killing me") or your story\'s fiction. ' +
  '"minor" is true only when the user says or clearly shows they themself are under 18 now (their age, their school year); ' +
  'never for their past ("when I was 15"), a character, the story or someone else. ' +
  'Each string is one chat bubble, written in that language; narration in *asterisks*.';

/**
 * Structured narration (0z290): asked only on Mixed / Story text chats (never Talk, Call or Bedtime).
 * Separating actions from spoken dialogue lets voice skip narration with zero regex guesses and lets
 * the bubble style each action in its own quiet block (Variant A).
 */
export const STRUCTURED_NARRATION_SHAPE =
  'When a bubble has narration (actions, feelings, scene), write that bubble as a list of parts: ' +
  '[{"action":"..."},{"speech":"..."}] (plain prose inside action with no asterisks; speech is only what you say out loud). ' +
  'Plain speech-only bubbles stay strings.';

/** Reply JSON shape for a given chat mode and reply style: adds structured narration only where narration is allowed. */
export function replyShape(mode?: string, style?: ReplyPrefs['style']): string {
  if (mode === 'call' || mode === 'bedtime' || style === 'talk') return REPLY_SHAPE;
  return `${REPLY_SHAPE} ${STRUCTURED_NARRATION_SHAPE}`;
}

// The chat's one-tap replies (0z176) are gone (owner, 2026-11-17: the user writes, a live
// conversation): the prompt no longer asks for "ideas". An older server's reply may still carry them,
// so the parse below keeps reading the field; nothing draws it.

/** How many one-tap replies the chat shows, and how long one may be. */
export const IDEAS_MAX = 2;
const IDEA_CHARS_MAX = 48;

/** The model's one-tap replies, kept only when they are short plain strings. */
export function cleanIdeas(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .filter((idea): idea is string => typeof idea === 'string')
    .map((idea) => idea.trim().replace(/\s+/g, ' '))
    .filter((idea) => idea && idea.length <= IDEA_CHARS_MAX && !seen.has(idea.toLowerCase()) && seen.add(idea.toLowerCase()))
    .slice(0, IDEAS_MAX);
}

export interface ModelReply {
  bubbles: string[];
  /**
   * Structured narration & speech parts per bubble (`0z290`), parallel to `bubbles`. Present when
   * the model answered with structured parts so voice skips narration without asterisk guesswork.
   */
  parts?: Segment[][];
  /** The language the model said it writes in (its "language"): for the log only, a short name. */
  language?: string;
  emotion?: Emotion;
  intensity?: number;
  /** The model marked the user as possibly in danger. */
  crisis?: boolean;
  /** The model read the user as under 18 (`src/lib/age-check.ts`). */
  minor?: boolean;
  /** One line about each photo it was shown (`src/ai/photo-prompt.ts`). */
  photos?: string[];
  /** An alarm or a plan the user asked it to set up (`src/ai/setup-prompt.ts`). */
  setup?: SetupOffer;
  /** What it will follow up on, move or settle (`src/ai/thread-prompt.ts`), times on the user's clock. */
  threads?: ThreadOps;
  /** New things it said about its own day, a few words each (`src/ai/own-day.ts`). */
  day?: string[];
  /** A sticker it put on the user's latest message (`src/ai/react.ts`). */
  react?: React;
  /** What it really thinks and did not say, hidden until the user opens it (`src/ai/inner-thought.ts`). */
  thought?: string;
  /** One-tap replies the user could send next (`IDEAS_CUE`). */
  ideas?: string[];
  /** A moment it invites the user to (`src/ai/next-moment.ts`); the server keeps it only if the turn opened it. */
  next?: NextKind;
}

/** One bubble ready for delivery: canonical text plus optional structured parts when narration is present. */
export interface ReplyBubble {
  text: string;
  parts?: Segment[];
}

/** Splits any *asterisks* a model slipped inside a speech field into proper action/speech segments. */
function splitSpeechField(text: string): Segment[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed.includes('*') ? segments(trimmed) : [{ kind: 'speech', text: trimmed }];
}

/** Reads one part entry (`{"action":"..."}`, `{"speech":"..."}`, `{"action":"...","speech":"..."}`, `{"kind","text"}` or string). */
function readPartEntry(entry: unknown): Segment[] {
  if (typeof entry === 'string') return splitSpeechField(entry);
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
  const obj = entry as Record<string, unknown>;
  const out: Segment[] = [];
  const kind = obj.kind ?? obj.type;
  if ((kind === 'action' || kind === 'narration') && typeof obj.text === 'string') {
    const cleaned = cleanActionText(obj.text);
    if (cleaned) out.push({ kind: 'action', text: cleaned });
    return out;
  }
  if ((kind === 'speech' || kind === 'dialogue') && typeof obj.text === 'string') {
    return splitSpeechField(obj.text);
  }
  const action = typeof obj.action === 'string' ? obj.action : typeof obj.narration === 'string' ? obj.narration : undefined;
  const speech = typeof obj.speech === 'string' ? obj.speech : typeof obj.dialogue === 'string' ? obj.dialogue : undefined;
  if (action) {
    const cleaned = cleanActionText(action);
    if (cleaned) out.push({ kind: 'action', text: cleaned });
  }
  if (speech) out.push(...splitSpeechField(speech));
  return out;
}

/** True when a plain object holds only an action part or only a speech part (catches a flattened `"messages":[{"action":...},{"speech":...}]`). */
function partObjectRole(item: unknown): 'action' | 'speech' | 'both' | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const obj = item as Record<string, unknown>;
  const kind = obj.kind ?? obj.type;
  if ((kind === 'action' || kind === 'narration') && typeof obj.text === 'string') return 'action';
  if ((kind === 'speech' || kind === 'dialogue') && typeof obj.text === 'string') return 'speech';
  const hasAction = typeof obj.action === 'string' || typeof obj.narration === 'string';
  const hasSpeech = typeof obj.speech === 'string' || typeof obj.dialogue === 'string';
  if (hasAction && hasSpeech) return 'both';
  if (hasAction) return 'action';
  if (hasSpeech) return 'speech';
  return null;
}

function parseMessageList(raw: unknown): { bubbles: string[]; parts?: Segment[][] } {
  if (!Array.isArray(raw)) return { bubbles: [] };
  // If a light model forgot the outer bracket and wrote `[{"action":"..."},{"speech":"..."}]` directly,
  // group the alternating single-role part objects back into one bubble instead of splitting the action out.
  const roles = raw.map(partObjectRole);
  const flattenedSingleBubble =
    raw.length > 1 &&
    roles.every((r) => r === 'action' || r === 'speech') &&
    roles.includes('action') &&
    roles.includes('speech');
  const items = flattenedSingleBubble ? [raw] : raw;

  const parsed: { text: string; parts?: Segment[]; structured: boolean }[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      const text = item.trim();
      if (!text) continue;
      parsed.push({ text, parts: cleanSegments(segments(text)), structured: false });
      continue;
    }
    const rawParts = Array.isArray(item) ? item.flatMap(readPartEntry) : readPartEntry(item);
    const cleaned = cleanSegments(rawParts);
    if (!cleaned?.length) continue;
    const text = partsToText(cleaned);
    if (!text) continue;
    parsed.push({ text, parts: cleaned, structured: true });
  }
  const bubbles = parsed.map((p) => p.text);
  const hadStructured = parsed.some((p) => p.structured);
  const parts = hadStructured && parsed.every((p) => p.parts?.length) ? parsed.map((p) => p.parts!) : undefined;
  return { bubbles, ...(parts ? { parts } : {}) };
}

/**
 * JSON.parse, and once more with the light model's usual slip mended: a list split into several
 * (`"messages":["a"],["b"]`). Seen twice in the eval (0z179), once with `"crisis":true`, which the
 * broken JSON lost: the reply went out as prose without the helpline card.
 */
function parseJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch (error) {
    const mended = json.replace(/"\]\s*,\s*\["/g, '","');
    if (mended !== json) {
      try {
        return JSON.parse(mended);
      } catch {
        // Try the messages alone below.
      }
    }
    const kept = messagesOnly(json);
    if (kept) return kept;
    throw error;
  }
}

/** Where the bracket opened at `open` closes, skipping strings; -1 when it never does. */
function closingAt(text: string, open: number) {
  let depth = 0;
  let inString = false;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * A reply whose JSON broke after its messages (0z333: flash-lite closed the list and wrote a stray
 * `["…"]` before the brace): the fields before the list and the list itself, so the bubbles still land
 * and raw JSON never does.
 */
function messagesOnly(json: string): Record<string, unknown> | undefined {
  const key = json.search(/"messages"\s*:\s*\[/);
  if (key < 0) return undefined;
  const open = json.indexOf('[', key);
  const close = closingAt(json, open);
  if (close < 0) return undefined;
  try {
    const messages = JSON.parse(json.slice(open, close + 1)) as unknown;
    let head: Record<string, unknown> = {};
    try {
      head = JSON.parse(`${json.slice(0, key).replace(/,\s*$/, '')}}`) as Record<string, unknown>;
    } catch {
      // The fields before it are a bonus; the messages are what the user sees.
    }
    return { ...head, messages };
  } catch {
    return undefined;
  }
}

/** Reads the model's JSON; anything else is taken as plain prose, split on blank lines. */
export function parseModelReply(raw: string): ModelReply {
  const json = raw.match(/\{[\s\S]*\}/)?.[0];
  if (json) {
    try {
      const data = parseJson(json) as { language?: unknown; emotion?: string; intensity?: number; messages?: unknown; crisis?: unknown; minor?: unknown; photos?: unknown; setup?: unknown; threads?: unknown; day?: unknown; react?: unknown; thought?: unknown; ideas?: unknown; next?: unknown };
      const { bubbles, parts } = parseMessageList(data.messages);
      if (bubbles.length) {
        const photos = cleanPhotoNotes(data.photos);
        const setup = cleanSetup(data.setup);
        const threads = cleanThreadOps(data.threads);
        const day = cleanDayNotes(data.day);
        const react = cleanReact(data.react);
        const thought = cleanThought(data.thought);
        const ideas = cleanIdeas(data.ideas);
        const next = cleanNext(data.next);
        return {
          bubbles,
          ...(parts ? { parts } : {}),
          ...(typeof data.language === 'string' && data.language.trim() ? { language: data.language.trim().slice(0, 24) } : {}),
          emotion: EMOTIONS.includes(data.emotion as Emotion) ? (data.emotion as Emotion) : undefined,
          intensity: typeof data.intensity === 'number' ? Math.min(1, Math.max(0, data.intensity)) : undefined,
          ...(data.crisis === true ? { crisis: true } : {}),
          ...(data.minor === true ? { minor: true } : {}),
          ...(photos ? { photos } : {}),
          ...(setup ? { setup } : {}),
          ...(hasThreadOps(threads) ? { threads } : {}),
          ...(day.length ? { day } : {}),
          ...(react ? { react } : {}),
          ...(thought ? { thought } : {}),
          ...(ideas.length ? { ideas } : {}),
          ...(next ? { next } : {}),
        };
      }
    } catch {
      // Not JSON after all: read it as prose.
    }
    // A reply that was meant as JSON and cannot be read is no reply: raw JSON never reaches a bubble
    // (the route then says Not Delivered, model-first).
    if (/"messages"\s*:/.test(json)) return { bubbles: [] };
  }
  const bubbles = raw
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, 3);
  return { bubbles };
}

/** Talk promises no narration: strip any the writer slipped in anyway. Texting splits a paragraph into bubbles (`splitBubbles`). */
export function enforceStyle(bubbles: readonly string[], style: ReplyPrefs['style']) {
  const kept = style === 'talk' ? bubbles.map(speechOnly).filter(Boolean) : [...bubbles];
  return style === 'story' ? kept : splitBubbles(kept);
}

/** A bubble wider than this reads as a paragraph on a phone (about three lines; `widthOf`). */
export const BUBBLE_MAX_CHARS = 140;
const BUBBLES_MAX = 4;
/** Kana, CJK ideographs, Hangul and full-width forms: each takes about two Latin letters of the line. */
const WIDE = /[ᄀ-ᇿ぀-ヿ㐀-鿿가-힯＀-￯]/g;
/** How much of a line a text takes, in Latin letters. */
const widthOf = (text: string) => text.length + (text.match(WIDE) ?? []).length;
/** Sentences of scripts without spaces join without one. */
const joinSentences = (a: string, b: string) => (/[。！？]["'»”’)\]]*$/.test(a) ? `${a}${b}` : `${a} ${b}`);
/** Sentence ends in any script: . ! ? … and the full-width 。！？, with closing quotes or brackets. */
const SENTENCE = /[^.!?…。！？]+(?:[.!?…。！？]+["'»”’)\]]*\s*|$)/g;

/**
 * Texting, as people do it (owner, 2026-11-07: long bubbles tire people): a bubble that runs past
 * `BUBBLE_MAX_CHARS` is cut at sentence ends into a few short ones, in any language. Narration in
 * *asterisks* is never cut in the middle; a single long sentence stays whole. At most
 * `BUBBLES_MAX` bubbles in all, the rest joined to the last.
 */
export function splitBubbles(bubbles: readonly string[]): string[] {
  const out: string[] = [];
  for (const bubble of bubbles) {
    if (widthOf(bubble) <= BUBBLE_MAX_CHARS) {
      out.push(bubble);
      continue;
    }
    const sentences = (bubble.match(SENTENCE) ?? [bubble]).map((s) => s.trim()).filter(Boolean);
    let current = '';
    for (const sentence of sentences) {
      const next = current ? joinSentences(current, sentence) : sentence;
      // Keep an open *action* with the words after it, and never leave a bubble shorter than a few words.
      const openAction = (current.match(/\*/g)?.length ?? 0) % 2 === 1;
      if (current && widthOf(next) > BUBBLE_MAX_CHARS && !openAction && widthOf(current) >= 24) {
        out.push(current);
        current = sentence;
      } else current = next;
    }
    if (current) out.push(current);
  }
  if (out.length <= BUBBLES_MAX) return out;
  return [...out.slice(0, BUBBLES_MAX - 1), out.slice(BUBBLES_MAX - 1).join(' ')];
}

function toReplyBubble(parts: readonly Segment[]): ReplyBubble | null {
  const cleaned = cleanSegments(parts);
  if (!cleaned?.length) return null;
  const text = partsToText(cleaned);
  if (!text) return null;
  return cleaned.some((p) => p.kind === 'action') ? { text, parts: cleaned } : { text };
}

/** Splits an over-long structured Mixed bubble at speech sentence boundaries without breaking an action segment. */
function splitStructuredBubble(parts: readonly Segment[]): ReplyBubble[] {
  const whole = toReplyBubble(parts);
  if (!whole) return [];
  if (widthOf(whole.text) <= BUBBLE_MAX_CHARS) return [whole];

  const chunks: Segment[] = [];
  for (const part of parts) {
    if (part.kind === 'action') {
      chunks.push(part);
    } else {
      const sentences = (part.text.match(SENTENCE) ?? [part.text]).map((s) => s.trim()).filter(Boolean);
      for (const s of sentences) chunks.push({ kind: 'speech', text: s });
    }
  }

  const groups: Segment[][] = [];
  let current: Segment[] = [];
  for (const chunk of chunks) {
    const next = [...current, chunk];
    const currentText = partsToText(current);
    const nextText = partsToText(next);
    // Keep a leading action paired with the speech that follows it instead of stranding a lone action bubble.
    const onlyAction = current.length > 0 && current.every((c) => c.kind === 'action') && chunk.kind === 'speech';
    if (current.length && widthOf(nextText) > BUBBLE_MAX_CHARS && !onlyAction && widthOf(currentText) >= 24) {
      groups.push(current);
      current = [chunk];
    } else {
      current = next;
    }
  }
  if (current.length) groups.push(current);

  return groups.map(toReplyBubble).filter((b): b is ReplyBubble => b !== null);
}

/**
 * Style enforcement with structured parts (`0z290`): Talk strips all action parts cleanly without
 * relying on asterisks, Story keeps multi-beat structured bubbles whole, and Mixed splits long
 * texting bubbles while keeping every bubble's `parts` aligned with its `text`.
 */
export function enforceStyleBubbles(
  bubbles: readonly string[],
  parts: readonly (readonly Segment[] | undefined)[] | undefined,
  style: ReplyPrefs['style'],
): ReplyBubble[] {
  if (style === 'talk') {
    const spoken = bubbles
      .map((line, i) => {
        const p = parts?.[i];
        return p?.length ? speechFromParts(p) : speechOnly(line);
      })
      .filter(Boolean);
    return splitBubbles(spoken).map((text) => ({ text }));
  }

  const out: ReplyBubble[] = [];
  for (let i = 0; i < bubbles.length; i++) {
    const p = parts?.[i]?.length ? cleanSegments(parts[i]) : undefined;
    if (style === 'story') {
      const bubble = p ? toReplyBubble(p) : bubbles[i].trim() ? { text: bubbles[i].trim() } : null;
      if (bubble) out.push(bubble);
      continue;
    }
    if (p) {
      out.push(...splitStructuredBubble(p));
    } else {
      for (const text of splitBubbles([bubbles[i]])) out.push({ text });
    }
  }

  if (style === 'story' || out.length <= BUBBLES_MAX) return out;
  const tail = out.slice(BUBBLES_MAX - 1);
  const mergedParts = tail.flatMap((b) => b.parts ?? cleanSegments(segments(b.text)) ?? []);
  const merged = toReplyBubble(mergedParts) ?? { text: tail.map((b) => b.text).join(' ') };
  return [...out.slice(0, BUBBLES_MAX - 1), merged];
}

/** Only what the character says aloud across a reply burst (for voice notes and previews). */
export function bubblesSpeech(bubbles: readonly ReplyBubble[]): string {
  return bubbles.map(messageSpeech).filter(Boolean).join(' ').trim();
}
