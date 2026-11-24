import type { CallRecord } from '@/types';

/** What iOS Phone Recents merges on: the same friend, and the same kind of call. */
export const callKind = (c: Pick<CallRecord, 'missed' | 'direction'>) => (c.missed ? 'missed' : c.direction);

/**
 * Calls (newest first) folded into runs as iOS Phone Recents does (audit #14): back-to-back calls with
 * the same friend and of the same kind (missed, incoming, outgoing) become one row, "Milo (3)". A
 * call with someone else, or of another kind, starts a new run, so the order of what happened stays.
 */
export function callRuns<C extends Pick<CallRecord, 'id' | 'characterId' | 'missed' | 'direction'>>(calls: C[]): C[][] {
  const runs: C[][] = [];
  for (const call of calls) {
    const run = runs.at(-1);
    const head = run?.[0];
    if (run && head && head.characterId === call.characterId && callKind(head) === callKind(call)) run.push(call);
    else runs.push([call]);
  }
  return runs;
}
