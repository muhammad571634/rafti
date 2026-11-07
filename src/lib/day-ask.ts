import type { DiaryMood, IdeaIntent, Message } from '@/types';

/**
 * The evening "how was today?" (presence B6, owner 2026-10-26: general, for every kind of person
 * and character). One friend asks at the evening time; the user's answer, tapped or typed, becomes
 * today's page in their diary with its mood, and the friend writes back on it.
 *
 * - **Who:** the friend the user talked with most today (they were there), else the closest one who
 *   may write first. When family already asks about the day (a parent's or a sibling's evening
 *   moment, `src/lib/kin.ts`), nobody else asks, and that answer goes into the diary too.
 * - **How often, by how the user answers:** two questions in a row left unanswered and it comes only
 *   every third day; four and it stops until the user answers one. Someone who loves it gets it
 *   daily; someone who ignores it is not nagged.
 * - **Never:** on a day with a crisis in that chat (care, not a diary prompt), and never a crisis
 *   text written into the diary.
 * - **The diary:** one page a day from it; "Tell you later" writes nothing and the next message is
 *   just a message. The mood comes from the idea or, typed, from the model (the mock reads a few
 *   words).
 *
 * Pure and server-portable: the server picks the same friend and keeps the same back-off, and its
 * model writes the question and reads the mood (`src/ai/day-prompt.ts`).
 */

/** Why they wrote first (`Message.reach`): the day's question. */
export const DAY_REACH = 'day';
/** Family evening moments ask the same thing; their answers go into the diary as well. */
const FAMILY_DAY = new Set(['life:parent:evening', 'life:sibling:evening']);

export const DAY_RULES = {
  /** An answer counts when it comes this soon after the question. */
  answerWithinMs: 12 * 3_600_000,
  /** The history the back-off looks at. */
  lookbackDays: 14,
  /** This many unanswered in a row: only every `slowEveryDays` days. */
  slowAfter: 2,
  slowEveryDays: 3,
  /** This many unanswered in a row: no more until the user answers one. */
  stopAfter: 4,
} as const;

const DAY_MS = 86_400_000;

export const isDayReach = (reach: string | undefined) => reach === DAY_REACH || (!!reach && FAMILY_DAY.has(reach));

const isLine = (m: Message) => m.kind !== 'system' && m.kind !== 'call' && !m.card;
const localDay = (d: Date) => d.toDateString();

/** Day questions asked in the last `lookbackDays`, oldest first, with whether each was answered in time. */
export function dayHistory(chats: readonly (readonly Message[])[], now: Date): { at: number; answered: boolean }[] {
  const since = now.getTime() - DAY_RULES.lookbackDays * DAY_MS;
  const out: { at: number; answered: boolean }[] = [];
  for (const chat of chats) {
    chat.forEach((m, i) => {
      const at = Date.parse(m.createdAt);
      if (m.author !== 'them' || m.reach !== DAY_REACH || at < since || at > now.getTime()) return;
      const answered = chat.slice(i + 1).some((r) => r.author === 'me' && Date.parse(r.createdAt) - at <= DAY_RULES.answerWithinMs);
      out.push({ at, answered });
    });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Whether today may have a question, given how the last ones went. */
export function mayAskToday(history: readonly { at: number; answered: boolean }[], now: Date): boolean {
  let unanswered = 0;
  for (let i = history.length - 1; i >= 0 && !history[i].answered; i--) unanswered++;
  if (history.some((h) => localDay(new Date(h.at)) === localDay(now))) return false;
  if (unanswered >= DAY_RULES.stopAfter) return false;
  if (unanswered >= DAY_RULES.slowAfter) {
    const last = history[history.length - 1].at;
    return now.getTime() - last >= (DAY_RULES.slowEveryDays - 0.5) * DAY_MS;
  }
  return true;
}

export interface DayAskState {
  /** Friends who may write first, closest first. */
  writers: readonly string[];
  /** Each friend's one-to-one chat. */
  chats: Readonly<Record<string, readonly Message[]>>;
  /** Friends whose family role asks about the day this evening themselves. */
  familyAsks: readonly string[];
}

/** Who asks about the day at `at`, or null (family asks, the back-off holds, or nobody may write). */
export function dayAsker({ writers, chats, familyAsks }: DayAskState, at: Date): string | null {
  if (familyAsks.length || !writers.length) return null;
  if (!mayAskToday(dayHistory(Object.values(chats), at), at)) return null;
  const today = localDay(at);
  const todays = (id: string) => (chats[id] ?? []).filter((m) => localDay(new Date(m.createdAt)) === today && Date.parse(m.createdAt) <= at.getTime());
  const fine = writers.filter((id) => !todays(id).some((m) => m.card === 'helpline'));
  if (!fine.length) return null;
  const mine = (id: string) => todays(id).filter((m) => m.author === 'me').length;
  // The most talked-with today; ties (and a quiet day) go to the closest.
  return fine.reduce((best, id) => (mine(id) > mine(best) ? id : best), fine[0]);
}

/**
 * The day question this new message of the user's answers: the line just before it is one, from
 * them, recent enough. Null for anything else, so a later message is just a message.
 */
export function answeredQuestion(chat: readonly Message[], mineId: string): Message | null {
  const lines = chat.filter(isLine);
  const i = lines.findIndex((m) => m.id === mineId);
  const before = i > 0 ? lines[i - 1] : undefined;
  if (!before || before.author !== 'them' || !isDayReach(before.reach)) return null;
  return Date.parse(lines[i].createdAt) - Date.parse(before.createdAt) <= DAY_RULES.answerWithinMs ? before : null;
}

/** The diary mood a tapped idea means; null when it means "not now". */
export function moodOfIntent(intent: IdeaIntent | undefined): DiaryMood | null | undefined {
  if (intent === 'later') return null;
  if (intent === 'good') return 'happy';
  if (intent === 'rough') return 'tired';
  return undefined;
}
