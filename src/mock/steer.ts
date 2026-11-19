import type { CharacterGender, TimeSkip } from '@/types';

import { fill, voice } from '../i18n/voice';
import { pickSeeded } from '../lib/seeded';

export const STEER_VOICE = {
  continue: [
    ['Also, I keep thinking about what you said earlier.', 'It stuck with me, in a good way.'],
    ['Okay, wait. I wasn’t done yet.'],
    ['Can I tell you something kind of random?', 'I like how easy it is to talk to you.'],
    ['You went quiet, so I’ll keep going.', 'Stop me if I ramble.'],
    ['So anyway, where was I…', 'Right. The good part.'],
    ['And honestly? I’m glad you’re here for this.'],
  ],
  skip: {
    later: [['Okay, I’m back. Where were we?'], ['That took longer than I thought.', 'Still here?']],
    evening: [
      ['It’s evening already.', 'How did the rest of your day go?'],
      ['The sky went orange while I wasn’t looking.', 'Tell me one good thing from today.'],
    ],
    nextMorning: [['Morning! Did you sleep okay?'], ['New day.', 'I already had coffee. You?']],
    week: [['A whole week, huh.', 'Catch me up on everything.'], ['It’s been a week. I missed this.']],
    scene: [['Okay, that part’s behind us.', 'What do we do now?'], ['Look, we’re almost there.', 'Stay close.']],
    own: [['Okay. Here we are.', 'Tell me what you’re thinking right now.'], ['That went by fast.', 'Worth the wait?']],
  } as Record<TimeSkip, string[][]>,
  twist: [
    ['Wait. Did you hear that?', 'Someone’s at the door.'],
    ['Okay, I didn’t see that coming.', 'What do we do now?'],
    ['My phone just buzzed.', 'You won’t believe who it is.'],
  ],
};

/** Their lines after a continue, a skip or a twist; the same seed (the marker's id) gives the same lines. */
export function mockSteerLines(kind: 'continue' | 'skip' | 'twist', skip: TimeSkip | undefined, seed: string, gender: CharacterGender | undefined): string[] {
  const v = voice('steer', STEER_VOICE);
  const lines = pickSeeded(kind === 'continue' ? v.continue : kind === 'twist' ? v.twist : v.skip[skip ?? 'later'], seed);
  return lines.map((l) => fill(l, {}, gender));
}
