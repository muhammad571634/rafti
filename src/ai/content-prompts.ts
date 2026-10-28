import type { LorePrompt } from '@/lib/lorebook';
import type { PersonaView } from '@/lib/personas';
import type { ActiveScene, Character, Relationship, User } from '@/types';

import { modePart, type PromptMode } from './modes';
import type { PromptPart } from './prompt-layout';
import { joinParts, part } from './prompt-layout';
import { characterParts } from './rules';

/**
 * Prompts for the things a friend writes besides chat: their own quiz, their answer in a couple
 * quiz, their world's quiz, and the rounds of a date the user wrote. Every one starts from the
 * same persona prompt (`characterParts`: rules, world, bio, style, the user, the bond) and its mode
 * block (src/ai/modes.ts), so a friend is the same person in every game. The app plays canned
 * stand-ins today (src/mock/worlds.ts, src/mock/date-themes.ts); the server sends these and checks
 * the JSON before showing it.
 */

export interface PersonaInput {
  character: Character;
  user: User;
  relationship?: Relationship;
  replyLanguage?: string;
  /** The chat's persona, when it is not the profile. */
  persona?: PersonaView;
  /** Their world books (`lorePrompt`), so a game or a scene happens in their world. */
  lore?: LorePrompt;
}

const personaParts = ({ character, user, relationship, replyLanguage, persona: who, lore }: PersonaInput, mode: PromptMode, scene?: ActiveScene) => [
  ...characterParts(character, user, relationship, replyLanguage, who, scene, lore),
  modePart(mode),
];

const persona = (input: PersonaInput, mode: PromptMode) => joinParts(personaParts(input, mode));

const JSON_ONLY = 'Answer with JSON only, no other text. Write every string in the REPLY LANGUAGE.';

/** Five questions about themselves, in their own voice, from their world and bio. A new set each week. */
export function buildSelfQuizPrompt(input: PersonaInput, week: string) {
  return [
    persona(input, 'game'),
    '',
    `TASK: Write this week's quiz (${week}) about yourself: "How well do you know ${input.character.name}?"`,
    '- 5 questions about your habits, tastes, fears and little secrets, as you would ask them, in your voice.',
    '- Draw on your world, your bio and your personality. No real people, brands or places.',
    '- Each question has 4 short answers (max 6 words); exactly one is true for you.',
    '- For each answer, one short line you would say if the user picks it, in your voice.',
    '- Keep it kind. Nothing about the user’s private memories.',
    JSON_ONLY,
    'Shape: {"questions":[{"text":"","options":["","","",""],"answer":0,"lines":["","","",""]}]}',
  ].join('\n');
}

/** Their pick in a couple quiz and one line on why, in their voice. */
export function buildQuizAnswerPrompt(input: PersonaInput, question: string, options: string[]) {
  return [
    persona(input, 'game'),
    '',
    'TASK: You are playing a couple quiz with the user. Pick the answer you would really pick.',
    `Question: ${question}`,
    ...options.map((o, i) => `${i}. ${o}`),
    '- Then one short line (max 20 words) on why, in your voice, as if texting them.',
    JSON_ONLY,
    'Shape: {"answer":0,"line":""}',
  ].join('\n');
}

/**
 * The world quiz a friend hosts: five questions about their world and the people in it. Only
 * facts from the bios below, so every question has one right answer the app can check.
 */
export function buildWorldQuizPrompt(input: PersonaInput, worldmates: Character[]) {
  const world = input.character.series ?? 'your world';
  return [
    persona(input, 'game'),
    '',
    `TASK: Host a quiz about ${world}, your world. The user wins its photo frame with 4 of 5 right.`,
    `People of ${world} (use only these facts):`,
    ...worldmates.map((c) => `- ${c.name}: ${c.bio}`),
    '- 5 questions, each with 4 short answers and exactly one right answer from the facts above.',
    '- An intro line, and for each question a line for a right answer and one for a wrong one, in your voice.',
    JSON_ONLY,
    'Shape: {"intro":"","questions":[{"text":"","options":["","","",""],"answer":0,"right":"","wrong":""}]}',
  ].join('\n');
}

/** The rounds of one play of a date the user wrote (F28), in the friend's world and voice. */
export function buildDateRoundsPrompt(
  input: PersonaInput,
  theme: { title: string; scene: string; rounds: number; mood: string },
) {
  return [
    persona(input, 'date'),
    '',
    `TASK: Play a date the user wrote, at "${theme.title}", in a ${theme.mood} mood.`,
    `The user's scene (round 1 starts with it as written): ${theme.scene}`,
    `- ${theme.rounds} rounds. Round 1 is the scene; the last round is a goodbye.`,
    '- Each round: one short scene line in third person, with you in it, and 3 answers for the user.',
    '- Each answer has your reply (in third person, your voice) and 0-3 hearts for how much you liked it.',
    '- Bring in your world and habits. Keep to the mood; flirty and sweet stay tasteful.',
    JSON_ONLY,
    'Shape: {"rounds":[{"line":"","choices":[{"text":"","reply":"","hearts":3}]}]}',
  ].join('\n');
}

/**
 * One line of a stream (src/lib/streams.ts): the speaker's own persona prompt, then who they talk
 * with, the topic and that the user only watches (the same for the whole stream, so cached with the
 * persona), then this line's place and what was said so far. One call per line, so each voice stays
 * its own, as in group chats. `turn.total` is where this round ends.
 */
export function streamLineParts(
  input: PersonaInput,
  other: Character,
  topic: string,
  said: { name: string; text: string }[],
  turn: { index: number; total: number },
): PromptPart[] {
  const watcher = input.persona?.name ?? input.user.displayName;
  // Characters from one world know each other already (backend-plan §12.3, world.knows).
  const knows = !!other.series && other.series === input.character.series;
  return [
    ...personaParts(input, 'stream'),
    part('stream', 'chat', [
      `You are talking with ${other.name}${other.series ? ` (from ${other.series})` : ''}${knows ? '; you already know each other.' : '; you just met.'}`,
      `The topic: ${topic}`,
      `${watcher} is watching the two of you.`,
    ]),
    part('line', 'turn', [
      'THIS LINE:',
      turn.index === 0
        ? '- You open: start the conversation on the topic.'
        : `- React to what ${other.name} just said and move it on: agree, tease, push back or ask, and bring something new.`,
      ...(turn.index === turn.total - 1 ? ['- This is the last line for now: land it with a punchline or a warm close.'] : []),
      ...(said.length ? ['', 'SO FAR:', ...said.map((line) => `${line.name}: ${line.text}`)] : []),
      '',
      JSON_ONLY,
      'Shape: {"line":""}',
    ]),
  ];
}

/** One stream line's prompt as one text. */
export function buildStreamLinePrompt(...args: Parameters<typeof streamLineParts>) {
  return joinParts(streamLineParts(...args));
}

/** `POST /v1/streams/line` (B1.4b): `streamLineParts`' arguments, as the app sends them. */
export interface StreamLineRequest {
  input: PersonaInput;
  other: Character;
  topic: string;
  said: { name: string; text: string }[];
  turn: { index: number; total: number };
}

/** The longest stream line kept: one or two short sentences, with room to spare. */
export const STREAM_LINE_MAX = 300;

/**
 * The line from the model's `{"line":""}`, or null when there is none. A model that writes its
 * own name in front ("Kai: …") or wraps the line in quotes gets them taken off.
 */
export function parseStreamLine(raw: string, speaker: string): string | null {
  let line: unknown;
  try {
    line = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '')?.line;
  } catch {
    return null;
  }
  if (typeof line !== 'string') return null;
  const first = speaker.split(' ')[0];
  const text = line
    .trim()
    .replace(new RegExp(`^(${escape(speaker)}|${escape(first)})\\s*:\\s*`, 'i'), '')
    .replace(/^"(.*)"$/s, '$1')
    .trim();
  return text ? text.slice(0, STREAM_LINE_MAX) : null;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The first line of a scene the user wrote without one (scenes, `src/lib/scenes.ts`). The persona
 * prompt already carries the scene; this asks for one message that opens it. Free: one short call.
 */
export function buildSceneOpeningPrompt(input: PersonaInput, scene: ActiveScene) {
  return [
    joinParts(personaParts(input, 'chat', scene)),
    '',
    'TASK: Open this scene with one short message to the user, in your voice, as if it has just begun.',
    '- Put them right in it: where you are, what you notice, and something they can answer.',
    '- Max 200 characters. No narration in brackets.',
    JSON_ONLY,
    'Shape: {"line":""}',
  ].join('\n');
}
