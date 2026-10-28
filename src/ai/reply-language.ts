/**
 * Reply-language lock: a character answers in the language the user writes in and
 * never mixes in another one (BIMOBIMO dropped English lines into Russian chats).
 * The lock is kept per chat and goes into the prompt as REPLY LANGUAGE
 * (`buildCharacterPrompt`), so the character's own messages (good morning, missed
 * call, diary, alarm) use it too.
 *
 * Pure policy: the server detects each user message's language (a detector library
 * or the model) and stores it with the message; this decides what the lock becomes.
 */

import type { Message } from '@/types';

/** New-language messages in a row the user must send before the lock moves. */
export const SWITCH_AFTER = 2;

/**
 * The REPLY LANGUAGE while no chat has a stored lock: the language the user writes in, any language
 * in the world (owner, 2026-10-28: a global app; no list of languages in code). It stays put in the
 * cached chat tier; `languageCue` repeats it in the turn tier with their own latest words.
 */
export const FOLLOW_USER_LANGUAGE =
  "the language of the user's latest messages, whatever language that is, written naturally as a native speaker would text; English if unclear. Never mix languages.";

/** How much of their latest words the cue quotes. */
const CUE_CHARS = 160;

/** What the user wrote or said in a chat, oldest first: the words `languageCue` reads. */
export const userLines = (messages: readonly Pick<Message, 'author' | 'card' | 'text' | 'transcript'>[]) =>
  messages.filter((m) => m.author === 'me' && !m.card).map((m) => (m.text ?? m.transcript ?? '').trim()).filter(Boolean);

/**
 * The turn's language reminder, last in the prompt where the model weighs it most: their latest
 * lines, quoted, so the model reads the language off them (a light model told only "their
 * language" in the cached prefix answered Spanish in English: eval set, B1.5). No detector and no
 * list: it works for every language the model knows. [] before they have written.
 */
export function languageCue(userLines: readonly string[]): string[] {
  const latest = userLines.map((line) => line.trim()).filter(Boolean).slice(-2).join(' / ');
  if (!latest) return [];
  const quote = latest.length > CUE_CHARS ? `${latest.slice(0, CUE_CHARS)}…` : latest;
  return [
    `LANGUAGE: write every message in the language their latest messages are in ("${quote}"). If they just switched language for two messages in a row, switch with them; a word or two from another language changes nothing.`,
  ];
}

/** "pt-BR" and "pt" are one language for the lock. */
export function baseLanguage(tag: string) {
  return tag.trim().split(/[-_]/)[0].toLowerCase();
}

/**
 * The chat's reply language after the user's latest messages.
 *
 * @param current  the chat's lock so far; undefined until the user's first message
 * @param detected languages of the user's messages, oldest first; undefined = too
 *                 short to tell ("ok", an emoji, a number), which never moves the lock
 * @param fallback the app's language, used before the user has written anything
 */
export function lockedReplyLanguage(
  current: string | undefined,
  detected: readonly (string | undefined)[],
  fallback: string,
) {
  const known = detected.filter((tag): tag is string => !!tag?.trim()).map(baseLanguage);
  if (!current) return known.at(-1) ?? baseLanguage(fallback);

  const lock = baseLanguage(current);
  const tail = known.slice(-SWITCH_AFTER);
  const switched = tail.length === SWITCH_AFTER && tail.every((tag) => tag === tail[0]) && tail[0] !== lock;
  return switched ? tail[0] : lock;
}
