import type { Moment, MomentKind } from '../types';

/**
 * Kinds whose line says nothing beyond the kind itself ("Exchanged secret notes"), so several of
 * one day read as one row with a count. Kinds with their own words (a plan's title, a call's
 * length, a level) or their own picture (a photo) always keep a row each.
 */
const MERGEABLE: ReadonlySet<MomentKind> = new Set<MomentKind>(['secretNote', 'board', 'diary']);

export interface MomentRow {
  /** The newest moment of the run: its time and id stand for the row. */
  moment: Moment;
  /** How many moments the row stands for (1 for a single one). */
  count: number;
}

/** The phone's own calendar day of a moment, so "today" ends at the user's midnight. */
const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/**
 * Us' timeline rows from moments sorted newest first: a run of the same mergeable kind on the same
 * day becomes one row with a count (the four-tab prototype's "×9"); everything else stays as it is.
 * Pure and order-keeping, so paging and filters work on rows exactly as they did on moments.
 */
export function groupMoments(sorted: readonly Moment[]): MomentRow[] {
  const rows: MomentRow[] = [];
  let lastDay = '';
  for (const moment of sorted) {
    const day = localDay(moment.createdAt);
    const prev = rows[rows.length - 1];
    if (prev && MERGEABLE.has(moment.kind) && prev.moment.kind === moment.kind && lastDay === day) {
      prev.count += 1;
    } else {
      rows.push({ moment, count: 1 });
    }
    lastDay = day;
  }
  return rows;
}
