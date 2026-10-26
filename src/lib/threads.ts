import type { Thread, ThreadOutcome, Touch, TouchPhase } from '@/types';

/**
 * Open threads (Presence 2, P2.3 / P2.4; owner 2026-10-26: "no templates, the AI runs it: there can
 * be a thousand topics"). Anything the user says that has a future (an exam at 9, a report to
 * finish, a fight with a brother, a trip, results next week, a plan to start running) becomes a
 * thread, and the friend comes back to it the way a person would: before it, after it, or to see
 * how it is going.
 *
 * Who decides what:
 * - **The model decides** what is worth a thread (any topic), when to write and why (`Touch.why`,
 *   free words such as "wish luck and check they are leaving on time"), the words of each text and
 *   its reply ideas when the moment comes, and when a thread is settled (the user said how it went,
 *   or that it is off). It returns these with each reply (`src/ai/thread-prompt.ts`).
 * - **This code only keeps the rules** a model must not break: no texts in the past or at night,
 *   none before a thing that already happened, a few per thread and spaced out, a few open threads
 *   per friend, old ones fade, a missed moment is dropped rather than sent hours late. The push
 *   budget and quiet hours on top are the planner's (`src/notifications/plan.ts`).
 *
 * Until the server runs, `src/mock/threads.ts` stands in for the model on the phone. Pure and
 * server-portable.
 */
export const THREAD_RULES = {
  /** Open threads one friend keeps; a new one pushes out the oldest. */
  maxOpen: 5,
  /** Texts one thread may plan. */
  maxTouches: 4,
  /** Two texts of one thread are at least this far apart. */
  minGapMs: 20 * 60_000,
  /** A text may still go this long after its moment; later it would sound odd, so it is dropped. */
  windowMs: 3 * 3_600_000,
  /** A thread with nothing left to send fades after this. */
  fadeMs: 14 * 86_400_000,
  /** Settled threads stay this long (the model can still see how it went), then go. */
  keepClosedMs: 7 * 86_400_000,
  /** Night: from 23:00 to 06:30 nobody texts "how did it go?"; it waits for 08:30. */
  nightFrom: 23,
  nightTo: 6.5,
  morningAt: 8.5,
} as const;

/** A text the model asked for, before the rules: when, why, and where it sits around the thing. */
export interface TouchDraft {
  at: string;
  why: string;
  phase: TouchPhase;
}

/** Texts that belong before the thing: good luck, time to go, sleep early. */
export const beforeThing = (phase: TouchPhase) => phase === 'before' || phase === 'leave' || phase === 'eve';

const hourOf = (d: Date) => d.getHours() + d.getMinutes() / 60;
const isNight = (d: Date) => hourOf(d) >= THREAD_RULES.nightFrom || hourOf(d) < THREAD_RULES.nightTo;

/** The next morning at 08:30 for a time that falls in the night. */
function nextMorning(d: Date) {
  const m = new Date(d);
  if (hourOf(d) >= THREAD_RULES.nightFrom) m.setDate(m.getDate() + 1);
  m.setHours(Math.floor(THREAD_RULES.morningAt), (THREAD_RULES.morningAt % 1) * 60, 0, 0);
  return m;
}

/**
 * The texts that may stand: in the future; good luck, time to go and sleep early before the thing,
 * "how did it go?" after it (checks, goals and quests whenever); a night text moved to the morning,
 * except one before the thing, which is dropped (it would wake them for nothing); in time order,
 * spaced by `minGapMs`, at most `maxTouches`. Ids are stable from the thread id, so the push and the
 * chat agree.
 */
export function ruleTouches(drafts: readonly TouchDraft[], threadId: string, now: Date, happensAt?: string): Touch[] {
  const happens = happensAt ? Date.parse(happensAt) : NaN;
  const placed = drafts
    .map((d) => ({ ...d, time: new Date(d.at) }))
    .filter((d) => !Number.isNaN(d.time.getTime()) && d.why.trim())
    .map((d) => (!beforeThing(d.phase) && isNight(d.time) ? { ...d, time: nextMorning(d.time) } : d))
    .filter((d) => !(beforeThing(d.phase) && isNight(d.time)))
    .filter((d) => d.time.getTime() > now.getTime() + 60_000)
    .filter(
      (d) =>
        Number.isNaN(happens) ||
        (beforeThing(d.phase) ? d.time.getTime() < happens : d.phase !== 'after' || d.time.getTime() >= happens),
    )
    .sort((a, b) => a.time.getTime() - b.time.getTime());
  const kept: typeof placed = [];
  for (const d of placed) {
    if (kept.length >= THREAD_RULES.maxTouches) break;
    if (kept.some((k) => Math.abs(k.time.getTime() - d.time.getTime()) < THREAD_RULES.minGapMs)) continue;
    kept.push(d);
  }
  return kept.map((d, i) => ({ id: `${threadId}:${i}`, at: d.time.toISOString(), why: d.why.trim(), phase: d.phase }));
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * The threads with one added: the same thing again (its plan, or the same words with the same
 * friend) replaces the old one's texts; past `maxOpen` the oldest open one of that friend fades.
 */
export function addThread(threads: readonly Thread[], thread: Thread): Thread[] {
  const same = (t: Thread) =>
    t.status === 'open' &&
    t.characterId === thread.characterId &&
    ((!!thread.scheduleId && t.scheduleId === thread.scheduleId) || norm(t.about) === norm(thread.about));
  const rest = threads.filter((t) => !same(t));
  const open = rest.filter((t) => t.status === 'open' && t.characterId === thread.characterId);
  const drop = new Set(
    open
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
      .slice(0, Math.max(0, open.length - THREAD_RULES.maxOpen + 1))
      .map((t) => t.id),
  );
  return [...rest.filter((t) => !drop.has(t.id)), thread];
}

export type TouchStep = 'send' | 'skip';

/** The texts whose moment came: to send, or to drop because it passed long ago or the thread is settled. */
export function dueTouches(threads: readonly Thread[], now: Date): { thread: Thread; touch: Touch; step: TouchStep }[] {
  return threads.flatMap((thread) =>
    thread.touches
      .filter((touch) => !touch.sent && Date.parse(touch.at) <= now.getTime())
      .map((touch) => ({
        thread,
        touch,
        step: (thread.status === 'open' && now.getTime() - Date.parse(touch.at) < THREAD_RULES.windowMs ? 'send' : 'skip') as TouchStep,
      })),
  );
}

/** The threads with those texts marked done (sent or dropped). */
export const markTouches = (threads: readonly Thread[], touchIds: ReadonlySet<string>): Thread[] =>
  threads.map((t) => (t.touches.some((x) => touchIds.has(x.id)) ? { ...t, touches: t.touches.map((x) => (touchIds.has(x.id) ? { ...x, sent: true } : x)) } : t));

/** Settles a thread: how it went (or that it is off); what is left unsent never goes. */
export const closeThread = (threads: readonly Thread[], id: string, outcome: ThreadOutcome, now: Date): Thread[] =>
  threads.map((t) => (t.id === id && t.status === 'open' ? { ...t, status: 'closed', outcome, closedAt: now.toISOString() } : t));

/** Adds texts the model asked for later to an open thread ("Not yet" → ask again tomorrow). */
export function extendThread(threads: readonly Thread[], id: string, drafts: readonly TouchDraft[], now: Date): Thread[] {
  return threads.map((t) => {
    if (t.id !== id || t.status !== 'open') return t;
    const pending = t.touches.filter((x) => !x.sent);
    const fresh = ruleTouches(drafts, `${t.id}:${t.touches.length}`, now, t.happensAt).slice(
      0,
      Math.max(0, THREAD_RULES.maxTouches - pending.length),
    );
    return { ...t, touches: [...t.touches, ...fresh] };
  });
}

/** The friend's thread the user is most likely answering: the one they texted about last, within a day. */
export function lastAsked(threads: readonly Thread[], characterId: string, now: Date): Thread | null {
  const asked = threads
    .filter((t) => t.status === 'open' && t.characterId === characterId)
    .map((t) => ({ t, at: Math.max(0, ...t.touches.filter((x) => x.sent && Date.parse(x.at) <= now.getTime()).map((x) => Date.parse(x.at))) }))
    .filter((x) => x.at > 0 && now.getTime() - x.at < 86_400_000)
    .sort((a, b) => b.at - a.at);
  return asked[0]?.t ?? null;
}

/** Settled threads after a week and open ones with nothing left after `fadeMs` go. */
export const pruneThreads = (threads: readonly Thread[], now: Date): Thread[] =>
  threads.filter((t) =>
    t.status === 'closed'
      ? now.getTime() - Date.parse(t.closedAt ?? t.createdAt) < THREAD_RULES.keepClosedMs
      : t.touches.some((x) => !x.sent) || now.getTime() - Date.parse(t.createdAt) < THREAD_RULES.fadeMs,
  );

/**
 * The thing moved ("the exam moved to 10"): the thread's time and every text not yet sent shift with
 * it, then the rules apply again (a "time to go" that now falls in the past is dropped).
 */
export function moveThread(threads: readonly Thread[], id: string, happensAt: string, now: Date): Thread[] {
  return threads.map((t) => {
    if (t.id !== id || t.status !== 'open' || !t.happensAt) return t;
    const delta = Date.parse(happensAt) - Date.parse(t.happensAt);
    const sent = t.touches.filter((x) => x.sent);
    const moved = t.touches
      .filter((x) => !x.sent)
      .map((x) => ({ at: new Date(Date.parse(x.at) + delta).toISOString(), why: x.why, phase: x.phase }));
    return { ...t, happensAt, touches: [...sent, ...ruleTouches(moved, `${t.id}:m${t.touches.length}`, now, happensAt)] };
  });
}

/** The friend's open plan still ahead (the newest), which "it moved to 10" is about, or null. */
export const nextPlan = (threads: readonly Thread[], characterId: string, now: Date): Thread | null =>
  threads
    .filter((t) => t.status === 'open' && t.characterId === characterId && t.happensAt && Date.parse(t.happensAt) > now.getTime() - 3_600_000)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
