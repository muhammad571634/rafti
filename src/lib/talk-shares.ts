import type { Message } from '@/types';

export interface TalkShare {
  characterId: string;
  /** Lines said in this chat this month, both sides. */
  lines: number;
  /** Whole percent of the shown friends' lines; the shown shares add up to 100. */
  percent: number;
}

/**
 * Who you talked with this month (Us, "Who you talked with"): the friends whose one-to-one chats had
 * the most lines since the month began, both sides counted, system lines and failed sends left out.
 * At most `top` friends; their percents add up to exactly 100 (largest remainder). Fewer than two
 * friends with lines give an empty list: one orb at 100% says nothing.
 */
export function talkShares(
  chats: readonly { conversationId: string; characterId: string }[],
  messages: Readonly<Record<string, readonly Message[] | undefined>>,
  since: number,
  top = 3,
): TalkShare[] {
  const counted = chats
    .map(({ conversationId, characterId }) => ({
      characterId,
      lines: (messages[conversationId] ?? []).filter(
        (m) => (m.kind === 'text' || m.kind === 'voice' || m.kind === 'image') && !m.failed && !m.pending && Date.parse(m.createdAt) >= since,
      ).length,
    }))
    .filter((c) => c.lines > 0)
    .sort((a, b) => b.lines - a.lines)
    .slice(0, top);
  if (counted.length < 2) return [];

  const total = counted.reduce((sum, c) => sum + c.lines, 0);
  const exact = counted.map((c) => (c.lines / total) * 100);
  const percents = exact.map(Math.floor);
  let left = 100 - percents.reduce((a, b) => a + b, 0);
  const byRemainder = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    percents[i] += 1;
    left -= 1;
  }
  return counted.map((c, i) => ({ ...c, percent: percents[i] }));
}

/** Midnight on the first of this month, local time. */
export function monthStart(now: Date = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}
