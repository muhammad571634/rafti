import { STREAM_FIRST_LINES, STREAM_MORE_LINES } from '../lib/streams';
import { hashSeed } from '../lib/seeded';

/**
 * Canned stream lines until the server's model writes them (`buildStreamLinePrompt`). `{other}` is
 * the one they talk to and `{topic}` the topic. A stream walks through each pool from a seeded
 * start, so no line repeats even in a full stream, and the same stream reads the same way.
 */
const OPENERS = [
  'Okay, {other}: “{topic}”. I have opinions.',
  '“{topic}”? I already know I’m right about this one.',
  '{other}, be honest with me. “{topic}”. Go.',
];

const REPLIES = [
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
];

/** One for each round a full stream can have. */
const CLOSERS = [
  'Let’s call it a draw. For now.',
  'Fine, you win this round. Only this round.',
  'We are so doing this again.',
  'Okay, truce. Snacks are on you.',
];

/** How many rounds ended before line `index` (each round ends on its last line). */
function roundsBefore(index: number) {
  const firstEnd = STREAM_FIRST_LINES - 1;
  return index <= firstEnd ? 0 : Math.floor((index - firstEnd - 1) / STREAM_MORE_LINES) + 1;
}

/** The mock's line `index` of a stream; `last` closes the round. */
export function mockStreamLine(streamId: string, index: number, last: boolean, other: string, topic: string) {
  const start = hashSeed(streamId);
  const ended = roundsBefore(index);
  const line =
    index === 0
      ? OPENERS[start % OPENERS.length]
      : last
        ? CLOSERS[(start + ended) % CLOSERS.length]
        : REPLIES[(start + index - 1 - ended) % REPLIES.length];
  return line.replaceAll('{other}', other).replaceAll('{topic}', topic);
}
