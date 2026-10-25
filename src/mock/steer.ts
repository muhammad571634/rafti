import type { TimeSkip } from '@/types';

import { pickSeeded } from '../lib/seeded';

/**
 * Canned replies to a continue or a time skip until the server's model writes them (`steerCue`
 * in src/lib/chat-steer.ts). A continue goes on from what they said; a skip picks up later, in
 * story time.
 */
const CONTINUE = [
  ['Also, I keep thinking about what you said earlier.', 'It stuck with me, in a good way.'],
  ['Okay, wait. I wasn’t done yet.'],
  ['Can I tell you something kind of random?', 'I like how easy it is to talk to you.'],
  ['You went quiet, so I’ll keep going.', 'Stop me if I ramble.'],
  ['So anyway, where was I…', 'Right. The good part.'],
  ['And honestly? I’m glad you’re here for this.'],
];

const SKIP: Record<TimeSkip, string[][]> = {
  later: [['Okay, I’m back. Where were we?'], ['That took longer than I thought.', 'Still here?']],
  evening: [
    ['It’s evening already.', 'How did the rest of your day go?'],
    ['The sky went orange while I wasn’t looking.', 'Tell me one good thing from today.'],
  ],
  nextMorning: [['Morning! Did you sleep okay?'], ['New day.', 'I already had coffee. You?']],
  week: [['A whole week, huh.', 'Catch me up on everything.'], ['It’s been a week. I missed this.']],
  scene: [['Okay, that part’s behind us.', 'What do we do now?'], ['Look, we’re almost there.', 'Stay close.']],
  own: [['Okay. Here we are.', 'Tell me what you’re thinking right now.'], ['That went by fast.', 'Worth the wait?']],
};

/** Their lines after a continue or a skip; the same seed (the marker's id) gives the same lines. */
export const mockSteerLines = (kind: 'continue' | 'skip', skip: TimeSkip | undefined, seed: string) =>
  pickSeeded(kind === 'continue' ? CONTINUE : SKIP[skip ?? 'later'], seed);
