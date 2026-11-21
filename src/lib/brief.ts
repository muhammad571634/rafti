import type { ScheduleItem, Thread } from '@/types';

/**
 * The morning brief (presence B5, owner 2026-10-26): on a day the user has something on, the
 * morning text knows it. Instead of a plain "good morning", the closest friend who holds something
 * for today says what is ahead ("Morning! Exam at 09:00 today. You've got this 💪"), with reply ideas.
 *
 * - **Who:** one friend a morning, the closest who may write first and holds a plan or an open
 *   thread for today. A real person only knows what they were told, so each friend lists only their
 *   own things; another friend's plans keep their own texts.
 * - **What:** plans and threads happening today and still ahead at the morning time (untimed ones
 *   too), soonest first, at most `BRIEF_MAX`. Goals and quests are not plans; a thread they already
 *   wished luck for is left out, and a plan that has a thread shows once.
 * - **No double texts:** the brief wishes luck, so the thread's own "before" text for later that day
 *   is covered (`covers`) and never sent on its own.
 *
 * It rides on the "Morning messages" switch and the morning time. Pure and server-portable: the
 * server picks the same friend and items, and its model writes the words (`src/ai/brief-prompt.ts`).
 */

/** Why they wrote first (`Message.reach`): the brief's reply ideas. */
export const BRIEF_REACH = 'brief';
/** A brief lists this many things at most; the rest keep their own texts. */
export const BRIEF_MAX = 3;

export interface BriefItem {
  title: string;
  /** "HH:MM"; absent for "some time today". */
  time?: string;
  threadId?: string;
  scheduleId?: string;
}

export interface Brief {
  characterId: string;
  items: BriefItem[];
  /** Ids of thread texts the brief says for them ("before" texts later that day). */
  covers: string[];
}

const pad = (n: number) => String(n).padStart(2, '0');
const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const clockOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
/** Untimed threads are kept at midnight of their day. */
const untimed = (d: Date) => d.getHours() === 0 && d.getMinutes() === 0;

/** One friend's things for the day of `at` that are still ahead of it. */
export function briefFor(characterId: string, schedules: readonly ScheduleItem[], threads: readonly Thread[], at: Date): Brief | null {
  const day = localDay(at);
  const now = clockOf(at);
  const items: BriefItem[] = [];
  const covers = new Map<string, string[]>();
  const theirs = threads.filter((t) => t.characterId === characterId);

  for (const thread of theirs) {
    if (thread.status !== 'open' || thread.kind === 'goal' || thread.kind === 'quest') continue;
    // A thing with no time ("an exam today") has no `happensAt`; its good-luck text gives the day.
    const luck = thread.touches.find((x) => x.phase === 'before');
    const happens = thread.happensAt ? new Date(thread.happensAt) : luck ? new Date(luck.at) : null;
    if (!happens || localDay(happens) !== day) continue;
    const time = !thread.happensAt || untimed(happens) ? undefined : clockOf(happens);
    if (time && time <= now) continue;
    // They already wished luck: the morning has nothing new to say about it.
    if (thread.touches.some((x) => x.phase === 'before' && x.sent)) continue;
    items.push({ title: thread.about, time, threadId: thread.id, ...(thread.scheduleId ? { scheduleId: thread.scheduleId } : {}) });
    covers.set(thread.id, thread.touches.filter((x) => x.phase === 'before' && !x.sent && localDay(new Date(x.at)) === day && Date.parse(x.at) >= at.getTime()).map((x) => x.id));
  }

  // A plan with a thread is said once, through the thread (or not at all when that thread is done).
  const linked = new Set(theirs.map((t) => t.scheduleId).filter(Boolean));
  for (const item of schedules) {
    if (item.characterId !== characterId || item.date !== day || item.followedUp || linked.has(item.id)) continue;
    if (item.time && item.time <= now) continue;
    items.push({ title: item.title, time: item.time, scheduleId: item.id });
  }

  if (!items.length) return null;
  const sorted = items.sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99')).slice(0, BRIEF_MAX);
  return { characterId, items: sorted, covers: sorted.flatMap((x) => (x.threadId ? (covers.get(x.threadId) ?? []) : [])) };
}

/** Today's brief: from the first friend in `writers` (closest first) who holds something for the day. */
export function morningBrief(writers: readonly string[], schedules: readonly ScheduleItem[], threads: readonly Thread[], at: Date): Brief | null {
  for (const id of writers) {
    const brief = briefFor(id, schedules, threads, at);
    if (brief) return brief;
  }
  return null;
}
