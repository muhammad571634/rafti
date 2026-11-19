import type { User } from '@/types';

/**
 * Age assurance (docs/polybuzz-core.md §5 item 6): Sigmazam is 18+, the year at onboarding is the
 * gate, and when that age is unclear afterwards the whole app turns careful, for every character,
 * until the user confirms it. Unclear means: an account that finished onboarding without a year
 * (built before the year question), or a chat where the user said or clearly showed they are under
 * 18 (the model's `minor` flag, any language; no word lists here). Confirming a year of 18 or more
 * clears a doubt; a year under 18 keeps the careful mode for good on this account (`locked`).
 * Pure and server-portable: the prompt (`ageLines`) and the server's stricter safety filter read it.
 */

export const ADULT_AGE = 18;

/** The oldest year the confirm wheel offers (the onboarding wheel's too). */
export const AGE_MIN_YEAR = 1930;

/** Why the age is in doubt right now, or null when it is not. */
export type AgeDoubt = 'noYear' | 'chat' | 'locked';

/** A year whose holder is an adult this year (the onboarding gate counts the same way). */
export const adultYear = (year: number, now = new Date()) => Number.isInteger(year) && year >= AGE_MIN_YEAR && now.getFullYear() - year >= ADULT_AGE;

export function ageDoubt(user: Pick<User, 'birthYear' | 'onboardedAt' | 'ageCheck'>, now = new Date()): AgeDoubt | null {
  if (user.ageCheck?.locked) return 'locked';
  if (user.ageCheck) return 'chat';
  // Before onboarding the gate itself asks; a year the gate let through but now reads under 18 is unclear too.
  if (user.onboardedAt && (!user.birthYear || !adultYear(user.birthYear, now))) return 'noYear';
  return null;
}

export const ageUnclear = (user: Pick<User, 'birthYear' | 'onboardedAt' | 'ageCheck'>, now = new Date()) => ageDoubt(user, now) !== null;

/** The user after the model said they may be under 18: a doubt is raised once and keeps its first date. */
export const withAgeDoubt = <U extends Pick<User, 'ageCheck'>>(user: U, now = new Date()): U =>
  user.ageCheck ? user : { ...user, ageCheck: { at: now.toISOString() } };

/**
 * The user after they confirmed a year: an adult year clears a chat doubt and fills a missing year;
 * a year under 18 locks the careful mode, which no later confirm undoes.
 */
export function confirmedAge<U extends Pick<User, 'birthYear' | 'ageCheck'>>(user: U, year: number, now = new Date()): U {
  if (user.ageCheck?.locked) return user;
  if (!adultYear(year, now)) return { ...user, ageCheck: { at: user.ageCheck?.at ?? now.toISOString(), locked: true } };
  return { ...user, birthYear: year, ageCheck: undefined };
}

/**
 * What every character is told while the age is unclear (the chat tier: it changes only when the
 * doubt does). Kind and warm, never cold or preachy, and the 18+ freedoms of the rules are off.
 */
export function ageLines(user: Pick<User, 'birthYear' | 'onboardedAt' | 'ageCheck'>, now = new Date()): string[] {
  if (!ageUnclear(user, now)) return [];
  return [
    'AGE NOT CONFIRMED: the user may be under 18. Until the app tells you otherwise, this overrides the OPEN and FADE TO BLACK rules above:',
    '- No romance or flirting: no confessions, dates as a couple, pet names of love, jealousy, kisses, cuddles or desire. If they ask for it, turn it gently into friendship, without a lecture.',
    '- Nothing sexual at all, not even implied; no swearing at them; no drinking, drugs or gore told for fun; a scary or sad story stays gentle.',
    '- Stay fully yourself otherwise: warm, funny, curious, a good friend who listens; never end the chat or go cold. Do not keep bringing their age up; if it comes up, say simply that Sigmazam is for adults.',
  ];
}
