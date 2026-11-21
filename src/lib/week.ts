import type { DiaryEntry, DiaryMood, Message, Thread, WeekStats } from '@/types';

/**
 * The weekly recap (presence B7, owner 2026-10-26: logic left to the agent). On Sunday evening the
 * friend the user spent the most days with looks back on the week together: one text in their
 * temper and a small card of numbers (days together, messages, wins, diary pages).
 *
 * - **Who:** the friend who may write first that the user wrote to on the most days of the last 7
 *   (ties to the closest). Fewer than `minDays` days with anyone and there is no recap: an empty week
 *   has nothing to look back on, and the comeback ladder already speaks to absence.
 * - **What they know:** only their own: days and messages in their chat, their threads that went well
 *   or got done ("your exam went well"), quests done with them, and diary pages shared with them.
 *   A private diary page stays private.
 * - **Never nagging:** it celebrates what happened and never counts what did not; the mood of the
 *   shared pages only colours the words. Once a week, Sunday at `RECAP_AT` (moved to an hour the
 *   user is active in), behind its own switch (`settings.weeklyRecap`).
 *
 * Pure and server-portable: the server computes the same numbers and its model writes the text
 * from them (`src/ai/week-prompt.ts`).
 */

/** Why they wrote first (`Message.reach`): the recap's reply ideas. */
export const WEEK_REACH = 'week';
/** Sunday, 18:30. */
export const RECAP_AT = { weekday: 0, hour: 18, minute: 30 } as const;
export const WEEK_RULES = {
  /** At least this many days with the friend for a recap. */
  minDays: 2,
  /** Wins named in the text. */
  maxWins: 3,
} as const;

const DAY_MS = 86_400_000;
const localDay = (d: Date) => d.toDateString();
const inWeek = (iso: string, at: Date) => {
  const t = Date.parse(iso);
  return t <= at.getTime() && t > at.getTime() - 7 * DAY_MS;
};

/** The week's numbers with one friend, as of `at`. */
export function weekWith(
  characterId: string,
  chat: readonly Message[],
  threads: readonly Thread[],
  diary: readonly DiaryEntry[],
  at: Date,
): WeekStats {
  const mine = chat.filter((m) => m.author === 'me' && inWeek(m.createdAt, at));
  const settled = threads.filter((t) => t.characterId === characterId && t.status === 'closed' && t.closedAt && inWeek(t.closedAt, at));
  const wins = settled.filter((t) => t.kind !== 'quest' && (t.outcome === 'good' || t.outcome === 'done')).map((t) => t.about);
  const pages = diary.filter((d) => d.sharedWithCharacterId === characterId && inWeek(dayStart(d.date), at));
  return {
    days: new Set(mine.map((m) => localDay(new Date(m.createdAt)))).size,
    messages: mine.length,
    wins: wins.slice(0, WEEK_RULES.maxWins),
    winCount: wins.length,
    quests: settled.filter((t) => t.kind === 'quest' && t.outcome === 'done').length,
    pages: pages.length,
    ...(pages.length ? { mood: topMood(pages.map((p) => p.mood)) } : {}),
  };
}

/** Diary dates are day keys ("2026-10-27"): the page counts from the start of its day. */
function dayStart(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toISOString();
}

function topMood(moods: readonly DiaryMood[]): DiaryMood {
  const count = new Map<DiaryMood, number>();
  moods.forEach((m) => count.set(m, (count.get(m) ?? 0) + 1));
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export interface RecapState {
  /** Friends who may write first, closest first. */
  writers: readonly string[];
  chats: Readonly<Record<string, readonly Message[]>>;
  threads: readonly Thread[];
  diary: readonly DiaryEntry[];
}

/** The recap at `at`: who sends it and the numbers, or null (not this week, or nothing to look back on). */
export function weeklyRecap({ writers, chats, threads, diary }: RecapState, at: Date): { characterId: string; week: WeekStats } | null {
  // Once a week: a recap in the last six days is this week's.
  const sent = Object.values(chats).some((chat) =>
    chat.some((m) => m.reach === WEEK_REACH && Date.parse(m.createdAt) > at.getTime() - 6 * DAY_MS && Date.parse(m.createdAt) <= at.getTime()),
  );
  if (sent) return null;
  let best: { characterId: string; week: WeekStats } | null = null;
  for (const id of writers) {
    const week = weekWith(id, chats[id] ?? [], threads, diary, at);
    if (week.days >= WEEK_RULES.minDays && (!best || week.days > best.week.days)) best = { characterId: id, week };
  }
  return best;
}

/** The recap's time in the week of `day`: that day's 18:30 when it is a Sunday, else null. */
export function recapAt(day: Date): Date | null {
  if (day.getDay() !== RECAP_AT.weekday) return null;
  const d = new Date(day);
  d.setHours(RECAP_AT.hour, RECAP_AT.minute, 0, 0);
  return d;
}
