import type { Message } from '@/types';

import type { Cue, MessageRead } from './types';

/**
 * Keyword cues — a stand-in until the model reads the message itself (it can
 * return the same `MessageRead` fields as structured output). English only for now.
 */
const CUES: [Cue, RegExp][] = [
  ['greeting', /^(hi|hey|hello|hiya|yo|morning|good (morning|afternoon|evening))\b/i],
  ['goodbye', /\b(bye|good ?night|gn|see you|see ya|gotta go|talk later|going to sleep|off to bed)\b/i],
  ['sad', /\b(sad|cry|crying|cried|lonely|hurts?|upset|depressed|bad day|awful|terrible|heartbroken)\b/i],
  ['stressed', /\b(stress(ed)?|anxious|nervous|worried|scared|panic|exams?|deadline|overwhelmed)\b/i],
  ['tired', /\b(tired|exhausted|sleepy|no sleep|can'?t sleep|worn out|drained)\b/i],
  ['happy', /\b(happy|great|awesome|amazing|yay|finally|passed|won|excited|best day)\b|!!/i],
  ['affection', /\b(love you|miss(ed)? you|like you|you'?re cute|handsome|pretty|hugs?|kiss|thinking (of|about) you)\b|❤|♥|😘|🥰/i],
  ['tease', /\b(lol|lmao|haha+|hehe+|dummy|whatever|make me|prove it|as if)\b|😏|😜/i],
  ['apology', /\b(sorry|my bad|forgive me|apologi[sz]e)\b/i],
  ['rude', /\b(shut up|stupid|boring|annoying|hate you|go away)\b/i],
  ['story', /\b(tell me a story|what happens next|continue|go on|and then)\b/i],
];

const VALENCE: Partial<Record<Cue, number>> = {
  happy: 0.6,
  affection: 0.5,
  tease: 0.1,
  greeting: 0.1,
  sad: -0.7,
  stressed: -0.5,
  tired: -0.3,
  rude: -0.6,
};

const LOW_EFFORT = /^(ok(ay)?|k+|lol|haha+|hm+|mhm|yeah|yep|yes|no|nah|sure|cool|nice|idk|fine|true|same|wow|oh)[.!]*$/i;
/** Asking without a question mark counts too: "tell me about your day" wants an answer. */
const QUESTION_START = /^(what|why|how|when|where|who|which|do you|are you|can you|would you|did you|have you|will you|tell me|describe)\b/i;
/** Emoji or punctuation only (no `\p{...}` escapes: not every JS engine RN runs on has them). */
const NO_WORDS = /^[^\w]+$/;

export function readMessage(message: Message | undefined): MessageRead {
  if (!message) return { words: 0, question: false, valence: 0, cues: [], lowEffort: false };
  // A photo or a voice note is effort in itself, even with no words to read.
  if (message.kind === 'image') return { words: 0, question: false, valence: 0.3, cues: ['photo'], lowEffort: false };

  const text = (message.kind === 'voice' ? message.transcript : message.text)?.trim() ?? '';
  const words = text ? text.split(/\s+/).length : 0;
  const question = /\?\s*$/.test(text) || QUESTION_START.test(text);
  const cues = CUES.filter(([, pattern]) => pattern.test(text)).map(([cue]) => cue);
  if (question) cues.push('question');

  const valence = Math.max(-1, Math.min(1, cues.reduce((sum, cue) => sum + (VALENCE[cue] ?? 0), 0)));
  const lowEffort = message.kind === 'text' && (LOW_EFFORT.test(text) || (words <= 2 && NO_WORDS.test(text)));

  return { words, question, valence, cues, lowEffort };
}
