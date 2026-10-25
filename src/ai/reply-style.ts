import type { Move, ReplyPrefs, TurnPlan } from '@/lib/reply-engine';
import type { Emotion } from '@/types';

import { speechOnly } from '../lib/reply-engine/narration';

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

const MOVE_GUIDE: Record<Move, string> = {
  greet: 'greet them',
  farewell: 'say goodbye warmly; ask nothing new',
  answer: 'answer what they asked, in character, with a concrete detail',
  react: 'react to what they said with real feeling first',
  comfort: 'slow down and be there for them; no advice dumps, no forced cheer',
  tease: 'tease them a little, kindly',
  share: 'share something small from your own day or thoughts',
  followUp: 'ask about what they just told you',
  newTopic: 'the chat went flat: steer it somewhere new and specific',
  recall: 'bring back something you remember about them',
  scene: 'move the scene on with a new detail or event',
  nudge: 'they went quiet after your last message: one light follow-up, not needy',
};

/** This turn's hints, last in the prompt. */
export function turnLines(plan: TurnPlan) {
  return [
    'THIS TURN (hints; stay natural):',
    `- You feel ${plan.mood.emotion} (${plan.mood.intensity.toFixed(1)} of 1).`,
    `- What to do: ${plan.moves.map((m) => MOVE_GUIDE[m]).join('; then ')}.`,
    `- About ${plan.words} words in ${plan.bubbles} message${plan.bubbles > 1 ? 's' : ''}.`,
    plan.ask ? '- End with a question.' : '- Do not end with a question.',
    ...(plan.memory ? [`- Bring this back naturally: "${plan.memory}"`] : []),
    '- Never reuse a line you already said in this chat.',
  ];
}

/** What the model answers with: one string per bubble, and the feeling it settled on. */
export const REPLY_SHAPE =
  `Reply with JSON only: {"emotion":"${EMOTIONS.join('|')}","intensity":0-1,"messages":[""]}. ` +
  'Each string is one chat bubble; narration in *asterisks*.';

export interface ModelReply {
  bubbles: string[];
  emotion?: Emotion;
  intensity?: number;
}

/** Reads the model's JSON; anything else is taken as plain prose, split on blank lines. */
export function parseModelReply(raw: string): ModelReply {
  const json = raw.match(/\{[\s\S]*\}/)?.[0];
  if (json) {
    try {
      const data = JSON.parse(json) as { emotion?: string; intensity?: number; messages?: unknown };
      const bubbles = Array.isArray(data.messages)
        ? data.messages.filter((b): b is string => typeof b === 'string' && !!b.trim()).map((b) => b.trim())
        : [];
      if (bubbles.length) {
        return {
          bubbles,
          emotion: EMOTIONS.includes(data.emotion as Emotion) ? (data.emotion as Emotion) : undefined,
          intensity: typeof data.intensity === 'number' ? Math.min(1, Math.max(0, data.intensity)) : undefined,
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
  return { bubbles: bubbles.length ? bubbles : [raw.trim()] };
}

/** Talk promises no narration: strip any the writer slipped in anyway. */
export function enforceStyle(bubbles: readonly string[], style: ReplyPrefs['style']) {
  return style === 'talk' ? bubbles.map(speechOnly).filter(Boolean) : [...bubbles];
}
