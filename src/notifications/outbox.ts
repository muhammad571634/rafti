import { dayKey } from '../mock/time';

import type { PlannedPush, PushKind } from './plan';
import type { ReplyIdea } from '@/types';

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
  /** The push's written replies: the chat shows the same ones under the line. */
  ideas?: ReplyIdea[];
  /** Thread texts this line already says (the morning brief). */
  covers?: string[];
}

/** A diary or gift nudge points elsewhere, an unread line is in the chat already. */
const LANDS = new Set<PushKind>(['morning', 'evening', 'brief', 'day', 'week', 'world', 'remind', 'followUp', 'life', 'care', 'touch', 'birthday', 'comeback']);

export function toOutbox(plan: readonly PlannedPush[]): OutboxItem[] {
  return plan.flatMap((push) =>
    LANDS.has(push.kind) && push.characterId && push.line
      ? [{ id: push.id, kind: push.kind, characterId: push.characterId, line: push.line, at: push.at.toISOString(), reach: push.reach, ideas: push.ideas, covers: push.covers }]
      : [],
  );
}

/** What has gone out by now, in the order it went. */
export function dueOutbox(outbox: readonly OutboxItem[], now: Date): OutboxItem[] {
  return outbox.filter((item) => Date.parse(item.at) <= now.getTime()).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/** What `alreadySaid` reads: the marks the app sets when it says these things itself. */
export interface SaidState {
  daily: { greetedSlots: readonly string[]; lifeSent?: readonly string[]; worldNewsSent?: readonly string[] };
  schedules: readonly { id: string; reminded: boolean; followedUp?: boolean }[];
  care: readonly { id: string; done?: boolean }[];
  threads: readonly { touches: readonly { id: string; sent?: boolean }[] }[];
  user: { birthdayWishedYear?: number };
}

/**
 * Whether the app already said what this line says, so landing it would say it twice (0z189: the
 * pushes now stay handed over while the app is open, and the app may get there first). Only lines
 * that settle one thing each: a reminder, a follow-up, a check-in, a thread's touch, a family moment,
 * world news, the birthday, the brief and the evening question. A greeting slot can carry two friends'
 * hellos, so a greeting is not checked: the re-plan after the app's own hello takes its push away.
 */
export function alreadySaid(item: OutboxItem, state: SaidState): boolean {
  const marks = landedMarks([item]);
  if ((item.kind === 'brief' || item.kind === 'day') && marks.slots.some((slot) => state.daily.greetedSlots.includes(slot))) return true;
  if (marks.reminded.some((id) => state.schedules.find((x) => x.id === id)?.reminded)) return true;
  if (marks.followedUp.some((id) => state.schedules.find((x) => x.id === id)?.followedUp)) return true;
  if (marks.life.some((key) => state.daily.lifeSent?.includes(key))) return true;
  if (marks.care.some((id) => state.care.find((x) => x.id === id)?.done)) return true;
  if (marks.worlds.some((key) => state.daily.worldNewsSent?.includes(key))) return true;
  if (marks.birthdayYear !== undefined && state.user.birthdayWishedYear === marks.birthdayYear) return true;
  const touch = item.kind === 'touch' ? item.id.slice(item.id.indexOf(':') + 1) : undefined;
  return !!touch && state.threads.some((thread) => thread.touches.some((x) => x.id === touch && x.sent));
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
