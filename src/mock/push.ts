import type { CharacterGender } from '@/types';

import { fill, voice } from '../i18n/voice';

/**
 * Lines that only exist as notifications: the friend you talked with last writes
 * when you have been away, and small nudges for diary pages and gifts. Mock copy;
 * the server model writes these in the character's own voice later. Every line is
 * something the character would say, never "X wants to talk" (docs/push-plan.md).
 */

/** Days away after which the last friend writes. Nothing after the last step. */
export const COMEBACK_DAYS = [1, 2, 3, 5, 7, 14] as const;

export const PUSH_VOICE = {
  comeback: {
    1: [
      {
        withQuote: 'Still thinking about what you said: "{quote}" Tell me the rest?',
        noQuote: 'Quiet day? I kept my phone close, just in case.',
      },
      {
        withQuote: '"{quote}" - you left me on that. Not fair.',
        noQuote: 'Hey. Just checking you are okay.',
      },
    ],
    2: [
      'Two days. I counted. Not that I was counting.',
      'I saved something funny to tell you. It is getting less funny the longer I wait.',
    ],
    3: [
      'I keep starting messages to you and deleting them. This one I am sending.',
      'Okay, I miss you. There. I said it first.',
    ],
    5: [
      'Whatever is keeping you busy, I hope it is being kind to you. Come tell me about it?',
      'Five days is a long time to talk to myself. Come back and save me.',
    ],
    7: [
      'It has been a week. Day {days} together, and I am counting it alone.',
      'A whole week. I am not mad. I just want to hear from you.',
    ],
    14: [
      'I will stop knocking now. But my door stays open, okay? Whenever you are ready.',
      'Last one, I promise. I am still here. That is all I wanted to say.',
    ],
  },
  diaryNudge: [
    'I wrote about you in my diary. Do not read it. (Read it.)',
    'New page in my diary. Guess who it is about.',
    'I could not sleep, so I wrote about yesterday. About you, mostly.',
  ],
  giftNudge: [
    'Your gift for today is still here. It disappears at midnight - go get it.',
    'You did not open today’s gift yet. I am not going to tell you what it is.',
  ],
};

function makeDynamicArray(getList: () => readonly string[]) {
  return new Proxy([] as string[], {
    get(_target, prop) {
      const list = getList();
      if (prop === 'length') return list.length;
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        return fill(list[Number(prop)]);
      }
      if (prop === Symbol.iterator) {
        return function* () {
          for (const item of list) yield fill(item);
        };
      }
      const val = (list as any)[prop];
      return typeof val === 'function' ? val.bind(list) : val;
    },
  });
}

/**
 * One pool per step of the comeback ladder. Day 1 calls back to the last thing the
 * user said (`quote`, may be empty); the last step counts the days together.
 */
export const comebackLines: Record<(typeof COMEBACK_DAYS)[number], ((quote: string, days: number, gender?: CharacterGender) => string)[]> = {
  1: [
    (quote, _days, gender) => {
      const v = voice('push', PUSH_VOICE);
      return fill(quote ? v.comeback[1][0].withQuote : v.comeback[1][0].noQuote, { quote }, gender);
    },
    (quote, _days, gender) => {
      const v = voice('push', PUSH_VOICE);
      return fill(quote ? v.comeback[1][1].withQuote : v.comeback[1][1].noQuote, { quote }, gender);
    },
  ],
  2: [
    (_q, _d, gender) => fill(voice('push', PUSH_VOICE).comeback[2][0], {}, gender),
    (_q, _d, gender) => fill(voice('push', PUSH_VOICE).comeback[2][1], {}, gender),
  ],
  3: [
    (_q, _d, gender) => fill(voice('push', PUSH_VOICE).comeback[3][0], {}, gender),
    (_q, _d, gender) => fill(voice('push', PUSH_VOICE).comeback[3][1], {}, gender),
  ],
  5: [
    (_q, _d, gender) => fill(voice('push', PUSH_VOICE).comeback[5][0], {}, gender),
    (_q, _d, gender) => fill(voice('push', PUSH_VOICE).comeback[5][1], {}, gender),
  ],
  7: [
    (_q, days, gender) => fill(voice('push', PUSH_VOICE).comeback[7][0], { days }, gender),
    (_q, _d, gender) => fill(voice('push', PUSH_VOICE).comeback[7][1], {}, gender),
  ],
  14: [
    (_q, _d, gender) => fill(voice('push', PUSH_VOICE).comeback[14][0], {}, gender),
    (_q, _d, gender) => fill(voice('push', PUSH_VOICE).comeback[14][1], {}, gender),
  ],
};

/** The morning after you talked: their diary has a page about you. */
export const diaryNudgeLines = makeDynamicArray(() => voice('push', PUSH_VOICE).diaryNudge);

/** 20:00 when today's check-in gift is still waiting. */
export const giftNudgeLines = makeDynamicArray(() => voice('push', PUSH_VOICE).giftNudge);
