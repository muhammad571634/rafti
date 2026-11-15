import type { DayLog, WidgetKind } from '@/types';

/**
 * Pure parts of the calm Today (audit 2026-11-15 §6.1, approved prototype `docs/prototypes/today-calm.html`):
 * the friend's presence and the two widget slots.
 */

/** Today shows two widgets at most (was four): hero, "waiting for you", two widgets, one More. */
export const TODAY_SLOTS = 2;

/**
 * The friend's waking hours: they live their day on the user's clock (`src/ai/own-day.ts`), so the
 * green dot shows from 7:00 to 23:00 and never in the small hours (audit §8.2.1).
 */
export const awakeAt = (hour: number) => hour >= 7 && hour < 23;

/** How long something they said of their day still reads as what they are doing now. */
export const FRESH_DAY_NOTE_MS = 3 * 60 * 60 * 1000;

/**
 * What they are up to, from what they told the user today (`Relationship.ownDay`): the newest note
 * of the user's day `today`, if it is under three hours old. Undefined when there is none.
 */
export function freshDayNote(ownDay: readonly DayLog[] | undefined, today: string, now: number): string | undefined {
  const notes = ownDay?.find((d) => d.date === today)?.notes ?? [];
  let best: { at: number; text: string } | undefined;
  for (const n of notes) {
    const at = Date.parse(n.at);
    if (!Number.isFinite(at) || now - at > FRESH_DAY_NOTE_MS || at - now > 60_000) continue;
    if (!best || at > best.at) best = { at, text: n.text.trim() };
  }
  return best?.text || undefined;
}

/**
 * Four slots become two without losing the user's own: their filled slots keep their order and the
 * first two stay; one filled slot keeps an empty one beside it; none filled keeps both empty.
 * Anything else (a bad save) becomes the default pair.
 */
export function twoWidgets(slots: unknown, fallback: readonly WidgetKind[]): (WidgetKind | null)[] {
  if (!Array.isArray(slots)) return [...fallback];
  const filled = slots.filter((k): k is WidgetKind => typeof k === 'string' && k.length > 0);
  const kept = [...new Set(filled)].slice(0, TODAY_SLOTS);
  return [...kept, ...Array<null>(TODAY_SLOTS - kept.length).fill(null)];
}
