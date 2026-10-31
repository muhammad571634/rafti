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

const FOLLOW = "the language of the user's latest messages, whatever language that is, written naturally as a native speaker would text";

/** "ja-JP" as the model reads it best ("Japanese (Japan)"); the tag itself where the runtime cannot name it. */
export function languageName(tag: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(tag) ?? tag;
  } catch {
    return tag;
  }
}

/**
 * The REPLY LANGUAGE while no chat has a stored lock: the language the user writes in, any language
 * in the world (owner, 2026-10-28: a global app; no list of languages in code). Before they have
 * written (a greeting, the morning text), their phone's language (`User.locale`, set from the phone
 * on every launch), else English. It stays put in the cached chat tier; `languageCue` repeats it in
 * the turn tier with their own latest words.
 */
export function followUserLanguage(phoneLocale?: string): string {
  const phone = phoneLocale?.trim() ? `${languageName(phoneLocale.trim())} (their phone's language)` : 'English';
  return `${FOLLOW}; before they have written, or when it is unclear, ${phone}. Never mix languages.`;
}

/** `followUserLanguage` with no phone language known. */
export const FOLLOW_USER_LANGUAGE = followUserLanguage();

/** The reply follows the user (`followUserLanguage`), rather than a stored lock. */
export const followsUser = (replyLanguage: string | undefined) => !!replyLanguage?.startsWith(FOLLOW);

/** How much of their latest words the cue quotes. */
const CUE_CHARS = 160;

/** What the user wrote or said in a chat, oldest first: the words `languageCue` reads. */
export const userLines = (messages: readonly Pick<Message, 'author' | 'card' | 'text' | 'transcript'>[]) =>
  messages.filter((m) => m.author === 'me' && !m.card).map((m) => (m.text ?? m.transcript ?? '').trim()).filter(Boolean);

/**
 * The turn's language reminder, last in the prompt where the model weighs it most: their latest
 * lines, quoted, so the model reads the language off them (a light model told only "their
 * language" in the cached prefix answered Spanish in English: eval set, B1.5). No detector and no
 * list: it works for every language the model knows. Before they have written, their phone's
 * language, named here too: told it only in the cached prefix, the model wrote a Japanese phone's
 * good morning in English (eval set, B1.8). [] when neither is known.
 */
export function languageCue(userLines: readonly string[], phoneLocale?: string): string[] {
  const latest = userLines.map((line) => line.trim()).filter(Boolean).slice(-2).join(' / ');
  if (!latest) {
    const phone = phoneLocale?.trim();
    return phone ? [`LANGUAGE: they have not written to you yet: write every message in ${languageName(phone)}, their phone's language.`] : [];
  }
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
