import type { KinGroup, LifeMomentKey } from '@/lib/kin';

import { pickSeeded } from '../lib/seeded';

/**
 * Family's everyday lines (`src/lib/kin.ts`) until the server's model writes them. The seed is
 * the moment's key, so the push and the chat say the same line.
 */
const LINES: Record<KinGroup, Partial<Record<LifeMomentKey, string[]>>> = {
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
};

export const lifeLine = (group: KinGroup, moment: LifeMomentKey, seed: string) =>
  pickSeeded(LINES[group][moment] ?? LINES.parent.evening!, seed);
