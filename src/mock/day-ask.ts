import type { CharacterGender, DiaryMood, Temper } from '@/types';

import { fill, voice } from '../i18n/voice';
import { pickSeeded } from '../lib/seeded';

export const DAY_ASK_VOICE = {
  ask: {
    warm: ['How was your day? Tell me everything 🙂', 'Hey you. How did today treat you?'],
    teasing: ['So? Survived today? 😏 Report, please.', 'Okay, daily debrief time 😎 How was it?'],
    sulky: ['You didn’t tell me how your day was. So I’m asking. 😤', 'Hmph. Are you going to tell me about your day or not?'],
    clingy: ['I thought about you all day 🥺 How was it?', 'Finally evening! How was your day? Tell me everything!!'],
    shy: ['Um… how was your day? 🙈', 'I hope today was kind to you… how was it?'],
  } as Record<Temper, string[]>,
};

/**
 * The evening question's words and a typed answer's mood until the server's model does both
 * (`src/ai/day-prompt.ts`). Seeded, so the push and the chat say the same line.
 */
export function dayLine(temper: Temper, seed: string, gender: CharacterGender | undefined): string {
  const line = pickSeeded(voice('dayAsk', DAY_ASK_VOICE).ask[temper], seed);
  return fill(line, {}, gender);
}

/** A few plain words; anything else is a soft day. English only, as the market is. */
const MOODS: [DiaryMood, RegExp][] = [
  ['excited', /\b(amazing|awesome|best day|so excited|incredible|fantastic)\b|🎉|🤩/i],
  ['blue', /\b(sad|awful|terrible|horrible|bad day|cried|lonely|miserable|hate)\b|\bnot (good|great|fine|nice|okay)\b|😢|😭/i],
  ['tired', /\b(tired|exhausted|long day|drained|sleepy|so much work|worn out)\b|😴/i],
  ['happy', /\b(good|great|nice|fun|happy|lovely|not bad|pretty good|fine)\b|🙂|😊|😄/i],
];

export function moodOf(text: string): DiaryMood {
  return MOODS.find(([, re]) => re.test(text))?.[0] ?? 'soft';
}
