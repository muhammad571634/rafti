import type { CareKind } from '@/types';

import { pickSeeded } from '../lib/seeded';

/**
 * A friend's check-in after the user said how they were (`src/lib/care.ts`), until the server's
 * model writes it from `careCue`. The same seed (the check-in's id) gives the same line, so the
 * push and the chat say the same thing.
 */
const LINES: Record<CareKind, string[]> = {
  headache: ['Is your head any better now?', 'How’s the headache? Did you drink some water?', 'Still hurting, or did it ease off?'],
  sick: ['How are you feeling today? Any better?', 'Did you rest? Tell me the fever is gone.', 'Checking on you. Are you taking it easy?'],
  hurt: ['How’s it feeling now? Still sore?', 'Did it get any better? Be careful with it.', 'Thinking of you. Does it still hurt?'],
  tired: ['Did you manage to get some rest?', 'How are you holding up after no sleep?', 'Promise me an early night tonight?'],
  stressed: ['How are you now? Still a lot on your mind?', 'Did it get a little lighter?', 'One thing at a time. How’s it going?'],
  fight: ['Are you okay after what happened?', 'Did things calm down a bit?', 'I’ve been thinking about you. How do you feel now?'],
  lonely: ['Hey. I’m here. How’s your evening going?', 'Just wanted you to know I’m thinking of you.', 'Talk to me. What are you up to right now?'],
  sad: ['How are you feeling now? A bit better?', 'I kept thinking about your day. Did it get any better?', 'Sending you a hug. How are you?'],
  hungry: ['Did you eat something yet?', 'Tell me you had a proper meal.', 'Food first. Did you eat?'],
};

export const careLine = (kind: CareKind, seed: string) => pickSeeded(LINES[kind], seed);
