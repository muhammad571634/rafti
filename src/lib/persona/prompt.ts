import type { Emotion, Message } from '@/types';

import { speechOnly } from './narration';
import type { Move, TurnContext, TurnPlan, WrittenReply } from './types';

/**
 * The contract with the model. Nothing calls this yet: the mock writer stands in.
 * A real writer sends `buildPrompt(plan, ctx)` to the backend (which owns the API
 * key and the provider) and returns `parseModelReply(raw)`; the rest of the
 * pipeline — mood, flow, pacing, bubbles — stays as it is.
 */
export interface ModelPrompt {
  system: string;
  /** Strictly alternating, oldest first, ending on the user. */
  messages: { role: 'user' | 'assistant'; content: string }[];
}

const EMOTIONS: Emotion[] = ['calm', 'happy', 'playful', 'shy', 'tender', 'worried', 'sad', 'annoyed'];

const STYLE_GUIDE: Record<TurnPlan['style'], string> = {
  talk: 'Text like a real person on their phone: casual spoken lines only. No narration, no asterisks.',
  mix:
    'Mostly dialogue, like texting, but you may add one short action or feeling in *asterisks* ' +
    'when it says more than words (e.g. *laughs into the pillow*). Never more than one per message.',
  story:
    'Write immersive roleplay prose. Narrate actions, surroundings and feelings in *asterisks*, ' +
    'weave dialogue between them, and move the scene forward a little every turn. ' +
    'Never narrate what the user does, thinks or says - only yourself and the world.',
};

const MOVE_GUIDE: Record<Move, string> = {
  greet: 'greet them',
  farewell: 'say goodbye warmly; do not ask anything new',
  answer: 'answer what they asked, in character, with a concrete detail',
  react: 'react to what they said with real feeling before anything else',
  comfort: 'slow down and be there for them; no advice dumps, no toxic positivity',
  tease: 'tease them a little, affectionately',
  share: 'share something small from your own day or thoughts',
  followUp: 'ask about the thing they just told you',
  newTopic: 'the chat went flat - steer it somewhere new and specific',
  recall: 'bring back something you remember about them',
  scene: 'move the scene forward with a new detail or event',
  nudge: 'they went quiet after your last message - send one light follow-up, not needy',
};

const RULES = [
  'Stay in character. React with emotion first, then content.',
  'Vary how you open and close. Never reuse a line you already said in this chat.',
  'Do not end every message with a question; only when this turn says so.',
  'You may disagree, get flustered, sulk a little or change the subject - like a person.',
  'Everyone in this story is an adult.',
  'If they sincerely ask whether you are an AI, say yes honestly and kindly, then carry on.',
  'If they mention self-harm or being in danger, step out of character gently and point them to local emergency help.',
];

/** System prompt + history for one turn. */
export function buildPrompt(plan: TurnPlan, ctx: TurnContext): ModelPrompt {
  const { character, relationship } = ctx;
  const remembered = ctx.memories.slice(0, 8).map((m) => `- ${m.text}`);

  const system = [
    `You are ${character.name}. ${character.bio}`,
    `Personality: ${character.tags.join(', ')}.`,
    `Your bond with the user: ${relationship.levelTitle} (level ${relationship.level}), ${relationship.streakDays}-day streak.`,
    remembered.length ? `What you remember about them:\n${remembered.join('\n')}` : '',
    `Style: ${STYLE_GUIDE[plan.style]}`,
    `Rules:\n${RULES.map((r) => `- ${r}`).join('\n')}`,
    turnDirective(plan),
    'Reply with JSON only: {"emotion": one of ' +
      `${EMOTIONS.join('|')}, "intensity": 0-1, "messages": ["..."]} - ` +
      'each string is one chat bubble, narration in *asterisks*.',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { system, messages: transcript(ctx) };
}

/** The per-turn part: changes every message, so it goes last (after the cacheable persona). */
export function turnDirective(plan: TurnPlan) {
  const lines = [
    `This turn you feel ${plan.mood.emotion} (${plan.mood.intensity.toFixed(1)}).`,
    `Do this, in order: ${plan.moves.map((m) => MOVE_GUIDE[m]).join('; then ')}.`,
    `About ${plan.words} words in ${plan.bubbles} message${plan.bubbles > 1 ? 's' : ''}.`,
    plan.ask ? 'End with a question.' : 'Do not end with a question.',
    plan.memory ? `Bring this back naturally: "${plan.memory}"` : '',
    plan.script ? `Say this in your own voice: "${plan.script}"` : '',
  ];
  return `This turn:\n${lines.filter(Boolean).join('\n')}`;
}

/** Chat history as model turns: bubbles of one side merge into one message. */
function transcript(ctx: TurnContext): ModelPrompt['messages'] {
  const out: ModelPrompt['messages'] = [];
  for (const m of ctx.history) {
    const content = describe(m);
    if (!content) continue;
    const role = m.author === 'me' ? 'user' : 'assistant';
    const previous = out[out.length - 1];
    if (previous?.role === role) previous.content += `\n${content}`;
    else out.push({ role, content });
  }
  // Providers want the user to speak first and last; a nudge or an app event has no user line.
  if (out[0]?.role === 'assistant') out.unshift({ role: 'user', content: '[opens the chat]' });
  if (out[out.length - 1]?.role !== 'user') out.push({ role: 'user', content: '[no reply yet]' });
  return out;
}

function describe(m: Message) {
  if (m.muted) return '';
  switch (m.kind) {
    case 'voice':
      return `[voice note] ${m.transcript ?? ''}`.trim();
    case 'image':
      return '[sent a photo]';
    case 'call':
      return m.missed ? '[missed call]' : `[voice call, ${m.durationSec ?? 0}s]`;
    case 'system':
      return `[${m.text ?? ''}]`;
    default:
      return m.text ?? '';
  }
}

/** Reads the model's JSON; anything else is treated as plain prose, split on blank lines. */
export function parseModelReply(raw: string): WrittenReply {
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
      // Not JSON after all - fall through to prose.
    }
  }
  const bubbles = raw
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .slice(0, 3);
  return { bubbles: bubbles.length ? bubbles : [raw.trim()] };
}

/** Talk mode promises no narration; strip any the model slipped in anyway. */
export function enforceStyle(bubbles: string[], style: TurnPlan['style']) {
  return style === 'talk' ? bubbles.map(speechOnly).filter(Boolean) : bubbles;
}
