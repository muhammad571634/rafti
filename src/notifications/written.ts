import { detectCrisis } from '../ai/safety';
import { hashSeed } from '../lib/seeded';

import type { PlannedPush, PushKind } from './plan';
import type { ReplyIdea } from '@/types';

/**
 * The words of a push when the model is on. The phone schedules pushes while the app is open, so a
 * friend's line is written ahead (`writePushLines`) and kept here by the event it belongs to. A push
 * with no line yet stays unsent: a stock line in their mouth is worse than a quiet friend. Only a
 * reminder the user counts on goes out in its stock words. The model writes the replies under the
 * push in the same call, from the same chat, so the buttons are about this friend and not any friend.
 */
export type PushLines = Record<string, { line: string; writtenAt: string; ideas?: ReplyIdea[] }>;

// The gift, spins, streak and shells pushes are the app's own words (0z189), never the model's.
const WRITTEN = new Set<PushKind>(['morning', 'evening', 'brief', 'day', 'week', 'world', 'remind', 'followUp', 'life', 'care', 'touch', 'birthday', 'comeback', 'diary']);
/**
 * Pushes whose buttons the model writes. A check-in's, a thread's and the evening question's buttons
 * do something ("Still not great" asks again, "It's off" settles it, "Tell you later" keeps a diary
 * page from being written), so those stay the code's; a diary or gift nudge has no chat.
 */
const WRITES_IDEAS = new Set<PushKind>(['morning', 'evening', 'brief', 'week', 'world', 'remind', 'followUp', 'birthday', 'comeback']);

/** Why a line with written replies came, for a push with no reason of its own: a tap on them is free. */
export const PUSH_REACH = 'push';
const IDEAS_MAX = 3;

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

/** Whether the model writes this push's buttons too. */
export const writesIdeas = (push: PlannedPush) => isWritten(push) && WRITES_IDEAS.has(push.kind);

/** The action set of one push's written buttons; the OS takes letters, digits and "_". */
export const writtenCategory = (pushId: string) => `written_${hashSeed(pushId)}`;

/** The model's texts as one notification: a lock screen draws no **bold** and no *narration*. Other stars are words. */
export const pushLine = (lines: readonly string[]) =>
  lines
    .join(' ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|\s)\*[^*\s][^*]*\*(?=\s|$|[.,!?…])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

/** The model's replies as buttons: named, different, safe, and at least two, since one is no choice. */
export function pushIdeas(raw: readonly { label: string; text: string }[] | undefined): ReplyIdea[] | undefined {
  const labels = new Set<string>();
  const ideas = (raw ?? [])
    .map((idea) => ({ label: idea.label.trim(), text: idea.text.trim() }))
    .filter(({ label, text }) => {
      const key = label.toLowerCase();
      if (!label || !text || labels.has(key) || detectCrisis(text) || detectCrisis(label)) return false;
      labels.add(key);
      return true;
    })
    .slice(0, IDEAS_MAX);
  return ideas.length >= 2 ? ideas : undefined;
}

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

/**
 * The push as it goes out with the model on: its written line, its stock words, or not at all.
 * With previews off the written buttons stay home: they would tell what the hidden text is about.
 */
export function withWritten(push: PlannedPush, lines: PushLines, now: Date, preview = true): PlannedPush[] {
  if (!isWritten(push)) return [push];
  const line = freshLine(push, lines, now);
  if (line) {
    const ideas = preview && writesIdeas(push) ? lines[writtenKey(push)].ideas : undefined;
    return [{ ...push, line, ...(ideas?.length ? { ideas, reach: push.reach ?? PUSH_REACH } : {}) }];
  }
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
