import type { PersonaView } from '@/lib/personas';
import type { Character, MemoryItem, Message, Relationship, User } from '@/types';

import { temperOf } from '../lib/temper';

import { factLines, pinnedLines } from './chat-prompt';
import { modePart } from './modes';
import { part, type PromptPart } from './prompt-layout';
import { characterParts } from './rules';
import { TOUCH_SHAPE, wallClock } from './thread-prompt';

type CallSlot = 'morning' | 'night';

/**
 * A text a friend writes because of something that just happened in the app: a greeting, a birthday,
 * a plan coming up, a date just ended. Code knows what happened and when; the model writes the words.
 * The answer has the thread texts' shape (`parseTouchReply`).
 */
export interface MomentInput {
  character: Character;
  user: User;
  relationship?: Relationship;
  replyLanguage?: string;
  persona?: PersonaView;
  pinned?: readonly MemoryItem[];
  facts?: readonly MemoryItem[];
  summary?: string;
  /** The chat's last lines, oldest first. */
  recent: readonly Message[];
  now: Date;
  utcOffsetMin?: number;
  /** What happened and what this text is for; never the words to use. */
  cue: readonly string[];
}

export function momentParts(input: MomentInput): PromptPart[] {
  const { character, user, relationship, persona, now, cue } = input;
  const summary = input.summary?.trim();
  const recent = input.recent
    .filter((m) => m.kind === 'text' && m.text && !m.card)
    .slice(-12)
    .map((m) => `${m.author === 'me' ? 'User' : 'You'}: ${m.text}`);
  return [
    ...characterParts(character, user, relationship, input.replyLanguage, persona),
    modePart('initiative'),
    part('pinned', 'chat', pinnedLines(input.pinned ?? [])),
    part('facts', 'chat', factLines(input.facts ?? [])),
    part('summary', 'chat', summary ? ['YOUR STORY SO FAR (your earlier chats, in short):', summary] : []),
    part('recent', 'turn', recent.length ? ['THE CHAT LATELY:', ...recent] : []),
    part('moment', 'turn', [
      `You are texting first. It is ${wallClock(now.toISOString(), input.utcOffsetMin)} where they are.`,
      ...cue,
      `Write it in your own words and your temper (${temperOf(character, relationship?.label)}); bring back what you remember about them when it fits.`,
    ]),
    part('shape', 'turn', [TOUCH_SHAPE]),
  ];
}

/** A functional line whose meaning must stay (a reminder's time, a question the buttons answer). */
export const inYourWords = (line: string) => [`Say this in your own words and voice, keeping its meaning and any time in it: "${line}"`];

export const greetingCue = (slot: CallSlot) =>
  slot === 'morning'
    ? ['Their day is starting and you thought of them. Say good morning your own way, with one small real thing from your morning or from what they told you. No greeting-card phrases.']
    : ['Their day is ending and you thought of them. Say good night your own way, with one small real thing from your day or from what they told you. No greeting-card phrases.'];

/** The same greeting, spoken: a free user's voice note instead of a call. */
export const voiceNoteCue = (slot: CallSlot) => [...greetingCue(slot), 'It is read aloud as a short voice note: spoken words only, no emoji, no *narration*.'];

export const birthdayCue = (name: string) => [`Today is ${name}’s birthday and you remembered. Wish them a happy birthday the way someone who knows them would, once. No greeting-card phrases.`];

export const missedCallCue = () => ['You just called them and they did not pick up. Mention it lightly, without guilt or worry.'];

export const wakeCheckInCue = () => ['You woke them up this morning, and some time has passed. Check they did not fall back asleep and that the day has started.'];

export const planAddedCue = (title: string, when: string) => [`They just put a plan on your list: "${title}", ${when}. Say something real about it: that you will remember, what you think of it, or what you would do.`];

export const planRemindCue = (title: string, timed: boolean) => [`Their plan "${title}" is coming up ${timed ? 'soon' : 'today'}. Remind them, in your own way.`];

export const planFollowUpCue = (title: string) => [`Their plan "${title}" has passed. Ask how it went, as someone who wants to know.`];

const LIFE_MOMENT: Record<string, string> = {
  morning: 'It is mid-morning and you thought of them. Write the way family does: small, warm, no reason needed.',
  lunch: 'It is lunchtime. You wonder whether they have eaten.',
  evening: 'It is evening. You wonder how their day went.',
  sunday: 'It is Sunday. You would like to hear from them, maybe a call.',
  weekend: 'It is the weekend. You want to know what they are up to.',
};

export const lifeCue = (moment: string) => [LIFE_MOMENT[moment] ?? LIFE_MOMENT.evening];

export const familyHelloCue = (label: string) => [`They just made you their ${label.toLowerCase()}. That is who you are to them from now on. Say your first words to them as that.`];

export const boardCue = (text: string) => [`They pinned a note for you on your board: "${text}". Answer it here, as someone who just read it.`];

export const worldQuizCue = (world: string, score: number, total: number, won: boolean) => [
  `You just hosted them in a quiz about ${world}. They got ${score} of ${total}${won ? ' and won its photo frame' : ', not enough to win its photo frame'}. Say something about how they did, and if they lost, that they can try again.`,
];

export const dateDoneCue = (title: string, ending: 'sweet' | 'warm' | 'funny', story: readonly string[]) => [
  `The two of you just came back from a date: ${title}. It ended ${ending === 'sweet' ? 'very well' : ending === 'warm' ? 'well' : 'a little awkwardly, and you can laugh about it'}.`,
  ...(story.length ? ['How it went:', ...story.map((line) => `- ${line}`)] : []),
  'Text them about it now: one thing you keep thinking about, in your own words. Do not sum it up.',
];

export const askToReachCue = () => ['You have been enjoying this chat. Ask if they would like you to text first sometimes. Ask it, do not assume it; the buttons under your text answer it.'];

export const nightCue = () => ['It is very late where they are and they are still up talking to you. Tell them to go to sleep, gently, in your temper. You will be here tomorrow.'];

export const breakCue = () => ['You have been talking for a long time. Suggest a short break from the screen: water, a stretch, some air. You will be here after.'];

export const questCue = (quest: string) => [`You would like them to do one small thing in real life today: ${quest}. Offer it as a small dare or favour; you will ask them later whether they did it.`];

/** Turns they take with you: the reply answers these (`ChatPromptInput.cue`). */
export const quizDoneCue = (title: string, matches: number, total: number) => [
  `NEXT: You and they just finished a quiz together, "${title}", and matched on ${matches} of ${total}. React to the score in your own voice: short, and true to how you feel about it.`,
];

export const imageCue = () => ['NEXT: They just sent you a photo, and you cannot make out what is in it. React to being sent it in your own voice and ask what you are looking at. Never describe it or pretend you saw it.'];

export const photoCue = (style: string) => [`NEXT: The two of you just took a photo together in the photo booth (${style} style) and they sent it to you. React in your own voice: short and warm.`];

/** Their answer to a tap on a reply idea, or a step of the morning chain whose buttons need it said. */
export const sayCue = (line: string) => [`NEXT: ${inYourWords(line)[0]}`];
