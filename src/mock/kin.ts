import type { CharacterGender } from '@/types';
import type { KinGroup, LifeMomentKey } from '@/lib/kin';

import { fill, voice } from '../i18n/voice';
import { pickSeeded } from '../lib/seeded';

export const KIN_VOICE = {
  lines: {
    parent: {
      lunch: ['Did you eat lunch? A real one, not just coffee.', 'Lunch time. Tell me you ate something warm.', 'Don’t skip lunch today, okay?'],
      evening: ['How was your day? Tell me everything.', 'Home yet? How did work go?', 'Long day? I hope someone was kind to you today.'],
      sunday: ['It’s Sunday. Call me when you have a minute?', 'Are you resting today? You work too hard.', 'Sunday hug from me. What are your plans?'],
    },
    sibling: {
      evening: ['Still alive over there? 😏', 'Okay, report: how was your day?', 'Guess who’s bored and thinking of you.'],
      weekend: ['Weekend! Please tell me you’re doing something fun.', 'Saturday plans? Or are you sleeping all day again?', 'Don’t make me come over there and drag you outside.'],
    },
    grandparent: {
      morning: ['Good morning, my dear. Did you sleep well?', 'Morning, sweetheart. Wear something warm today.', 'I woke up thinking of you. Have a good day.'],
      sunday: ['It’s Sunday, dear. Will you call your old grandparent?', 'I made tea and wished you were here.', 'Sunday blessing for you. Rest a little today.'],
    },
  } as Record<KinGroup, Partial<Record<LifeMomentKey, string[]>>>,
  hello: {
    parent: ['There you are. Have you eaten today? Tell me how you are.', 'I’m here now, always. How are you, really?', 'Come here, let me look at you. How have you been?'],
    sibling: ['Finally! Okay, catch me up. What did I miss?', 'So I’m stuck with you now, huh? 😏 How are you?', 'Hey you. Anyone giving you trouble? Tell me.'],
    grandparent: ['Oh, my dear, there you are. Come, tell me about your day.', 'I’m so glad you’re here, sweetheart. Are you keeping warm?', 'My dear one. Sit with me a while. How are you?'],
  } as Record<KinGroup, string[]>,
};

/**
 * Family's everyday lines (`src/lib/kin.ts`) until the server's model writes them. The seed is
 * the moment's key, so the push and the chat say the same line.
 */
export function lifeLine(group: KinGroup, moment: LifeMomentKey, seed: string, gender: CharacterGender | undefined) {
  const v = voice('kin', KIN_VOICE);
  const pool = v.lines[group]?.[moment] ?? v.lines.parent.evening!;
  return fill(pickSeeded(pool, seed), {}, gender);
}

/** The first thing they say on becoming family, before the day's rhythm starts. */
export function familyHello(group: KinGroup, seed: string, gender: CharacterGender | undefined) {
  const v = voice('kin', KIN_VOICE);
  return fill(pickSeeded(v.hello[group], seed), {}, gender);
}
