import type { ReplyPrefs } from '@/lib/reply-engine';
import type { Emotion, SetupOffer } from '@/types';

import { speechOnly } from '../lib/reply-engine/narration';
import { cleanPhotoNotes } from './photo-prompt';
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
}

/** Reads the model's JSON; anything else is taken as plain prose, split on blank lines. */
export function parseModelReply(raw: string): ModelReply {
  const json = raw.match(/\{[\s\S]*\}/)?.[0];
  if (json) {
    try {
      const data = JSON.parse(json) as { emotion?: string; intensity?: number; messages?: unknown; crisis?: unknown; photos?: unknown; setup?: unknown; threads?: unknown };
      const bubbles = Array.isArray(data.messages)
        ? data.messages.filter((b): b is string => typeof b === 'string' && !!b.trim()).map((b) => b.trim())
        : [];
      if (bubbles.length) {
        const photos = cleanPhotoNotes(data.photos);
        const setup = cleanSetup(data.setup);
        const threads = cleanThreadOps(data.threads);
        return {
          bubbles,
          emotion: EMOTIONS.includes(data.emotion as Emotion) ? (data.emotion as Emotion) : undefined,
          intensity: typeof data.intensity === 'number' ? Math.min(1, Math.max(0, data.intensity)) : undefined,
          ...(data.crisis === true ? { crisis: true } : {}),
          ...(photos ? { photos } : {}),
          ...(setup ? { setup } : {}),
          ...(hasThreadOps(threads) ? { threads } : {}),
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

/** Talk promises no narration: strip any the writer slipped in anyway. */
export function enforceStyle(bubbles: readonly string[], style: ReplyPrefs['style']) {
  return style === 'talk' ? bubbles.map(speechOnly).filter(Boolean) : [...bubbles];
}
