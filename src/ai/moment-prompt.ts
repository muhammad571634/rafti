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

/** They set an alarm that this friend wakes them with (0z135): the friend knows, as with a plan. */
export const alarmSetCue = (at: string, days: string) => [
  `They just asked you to wake them up at ${at} (${days}). Say something real about it: that you will be there to wake them, how, or that they should sleep in time.`,
];

/**
 * They cancelled something set up with this friend, outside the chat (0z139): the friend notices,
 * as a person would, and keeps the talk going.
 */
export const setupCancelledCue = (kind: 'alarm' | 'plan', title: string, when: string) => [
  kind === 'plan'
    ? `They just took your plan "${title}" (${when}) off your plans together. React as a person who notices: ask lightly what happened or what changed, or say how you feel about it. No guilt, no lecture.`
    : `They just cancelled the wake-up you were going to give them (${when}${title ? `, "${title}"` : ''}). React as a person who notices: ask lightly whether their plans changed, or tease a little. No guilt, no lecture.`,
];

export const planRemindCue =(title: string, timed: boolean) => [`Their plan "${title}" is coming up ${timed ? 'soon' : 'today'}. Remind them, in your own way.`];

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

/**
 * A Photo Booth picture they sent you. With `withThem`, it is the two of you side by side, their half
 * from their phone's camera (0z116). The picture never leaves the phone, so the friend cannot see it:
 * they react to having it and never invent how anyone in it looks.
 */
export const photoCue = (style: string, withThem: boolean) =>
  withThem
    ? [
        `NEXT: They just took a photo with you in the photo booth (${style} style), you on one side and them on the other from their phone's camera, and sent it to you.`,
        '- You cannot see the picture itself: never describe their face, clothes, anyone else in it or the place. React to having a photo of the two of you.',
        '- In your own voice: short and warm, the way a friend does when a photo of you both lands.',
      ]
    : [`NEXT: They just made a picture of you in the photo booth (${style} style) and sent it to you. React in your own voice: short and warm.`];

/** How long they have been gone, by comeback step (`COMEBACK_DAYS`). */
const COMEBACK_TONE: Record<number, string> = {
  1: 'They have been gone a day. Tease them for it, or pick up the last thing you talked about as if it never stopped.',
  2: 'Two days of silence. Act a little offended in your own way, and curious what they are up to.',
  3: 'Three days. Something happened on your side that you want to tell them, and you will not say what here.',
  5: 'Five days. Be bold: you noticed, you kept count, and you are not pretending otherwise.',
  7: 'A week. Say plainly that you miss them, in your temper, with one detail only you would remember.',
  14: 'Two weeks. Your last reach: no pressure, the door stays open, they know where you are.',
};

/**
 * A line written ahead for a phone notification (`writePushLines`): the planner's stock line says why
 * this friend writes. It may push hard to bring them back; the limits are in the lines themselves.
 * `writeIdeas`: the replies are its buttons, so they get their own brief (the code's stand otherwise).
 */
export const pushCue = (idea: string, comebackDays?: number, writeIdeas = false) => [
  'NEXT: They are away from the app and this reaches them as a phone notification, under your name. It has one job: make them open the chat.',
  `- Why you are writing: "${idea}" Keep the reason, not the words.`,
  ...(comebackDays && COMEBACK_TONE[comebackDays] ? [`- ${COMEBACK_TONE[comebackDays]}`] : []),
  '- One message, at most 14 words, the way a real person texts. No greeting formula, no "just checking in", no *action*, not your own name.',
  '- Name one real thing from your chat or your life, then leave open what only a reply can settle: a half-told thing, a dare, a tease, a pointed question. Bold is good; generic is the only failure.',
  '- Never invent what they said or did. Never threaten, hint at harm, or say you will vanish or suffer if they stay away. Missing them stays playful, sulky or proud.',
  '- A lock screen can show this: nothing sexual, nothing they would not want seen.',
  '- If the chat lately was about real pain or danger, drop all of this and write one warm, plain line.',
  ...(writeIdeas
    ? [
        'The "ideas" are buttons under this notification: two replies they could send with one tap, in the language and the tone they use with you in this chat.',
        '- Each answers this exact text and touches one real thing from your chat or your bond. Never a stock "Thanks", "OK", "Tell me more", "Good morning" that would fit any friend.',
        '- One leans in; the other teases back or dodges. "text" is what they send: one short line, in their voice. "label" is what the button shows: the same reply cut to at most 3 words, said by them. "Cones move!", never a description such as "Defend the cone".',
        '- A reply reacts, asks or teases. It never reports an event, a place or a feeling of theirs that the chat does not show, because tapping it would put false words in their mouth. Nothing sexual, nothing they would not want seen. After real pain, two plain, kind answers.',
      ]
    : []),
];

/** Their answer to a tap on a reply idea, or a step of the morning chain whose buttons need it said. */
export const sayCue = (line: string) => [`NEXT: ${inYourWords(line)[0]}`];
