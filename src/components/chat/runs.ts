import { dayKey } from '@/mock';
import type { Message } from '@/types';

const HOUR = 3_600_000;

/** Calls, system lines and cards stand alone: no run of bubbles reaches across them. */
const standsAlone = (m: Message) => m.kind === 'call' || m.kind === 'system' || !!m.card;

/** A new day, or an hour of quiet: the list shows "Today 00:58" above the next message. */
export const timeBreak = (prev: Message | undefined, next: Message) =>
  !prev ||
  dayKey(prev.createdAt) !== dayKey(next.createdAt) ||
  Date.parse(next.createdAt) - Date.parse(prev.createdAt) >= HOUR;

const sameRun = (a: Message | undefined, b: Message | undefined) =>
  !!a &&
  !!b &&
  a.author === b.author &&
  a.characterId === b.characterId &&
  !standsAlone(a) &&
  !standsAlone(b) &&
  !timeBreak(a, b);

/**
 * Where a message sits in its run of bubbles (iOS Messages): the run's first bubble carries a
 * group member's name, its last one the avatar and the tail.
 */
export function runOf(data: readonly Message[], index: number) {
  const message = data[index];
  return {
    timeBreak: timeBreak(data[index - 1], message),
    runStart: !sameRun(data[index - 1], message),
    runEnd: !sameRun(message, data[index + 1]),
  };
}

/** The user's last message: only it shows "Read" or "Delivered" under it. */
export function lastMineId(data: readonly Message[]) {
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].author === 'me' && !standsAlone(data[i])) return data[i].id;
  }
  return undefined;
}
