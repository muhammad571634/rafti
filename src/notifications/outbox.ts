import { dayKey } from '../mock/time';

import type { PlannedPush, PushKind } from './plan';

/**
 * What the phone will show while the app is away. A notification is a message: once its time passes,
 * its line belongs in the chat with that time, whether the user tapped it, swiped it away or never saw
 * it. Without this a tap opens a chat whose last line is hours old. Kept when the app leaves and
 * landed when it comes back; `landedMarks` tells the app's own first texts not to write the same thing.
 */
export interface OutboxItem {
  id: string;
  kind: PushKind;
  characterId: string;
  line: string;
  at: string;
  reach?: string;
  /** Thread texts this line already says (the morning brief). */
  covers?: string[];
}

/** A diary or gift nudge points elsewhere, an unread line is in the chat already. */
const LANDS = new Set<PushKind>(['morning', 'evening', 'brief', 'day', 'week', 'world', 'remind', 'followUp', 'life', 'care', 'touch', 'birthday', 'comeback']);

export function toOutbox(plan: readonly PlannedPush[]): OutboxItem[] {
  return plan.flatMap((push) =>
    LANDS.has(push.kind) && push.characterId && push.line
      ? [{ id: push.id, kind: push.kind, characterId: push.characterId, line: push.line, at: push.at.toISOString(), reach: push.reach, covers: push.covers }]
      : [],
  );
}

/** What has gone out by now, in the order it went. */
export function dueOutbox(outbox: readonly OutboxItem[], now: Date): OutboxItem[] {
  return outbox.filter((item) => Date.parse(item.at) <= now.getTime()).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/** What each landed line settles, read from the ids the planner gave it (`pushCandidates`). */
export function landedMarks(items: readonly OutboxItem[]) {
  const afterKind = (id: string) => id.slice(id.indexOf(':') + 1);
  const marks = {
    slots: [] as string[],
    reminded: [] as string[],
    followedUp: [] as string[],
    life: [] as string[],
    care: [] as string[],
    touches: [] as string[],
    worlds: [] as string[],
    birthdayYear: undefined as number | undefined,
  };
  for (const item of items) {
    marks.touches.push(...(item.covers ?? []));
    switch (item.kind) {
      case 'morning':
      case 'evening':
      case 'brief':
      case 'day': {
        const [, day, slot] = item.id.split(':');
        marks.slots.push(`${day}:${slot}`);
        break;
      }
      case 'remind':
        marks.reminded.push(afterKind(item.id));
        break;
      case 'followUp':
        marks.followedUp.push(afterKind(item.id));
        break;
      case 'life':
        marks.life.push(afterKind(item.id));
        break;
      case 'care':
        marks.care.push(afterKind(item.id));
        break;
      case 'touch':
        marks.touches.push(afterKind(item.id));
        break;
      case 'world':
        marks.worlds.push(`${afterKind(item.id)}|${dayKey(new Date(item.at))}`);
        break;
      case 'birthday':
        marks.birthdayYear = new Date(item.at).getFullYear();
        break;
    }
  }
  return marks;
}
