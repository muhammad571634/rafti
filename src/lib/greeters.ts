const WEEK_MS = 7 * 86_400_000;
const DAY_MS = 86_400_000;

/** Whose turn it is: each day moves on by one, and the night starts half way round from the morning. */
function turn(slotKey: string, count: number) {
  const [day, slot] = slotKey.split(':');
  const [y, m, d] = day.split('-').map(Number);
  return (Date.UTC(y, m - 1, d) / DAY_MS + (slot === 'night' ? Math.ceil(count / 2) : 0)) % count;
}

/**
 * Who says good morning or good night in a slot (`2026-11-02:morning`). `closest` holds the friends
 * who may write first, closest first. The closest always greets, and the second greeting goes round
 * the others talked with in the last week, so the same two do not write every day while the rest go
 * quiet. With nobody else from this week it is the next closest. No state and no randomness: the
 * planner and the app work it out apart and must name the same friends.
 */
export function greeters(closest: readonly string[], talkedAt: (id: string) => number, slotKey: string, now: Date): string[] {
  const [first, ...others] = closest;
  if (!first) return [];
  const recent = others.filter((id) => now.getTime() - talkedAt(id) <= WEEK_MS);
  const second = recent.length ? recent[turn(slotKey, recent.length)] : others[0];
  return second ? [first, second] : [first];
}
