import type { Character } from '@/types';

/**
 * "New characters first" (Pro, backend-plan §15.10): an official character opens to Pro and
 * the trial on its release day and to everyone else EARLY_ACCESS_DAYS later (owner decision
 * 2026-10-13: 7 days). Until it is released nobody sees it. Characters without `releasedAt`
 * (the launch cast, user creations) are always open.
 */
export const EARLY_ACCESS_DAYS = 7;

const DAY = 86_400_000;

type Released = Pick<Character, 'releasedAt'>;

/** It is out: no release date, or the date has passed. */
export function isReleased(character: Released, now: number) {
  return !character.releasedAt || Date.parse(character.releasedAt) <= now;
}

/** When everyone may add it; null when it was never new. */
export function opensToAllAt(character: Released): number | null {
  return character.releasedAt ? Date.parse(character.releasedAt) + EARLY_ACCESS_DAYS * DAY : null;
}

/** Released and still inside the early-access week: the "New" row on Find. */
export function isNewCharacter(character: Released, now: number) {
  const opens = opensToAllAt(character);
  return isReleased(character, now) && opens != null && now < opens;
}

/** Whether this user may add it now. */
export function canAddCharacter(character: Released, pro: boolean, now: number) {
  return isReleased(character, now) && (pro || !isNewCharacter(character, now));
}
