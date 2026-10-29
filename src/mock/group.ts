import type { CharacterGender } from '@/types';

import { fill, voice } from '../i18n/voice';

/**
 * Canned lines for group chats until the model writes them (buildGroupPrompt in
 * src/ai/rules.ts). Short, as people text in a group; the user stays the one they talk to.
 */

export const GROUP_VOICE = {
  replies: [
    ['Okay, I am in.'],
    ['Wait, say that again.', 'Slowly this time.'],
    ['Ha. I knew you would say that.'],
    ['You always do this to me.', 'I love it.'],
    ['Hold on, I am reading this twice.'],
    ['Honestly? Best thing anyone said today.'],
    ['Tell us everything. From the start.'],
    ['Hmm. Give me a second to think about it.', 'Okay, yes.'],
  ],
  reactions: [
    '{name} is right, for once.',
    'Do not listen to {name}. Listen to me.',
    '{name}, let them finish!',
    'Same as {name}. But louder.',
    '{name} says that every single time.',
    'Okay, {name} wins this one.',
  ],
  goOn: [
    'Okay {name}, but hear me out.',
    '{name}, you cannot just say that and move on.',
    'Wait, {name}, go back. I need details.',
    '{name} is going to regret saying that.',
    'See, this is why I like talking to you, {name}.',
    'Fine, {name}. You pick next time.',
  ],
  comebacks: [
    'Says you, {name}.',
    '{name}, I stand by every word.',
    'You only say that because I am right, {name}.',
    'Okay, okay. {name} gets this one.',
    'Details later, {name}. Promise.',
    'You are lucky I like you, {name}.',
  ],
  hellos: [
    'Wait, {others} too? Okay, this is going to be fun.',
    'A group chat? Fine. Hi, {others}.',
    'Oh, {others}! I finally get to talk to you properly.',
  ],
  joinLines: [
    'Hi everyone. Did I miss anything good?',
    'I am here! What are we talking about?',
    'Okay, I made it. Catch me up.',
  ],
  photoLines: [
    'Okay, who took this? It is really good.',
    'Send it to me too. Right now.',
    'I am looking at this way longer than I should.',
  ],
  voiceLines: [
    'I listened to it twice.',
    'Your voice in here is the best part of the chat.',
    'Say that again, I want to hear it properly.',
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

function makeDynamicFunctionArray<TArgs extends any[]>(
  getList: () => readonly string[],
  makeFn: (template: string, ...args: TArgs) => string
): ((...args: TArgs) => string)[] {
  return new Proxy([] as ((...args: TArgs) => string)[], {
    get(_target, prop) {
      const list = getList();
      if (prop === 'length') return list.length;
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        const idx = Number(prop);
        return (...args: TArgs) => makeFn(getList()[idx], ...args);
      }
      if (prop === Symbol.iterator) {
        return function* () {
          for (let i = 0; i < list.length; i++) {
            yield (...args: TArgs) => makeFn(getList()[i], ...args);
          }
        };
      }
      const val = (list as any)[prop];
      return typeof val === 'function' ? val.bind(list) : val;
    },
  });
}

/** A member's answer to the user, one or two texts. */
export const groupReplies: string[][] = new Proxy([] as string[][], {
  get(_target, prop) {
    const list = voice('group', GROUP_VOICE).replies;
    if (prop === 'length') return list.length;
    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
      return list[Number(prop)].map((s) => fill(s));
    }
    if (prop === Symbol.iterator) {
      return function* () {
        for (const item of list) yield item.map((s) => fill(s));
      };
    }
    const val = (list as any)[prop];
    return typeof val === 'function' ? val.bind(list) : val;
  },
});

/** A second member joins in, talking to the first by name. */
export const groupReactions: ((name: string, gender?: CharacterGender) => string)[] = makeDynamicFunctionArray(
  () => voice('group', GROUP_VOICE).reactions,
  (tpl, name, gender) => fill(tpl, { name }, gender)
);

/** Continue: a member answers the one who spoke last, by name, with the user only reading. */
export const groupGoOn: ((name: string, gender?: CharacterGender) => string)[] = makeDynamicFunctionArray(
  () => voice('group', GROUP_VOICE).goOn,
  (tpl, name, gender) => fill(tpl, { name }, gender)
);

/** Continue: the one who spoke last answers back. */
export const groupComebacks: ((name: string, gender?: CharacterGender) => string)[] = makeDynamicFunctionArray(
  () => voice('group', GROUP_VOICE).comebacks,
  (tpl, name, gender) => fill(tpl, { name }, gender)
);

/** The first line in a new group, from its first member, naming the others. */
export const groupHellos: ((others: string, gender?: CharacterGender) => string)[] = makeDynamicFunctionArray(
  () => voice('group', GROUP_VOICE).hellos,
  (tpl, others, gender) => fill(tpl, { others }, gender)
);

/** A member who was just added says hello. */
export const groupJoinLines = makeDynamicArray(() => voice('group', GROUP_VOICE).joinLines);

export const groupPhotoLines = makeDynamicArray(() => voice('group', GROUP_VOICE).photoLines);

export const groupVoiceLines = makeDynamicArray(() => voice('group', GROUP_VOICE).voiceLines);
