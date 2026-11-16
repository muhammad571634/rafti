/**
 * The hour's mood (design audit §8.2.4, "the app knows what hour it is"): the first run's greeting
 * and deck (0z250), the friend of the hour who leads Find, and the quiet hour after midnight, when
 * every sound in the app plays softer and haptics drop a step. Pure, so screens and tests read the
 * same rules.
 */
export type PartOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/** 00-04 night, 05-11 morning, 12-17 afternoon, 18-23 evening. */
export function partOfDay(hour: number): PartOfDay {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

/**
 * The friend the deck opens on at this hour. Mia "texts at 2:14 a.m., mid-shift", so she leads after
 * midnight; the rest follow the order they were picked in (docs/cast-2.md §5).
 */
const LEAD: Record<PartOfDay, string> = { morning: 'c_sam', afternoon: 'c_caleb', evening: 'c_milo', night: 'c_mia' };

/** The friend of the hour: the deck's first card on the first run, Find's first card after it. */
export const hourLead = (part: PartOfDay) => LEAD[part];

/**
 * `items` with the hour's friend first, the rest in their order. When `pool` is given and the
 * friend is not among `items`, they are taken from it (Find's row shows one face per circle, so the
 * friend of the hour may not be on it yet); never added from nowhere.
 */
export function leadFirst<T>(items: readonly T[], idOf: (item: T) => string, part: PartOfDay, pool: readonly T[] = items): T[] {
  const lead = LEAD[part];
  const found = items.find((i) => idOf(i) === lead) ?? pool.find((i) => idOf(i) === lead);
  return found ? [found, ...items.filter((i) => idOf(i) !== lead)] : [...items];
}

/** `picks` reordered so the hour's friend comes first; ids not in `picks` change nothing. */
export function deckForHour(picks: readonly string[], part: PartOfDay): string[] {
  return leadFirst(picks, (id) => id, part);
}

/** After midnight the scene breathes slower: fewer stars, a slower ring, longer motion. */
export const isQuietHour = (part: PartOfDay) => part === 'night';

/** How loud the app's sounds are in the quiet hour, against their daytime level. */
export const QUIET_HOUR_VOLUME = 0.5;

/** A sound's volume at this hour: half after midnight (00-04), as it is the rest of the day. */
export function hourVolume(base: number, hour: number = new Date().getHours()): number {
  return isQuietHour(partOfDay(hour)) ? base * QUIET_HOUR_VOLUME : base;
}

/** The greeting's two i18n keys under `onboarding.` for this part of the day. */
export function greetingKeys(part: PartOfDay): { title: string; line: string } {
  const base = { morning: 'dayMorning', afternoon: 'dayAfternoon', evening: 'dayEvening', night: 'dayNight' }[part];
  return { title: `onboarding.${base}`, line: `onboarding.${base}Line` };
}
