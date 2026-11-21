import { dayKey } from '../../mock/time';
import type { Message } from '@/types';

const HOUR = 3_600_000;
const MINUTE = 60_000;

/** Calls, system lines and cards stand alone: no run of bubbles reaches across them. */
const standsAlone = (m: Message) => m.kind === 'call' || m.kind === 'system' || !!m.card;

const sameSpeaker = (a: Message, b: Message) => a.author === b.author && a.characterId === b.characterId;

/** A new day: the list shows "Today" above the next message. */
export const dayBreak = (prev: Message | undefined, next: Message) => !prev || dayKey(prev.createdAt) !== dayKey(next.createdAt);

/** A message shows its time, except when the same speaker's next line says the same minute. */
export const showsTime = (message: Message, next: Message | undefined) =>
  !next ||
  !sameSpeaker(message, next) ||
  standsAlone(next) ||
  Math.floor(Date.parse(message.createdAt) / MINUTE) !== Math.floor(Date.parse(next.createdAt) / MINUTE);

const sameRun = (a: Message | undefined, b: Message | undefined) =>
  !!a &&
  !!b &&
  sameSpeaker(a, b) &&
  !standsAlone(a) &&
  !standsAlone(b) &&
  !dayBreak(a, b) &&
  Date.parse(b.createdAt) - Date.parse(a.createdAt) < HOUR;

/**
 * Where a message sits in its run of bubbles (iOS Messages): the run's first bubble carries a
 * group member's name, its last one the avatar and the tail.
 */
export function runOf(data: readonly Message[], index: number) {
  const message = data[index];
  return {
    dayBreak: dayBreak(data[index - 1], message),
    showTime: showsTime(message, data[index + 1]),
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
