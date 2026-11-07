import type { ReplyPrefs } from '@/lib/reply-engine';
import type { Emotion, SetupOffer } from '@/types';

import { speechOnly } from '../lib/reply-engine/narration';
import { cleanPhotoNotes } from './photo-prompt';
import { cleanDayNotes } from './own-day';
import { cleanSetup } from './setup-prompt';
import { cleanThreadOps, hasThreadOps, type ThreadOps } from './thread-prompt';

/**
 * Reply style and length in the prompt (Character.AI's "Personalization": response length and
 * +dialogue / +narration). Two places, for the provider's prompt cache:
 * - `replyStyleLines`: the chat's settings, in the persona prompt (`buildCharacterPrompt`); they
 *   change only when the user changes them.
 * - `turnLines`: this turn's mood and plan (`planReply`), last, after the history and any
 *   `steerCue`, as they change every turn. They are hints: the model has the last word.
 * The model answers in `REPLY_SHAPE`; `parseModelReply` reads it and `enforceStyle` holds Talk to
 * its promise of no narration.
 */

export const EMOTIONS: readonly Emotion[] = ['calm', 'happy', 'playful', 'shy', 'tender', 'worried', 'sad', 'annoyed'];

const STYLE_GUIDE: Record<ReplyPrefs['style'], string> = {
  talk: 'Talk: text like a real person on their phone. Spoken lines only: no narration, no asterisks.',
  mix:
    'Mixed: mostly dialogue, like texting, with at most one short action or feeling in *asterisks* ' +
    'when it says more than words (e.g. *laughs into the pillow*).',
  story:
    'Story: immersive roleplay prose. Narrate your actions, the place and your feelings in *asterisks*, ' +
    'weave dialogue between them, and move the scene on a little every turn. ' +
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
 * feeling it settled on, one string per bubble. Naming the language first makes the model look
 * before it writes: told only "their language", a light model answered Japanese in English (eval
 * set, B1.5). `crisis` is the crisis check in every language (B1.6): read before the bubbles, so
 * the reply is written with it in mind; the server acts on it.
 */
export const REPLY_SHAPE =
  `Reply with JSON only: {"language":"the REPLY LANGUAGE, named","crisis":false,"emotion":"${EMOTIONS.join('|')}","intensity":0-1,"messages":[""]}. ` +
  '"crisis" is true when the user themself seems at real risk: wanting to die or to hurt themselves, its warning signs ' +
  '(saying goodbye, giving their things away, feeling like a burden or done with everything), or in danger now; ' +
  'never for a joke, a figure of speech ("this is killing me") or your story\'s fiction. ' +
  'Each string is one chat bubble, written in that language; narration in *asterisks*.';

export interface ModelReply {
  bubbles: string[];
  emotion?: Emotion;
  intensity?: number;
  /** The model marked the user as possibly in danger. */
  crisis?: boolean;
  /** One line about each photo it was shown (`src/ai/photo-prompt.ts`). */
  photos?: string[];
  /** An alarm or a plan the user asked it to set up (`src/ai/setup-prompt.ts`). */
  setup?: SetupOffer;
  /** What it will follow up on, move or settle (`src/ai/thread-prompt.ts`), times on the user's clock. */
  threads?: ThreadOps;
  /** New things it said about its own day, a few words each (`src/ai/own-day.ts`). */
  day?: string[];
}

/** Reads the model's JSON; anything else is taken as plain prose, split on blank lines. */
export function parseModelReply(raw: string): ModelReply {
  const json = raw.match(/\{[\s\S]*\}/)?.[0];
  if (json) {
    try {
      const data = JSON.parse(json) as { emotion?: string; intensity?: number; messages?: unknown; crisis?: unknown; photos?: unknown; setup?: unknown; threads?: unknown; day?: unknown };
      const bubbles = Array.isArray(data.messages)
        ? data.messages.filter((b): b is string => typeof b === 'string' && !!b.trim()).map((b) => b.trim())
        : [];
      if (bubbles.length) {
        const photos = cleanPhotoNotes(data.photos);
        const setup = cleanSetup(data.setup);
        const threads = cleanThreadOps(data.threads);
        const day = cleanDayNotes(data.day);
        return {
          bubbles,
          emotion: EMOTIONS.includes(data.emotion as Emotion) ? (data.emotion as Emotion) : undefined,
          intensity: typeof data.intensity === 'number' ? Math.min(1, Math.max(0, data.intensity)) : undefined,
          ...(data.crisis === true ? { crisis: true } : {}),
          ...(photos ? { photos } : {}),
          ...(setup ? { setup } : {}),
          ...(hasThreadOps(threads) ? { threads } : {}),
          ...(day.length ? { day } : {}),
        };
      }
    } catch {
      // Not JSON after all: read it as prose.
    }
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
