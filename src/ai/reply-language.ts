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

/** New-language messages in a row the user must send before the lock moves. */
export const SWITCH_AFTER = 2;

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
