import type { PlannedPush, PushKind } from './plan';

/**
 * The words of a push when the model is on. The phone schedules pushes while the app is open, so a
 * friend's line is written ahead (`writePushLines`) and kept here by the event it belongs to. A push
 * with no line yet stays unsent: a stock line in their mouth is worse than a quiet friend. Only a
 * reminder the user counts on goes out in its stock words.
 */
export type PushLines = Record<string, { line: string; writtenAt: string }>;

const WRITTEN = new Set<PushKind>(['morning', 'evening', 'brief', 'day', 'week', 'world', 'remind', 'followUp', 'life', 'care', 'touch', 'birthday', 'comeback', 'diary', 'gift']);

const HOUR_MS = 3_600_000;
/** A line about today reads wrong by tomorrow. */
const FRESH_MS = 24 * HOUR_MS;
/** A comeback line waits for an absence, and is written so it can. */
const COMEBACK_FRESH_MS = 14 * 24 * HOUR_MS;
/** Only what comes soon: most of a two-day plan changes before it is due. */
const AHEAD_MS = 30 * HOUR_MS;
/** One app open pays for a few lines; the next open writes the rest. */
const MAX_PER_RUN = 5;

const isWritten = (push: PlannedPush) => WRITTEN.has(push.kind) && !!push.line && !push.textKey;

/** The event a line belongs to. A comeback's id carries the day it was planned, its step does not change. */
export function writtenKey(push: PlannedPush) {
  if (push.kind !== 'comeback') return push.id;
  const [kind, , step, characterId] = push.id.split(':');
  return `${kind}:${step}:${characterId}`;
}

/** How many days gone a comeback push speaks to. */
export const comebackDays = (push: PlannedPush) => (push.kind === 'comeback' ? Number(push.id.split(':')[2]) : undefined);

/** The kept line if it is still good; an empty one means the model chose to say nothing. */
function freshLine(push: PlannedPush, lines: PushLines, now: Date) {
  const kept = lines[writtenKey(push)];
  if (!kept) return undefined;
  const limit = push.kind === 'comeback' ? COMEBACK_FRESH_MS : FRESH_MS;
  return now.getTime() - Date.parse(kept.writtenAt) <= limit ? kept.line : undefined;
}

/** The push as it goes out with the model on: its written line, its stock words, or not at all. */
export function withWritten(push: PlannedPush, lines: PushLines, now: Date): PlannedPush[] {
  if (!isWritten(push)) return [push];
  const line = freshLine(push, lines, now);
  if (line) return [{ ...push, line }];
  return push.timeSensitive && line === undefined ? [push] : [];
}

/** The lines to ask the model for now, soonest first; comebacks wait behind what is near. */
export function pushesToWrite(plan: readonly PlannedPush[], lines: PushLines, now: Date): PlannedPush[] {
  return plan
    .filter((push) => isWritten(push) && freshLine(push, lines, now) === undefined)
    .filter((push) => push.kind === 'comeback' || push.at.getTime() - now.getTime() <= AHEAD_MS)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_PER_RUN);
}

export function prunePushLines(lines: PushLines, now: Date): PushLines {
  return Object.fromEntries(Object.entries(lines).filter(([, kept]) => now.getTime() - Date.parse(kept.writtenAt) <= COMEBACK_FRESH_MS));
}
