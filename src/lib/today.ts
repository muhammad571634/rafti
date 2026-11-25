import type { DayLog, WidgetKind } from '@/types';

/**
 * Pure parts of the calm Today (audit 2026-11-15 §6.1, approved prototype `docs/prototypes/today-calm.html`):
 * the friend's presence, timeline boundaries, and 2x2 widget grid geometry.
 */

/** Today shows four widgets in a 2x2 grid, as iOS small widgets (owner, 2026-11-16; was two after §6.1). */
export const TODAY_SLOTS = 4;

/** Hours where Today's hero light (`dawn` 5, `day` 8, `evening` 17, `night` 21) or presence (`awake` 7, `asleep` 23) flips. */
const HERO_BOUNDARY_HOURS = [5, 7, 8, 17, 21, 23] as const;

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

/** Local midnight at the end of `now`'s day, so open screens roll `todayKey` over without polling. */
export function nextMidnightAt(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).getTime();
}

/**
 * Next exact moment Today's hero changes on its own: the next light/awake boundary hour, or when
 * the friend's active `ownDay` note ages past three hours.
 */
export function nextHeroWakeAt(now: number, ownDay?: readonly DayLog[], today?: string): number {
  const d = new Date(now);
  let nextBoundary: number | undefined;
  for (const h of HERO_BOUNDARY_HOURS) {
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0, 0).getTime();
    if (t > now) {
      nextBoundary = t;
      break;
    }
  }
  if (nextBoundary == null) {
    nextBoundary = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, HERO_BOUNDARY_HOURS[0], 0, 0, 0).getTime();
  }

  if (ownDay && today) {
    const notes = ownDay.find((entry) => entry.date === today)?.notes ?? [];
    let newestAt: number | undefined;
    for (const n of notes) {
      const at = Date.parse(n.at);
      if (!Number.isFinite(at) || now - at > FRESH_DAY_NOTE_MS || at - now > 60_000) continue;
      if (newestAt == null || at > newestAt) newestAt = at;
    }
    if (newestAt != null) {
      const expiresAt = newestAt + FRESH_DAY_NOTE_MS + 1;
      if (expiresAt > now && expiresAt < nextBoundary) return expiresAt;
    }
  }

  return nextBoundary;
}

/**
 * Any saved slots become four: the user's filled slots keep their order (repeats dropped, the first
 * four stay), then the defaults they do not have yet fill the rest, so every phone shows four widgets.
 * Anything else (a bad save) becomes the defaults.
 */
export function fourWidgets(slots: unknown, defaults: readonly WidgetKind[]): (WidgetKind | null)[] {
  const filled = Array.isArray(slots) ? slots.filter((k): k is WidgetKind => typeof k === 'string' && k.length > 0) : [];
  const kept = [...new Set([...filled, ...defaults])].slice(0, TODAY_SLOTS);
  return [...kept, ...Array<null>(TODAY_SLOTS - kept.length).fill(null)];
}

/** Top-left coordinates of slot `index` (0..3) inside the 2x2 widget grid. */
export function slotOrigin(index: number, width: number, height: number, gap: number): { x: number; y: number } {
  const col = index % 2;
  const row = Math.floor(index / 2);
  return { x: col * (width + gap), y: row * (height + gap) };
}

/**
 * Which slot (0..3) a dragged widget's centre sits over in the 2x2 grid, or `null` if it is outside
 * or still over its own slot `from`.
 */
export function hoverSlotAt(
  from: number,
  dx: number,
  dy: number,
  width: number,
  height: number,
  gap: number,
  count = TODAY_SLOTS,
): number | null {
  const start = slotOrigin(from, width, height, gap);
  const cx = start.x + width / 2 + dx;
  const cy = start.y + height / 2 + dy;
  for (let i = 0; i < count; i++) {
    if (i === from) continue;
    const cell = slotOrigin(i, width, height, gap);
    if (cx >= cell.x && cx <= cell.x + width && cy >= cell.y && cy <= cell.y + height) {
      return i;
    }
  }
  return null;
}

/**
 * How far a non-dragged slot `index` slides while `activeFrom` hovers over `hoverTo` (iPhone Home
 * Screen live swap preview: the hovered slot steps into the dragged slot's vacated spot).
 */
export function previewSlideForSlot(
  index: number,
  activeFrom: number | null,
  hoverTo: number | null,
  width: number,
  height: number,
  gap: number,
): { x: number; y: number } {
  if (activeFrom == null || hoverTo == null || activeFrom === hoverTo || index !== hoverTo) {
    return { x: 0, y: 0 };
  }
  const fromPos = slotOrigin(hoverTo, width, height, gap);
  const toPos = slotOrigin(activeFrom, width, height, gap);
  return { x: toPos.x - fromPos.x, y: toPos.y - fromPos.y };
}

/** Swaps two slots immutably when a drag finishes over another slot. */
export function swapWidgetSlots<T>(slots: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= slots.length || to >= slots.length) return [...slots];
  const next = [...slots];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
