import { dayKey } from '../mock/time';
import type { PushSent, Temper } from '../types';

import { PUSH_BUDGET, type Budget } from './budget';
import type { PlannedPush, PushKind } from './plan';

/**
 * The push planner's brakes (docs/push-plan.md), apart from the content it gathers (`plan.ts`) so
 * they can be tested on their own (0z189): which push wins when the day is short, which never count,
 * and how quiet hours, sleep, the day budget, the gaps and each friend's share are applied. Pure and
 * server-portable, with relative imports only.
 */

/** Lower runs first when the budget is short. */
export const PRIORITY: Record<PushKind, number> = {
  call: 0,
  remind: 0,
  birthday: 0,
  followUp: 1,
  care: 1,
  touch: 1,
  life: 3,
  brief: 2,
  day: 2,
  week: 3,
  world: 4,
  unread: 2,
  morning: 3,
  evening: 3,
  voiceNote: 3,
  comeback: 3,
  diary: 4,
  gift: 5,
  spins: 6,
  // What the user loses at midnight: a streak first (it is a bond), then the shells that burn.
  streak: 1,
  shells: 2,
};

/** Never dropped for the budget or the spacing: the user asked for them. */
const EXEMPT = new Set<PushKind>(['call', 'remind', 'birthday']);

/** Whether a planned push uses the day's budget (and so goes into `daily.pushLog`). */
export const counts = (push: Pick<PlannedPush, 'kind' | 'timeSensitive'>) => !EXEMPT.has(push.kind) && !push.timeSensitive;

/** A counted push as the budget sees it: when, and from whom. */
type Slot = Pick<PlannedPush, 'at' | 'characterId'>;

const SHIFT_STEP_MS = 15 * 60_000;

/**
 * A hello belongs to its hour (0z189, seen in a real plan: a friend's "good morning" pushed to 11:18,
 * two hours after she had already asked how the user's head was). A greeting moves at most this far
 * for the gaps; with no room by then it is not sent, since that friend already wrote that morning.
 */
const GREETINGS = new Set<PushKind>(['morning', 'evening']);
export const GREETING_SHIFT_MS = 60 * 60_000;

/**
 * Applies quiet hours and sleep, the day budget, the gap between pushes and each friend's share.
 * Today's pushes that already went out (`sent`) count first, so planning again later in the day
 * never hands out a fresh budget. Exempt kinds and time-sensitive texts before the user's own plans
 * always stay (a user-set call or plan may ring at night). A push too close to a more important one
 * moves later the same day instead of being dropped; it is dropped only when the day has no room left
 * (a greeting: no room within the hour).
 */
export function capped(
  all: PlannedPush[],
  isQuiet: (d: Date) => boolean,
  budget: Budget,
  temperFor: (characterId: string) => Temper,
  sent: readonly PushSent[],
): PlannedPush[] {
  const kept: PlannedPush[] = [];
  const counted: Slot[] = sent.map((p) => ({ at: new Date(p.at), characterId: p.characterId }));
  const ordered = [...all].sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind] || a.at.getTime() - b.at.getTime());

  for (const push of ordered) {
    if (!counts(push)) {
      kept.push(push);
      continue;
    }
    const day = dayKey(push.at);
    const sameDay = counted.filter((p) => dayKey(p.at) === day);
    if (sameDay.length >= budget.day) continue;
    const theirs = push.characterId ? sameDay.filter((p) => p.characterId === push.characterId) : [];
    if (push.characterId && theirs.length >= budget.perFriend(temperFor(push.characterId))) continue;
    const latest = GREETINGS.has(push.kind) ? push.at.getTime() + GREETING_SHIFT_MS : undefined;
    const at = firstFreeSlot(push.at, sameDay, theirs, isQuiet, latest);
    if (!at) continue;
    const placed = { ...push, at };
    kept.push(placed);
    counted.push(placed);
  }
  return kept.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * The wanted time, or the first later time that day (and no later than `latest`) outside quiet hours
 * and sleep with room around it: `minGapMs` from any counted push, `friendGapMs` from the same friend's.
 */
function firstFreeSlot(wanted: Date, sameDay: Slot[], theirs: Slot[], isQuiet: (d: Date) => boolean, latest = Infinity): Date | null {
  const day = dayKey(wanted);
  for (let t = wanted.getTime(); dayKey(new Date(t)) === day && t <= latest; t += SHIFT_STEP_MS) {
    const candidate = new Date(t);
    if (isQuiet(candidate)) continue;
    const spaced = sameDay.every((p) => Math.abs(p.at.getTime() - t) >= PUSH_BUDGET.minGapMs);
    const spacedFromFriend = theirs.every((p) => Math.abs(p.at.getTime() - t) >= PUSH_BUDGET.friendGapMs);
    if (spaced && spacedFromFriend) return candidate;
  }
  return null;
}
