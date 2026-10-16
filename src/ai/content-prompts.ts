import type { Character, Relationship, User } from '@/types';

import { buildCharacterPrompt } from './rules';

/**
 * Prompts for the things a friend writes besides chat: their own quiz, their answer in a couple
 * quiz, their world's quiz, and the rounds of a date the user wrote. Every one starts from the
 * same persona prompt (`buildCharacterPrompt`: rules, world, bio, style, the user, the bond), so a
 * friend is the same person in every game. The app plays canned stand-ins today (src/mock/worlds.ts,
 * src/mock/date-themes.ts); the server sends these and checks the JSON before showing it.
 */

export interface PersonaInput {
  character: Character;
  user: User;
  relationship?: Relationship;
  replyLanguage?: string;
}

const persona = ({ character, user, relationship, replyLanguage }: PersonaInput) =>
  buildCharacterPrompt(character, user, relationship, replyLanguage);

const JSON_ONLY = 'Answer with JSON only, no other text. Write every string in the REPLY LANGUAGE.';

/** Five questions about themselves, in their own voice, from their world and bio. A new set each week. */
export function buildSelfQuizPrompt(input: PersonaInput, week: string) {
  return [
    persona(input),
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
    persona(input),
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
    persona(input),
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
    persona(input),
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
