import type { CharacterGender } from '@/types';

import { fill, voice } from '../i18n/voice';
import { hashSeed } from '../lib/seeded';
import { STREAM_FIRST_LINES, STREAM_MORE_LINES } from '../lib/streams';

export const STREAMS_VOICE = {
  /** Ideas under the topic field; `{user}` is the user's name (`fillTopic`). */
  topics: [
    'Who would last longer in a horror movie',
    'The perfect first date, and why the other one is wrong',
    'What they would cook for {user}',
    'Swap jobs for a day',
    'Rate each other’s style, honestly',
    'The worst advice they ever got',
    'Plan a surprise for {user}',
    'A week on a desert island together',
  ],
  openers: [
    'Okay, {other}: “{topic}”. I have opinions.',
    '“{topic}”? I already know I’m right about this one.',
    '{other}, be honest with me. “{topic}”. Go.',
  ],
  replies: [
    'No way. Absolutely not, {other}.',
    'You say that every single time.',
    'Fine, but hear me out first.',
    'That is the worst take I’ve heard all week.',
    'Wait, you actually mean that?',
    'Okay, that one was good. I hate that it was good.',
    'Bold of you to say that with someone watching.',
    'I’m writing this down so you can’t take it back later.',
    'You know I’m going to win this, right?',
    'Give me a second, I need a better comeback.',
    'Only if you go first.',
    'That explains so much about you, {other}.',
    'Name one time I was wrong. One.',
    'I’d argue, but you’re kind of right.',
    'Please. I’ve thought about this more than you have.',
    'That’s not a plan, {other}, that’s a wish.',
    'New rule: whoever laughs first loses.',
    'You did not just say that.',
    'See, this is why nobody lets you pick.',
    'Alright, I’ll give you half a point.',
    'Hold on, let me picture that. No. Still no.',
    'You’re enjoying this way too much.',
  ],
  closers: [
    'Let’s call it a draw. For now.',
    'Fine, you win this round. Only this round.',
    'We are so doing this again.',
    'Okay, truce. Snacks are on you.',
  ],
};

/** How many rounds ended before line `index` (each round ends on its last line). */
function roundsBefore(index: number) {
  const firstEnd = STREAM_FIRST_LINES - 1;
  return index <= firstEnd ? 0 : Math.floor((index - firstEnd - 1) / STREAM_MORE_LINES) + 1;
}

/** The topic ideas in the screen's language. */
export const streamTopics = () => voice('streams', STREAMS_VOICE).topics;

/** The mock's line `index` of a stream; `last` closes the round. */
export function mockStreamLine(streamId: string, index: number, last: boolean, other: string, topic: string, gender: CharacterGender | undefined) {
  const v = voice('streams', STREAMS_VOICE);
  const start = hashSeed(streamId);
  const ended = roundsBefore(index);
  const line =
    index === 0
      ? v.openers[start % v.openers.length]
      : last
        ? v.closers[(start + ended) % v.closers.length]
        : v.replies[(start + index - 1 - ended) % v.replies.length];
  return fill(line, { other, topic }, gender);
}
