/**
 * The hour's mood for the first run (onboarding in motion, 0z250): which greeting the night says,
 * who leads the deck of first friends, and whether the scene should move quietly (after midnight).
 * Pure, so the screen and its tests read the same rules.
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

/** `picks` reordered so the hour's friend comes first; ids not in `picks` change nothing. */
export function deckForHour(picks: readonly string[], part: PartOfDay): string[] {
  const lead = LEAD[part];
  return picks.includes(lead) ? [lead, ...picks.filter((id) => id !== lead)] : [...picks];
}

/** After midnight the scene breathes slower: fewer stars, a slower ring, longer motion. */
export const isQuietHour = (part: PartOfDay) => part === 'night';

/** The greeting's two i18n keys under `onboarding.` for this part of the day. */
export function greetingKeys(part: PartOfDay): { title: string; line: string } {
  const base = { morning: 'dayMorning', afternoon: 'dayAfternoon', evening: 'dayEvening', night: 'dayNight' }[part];
  return { title: `onboarding.${base}`, line: `onboarding.${base}Line` };
}
