import type { Alarm } from '@/types';

/**
 * What setting things up with a friend costs, priced on what it makes the model do (owner,
 * 2026-11-07: "price it honestly"; numbers in docs/cost-ledger.md). One shell is about one of their
 * texts, as a message costs. Pure: the app's store and screens read it, tests check it.
 *
 * A plan (from Us or a card in the chat): they text about it on their own about three times (a
 * reminder, luck before it, "how did it go?"), each a model call. Moving it is free.
 */
export const PLAN_SETUP_SHELLS = 3;

/**
 * An alarm a friend wakes you with, new or with a new time, days or friend: their "alarm set" line
 * and the wake-up talk are model calls. A melody-only alarm, a new label or sound, and switching
 * one on or off are free; so is moving one set from the chat (`replacesId`).
 */
export const ALARM_SETUP_SHELLS = 2;

/** What saving this alarm costs; the same rule makes the friend say it in their chat. */
export function alarmSetupCost(
  alarms: readonly Pick<Alarm, 'id' | 'characterId' | 'hour' | 'minute' | 'repeat'>[],
  fields: Pick<Alarm, 'characterId' | 'hour' | 'minute' | 'repeat'>,
  id?: string,
): number {
  if (!fields.characterId) return 0;
  const old = id ? alarms.find((a) => a.id === id) : undefined;
  const changed =
    !old || old.characterId !== fields.characterId || old.hour !== fields.hour || old.minute !== fields.minute || old.repeat.join() !== fields.repeat.join();
  return changed ? ALARM_SETUP_SHELLS : 0;
}
