import type { KinGroup, LifeMomentKey } from './kin';
import { reachCare, reachThread } from './reply-ideas';
import type { CareKind, Thread, Touch, TouchPhase } from '@/types';

/**
 * Keeping in mind (A1-A3, owner 2026-10-26: "make it transparent"): what a friend took from the
 * chat, shown to the user so they can see it, fix it or stop it, and why a friend wrote first.
 * The model decides threads and texts (`src/ai/thread-prompt.ts`); this only reads them for the
 * screen. Pure and server-portable.
 */

/** The next text an open thread means to send, or undefined. */
export function nextTouch(thread: Thread): Touch | undefined {
  if (thread.status !== 'open') return undefined;
  return thread.touches.filter((x) => !x.sent).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0];
}

export interface MindSections {
  /** Open, with a time: soonest first. */
  soon: Thread[];
  /** Open, no set time (a task, a goal, a quest): by their next text. */
  following: Thread[];
  /** Settled in the last week: newest first. */
  settled: Thread[];
}

const nextAt = (t: Thread) => Date.parse(nextTouch(t)?.at ?? '') || Number.MAX_SAFE_INTEGER;

/** One friend's threads (or everyone's) in the three groups of the Keeping in mind screen. */
export function mindSections(threads: readonly Thread[], characterId?: string): MindSections {
  const mine = threads.filter((t) => !characterId || t.characterId === characterId);
  const open = mine.filter((t) => t.status === 'open');
  return {
    soon: open.filter((t) => t.happensAt).sort((a, b) => Date.parse(a.happensAt!) - Date.parse(b.happensAt!)),
    following: open.filter((t) => !t.happensAt).sort((a, b) => nextAt(a) - nextAt(b)),
    settled: mine
      .filter((t) => t.status === 'closed')
      .sort((a, b) => Date.parse(b.closedAt ?? b.createdAt) - Date.parse(a.closedAt ?? a.createdAt)),
  };
}

/** Why a friend wrote first, read from the line's reach key (`src/lib/reply-ideas.ts`). */
export type ReachReason =
  | { source: 'thread'; phase: TouchPhase; threadId: string }
  | { source: 'lead'; scheduleId: string }
  | { source: 'quest'; threadId: string }
  | { source: 'care'; kind: CareKind; again: boolean }
  | { source: 'life'; group: KinGroup; moment: LifeMomentKey }
  | { source: 'hello'; group: KinGroup }
  | { source: 'ask' }
  | { source: 'pause'; why: 'break' | 'night' };

/** The reason behind a reach key, or null for a line that has none (an everyday reply). */
export function reachReason(reach: string | undefined): ReachReason | null {
  if (!reach) return null;
  const thread = reachThread(reach);
  if (thread) return { source: 'thread', phase: thread.phase, threadId: thread.id };
  const care = reachCare(reach);
  if (care) return { source: 'care', kind: care, again: reach.endsWith(':again') };
  const [source, a, b] = reach.split(':');
  if (source === 'lead' && a) return { source: 'lead', scheduleId: reach.slice(5) };
  if (source === 'quest' && a) return { source: 'quest', threadId: reach.slice(6) };
  if (source === 'life' && a && b) return { source: 'life', group: a as KinGroup, moment: b as LifeMomentKey };
  if (source === 'hello' && a) return { source: 'hello', group: a as KinGroup };
  if (source === 'ask') return { source: 'ask' };
  if (source === 'pause' && (a === 'break' || a === 'night')) return { source: 'pause', why: a };
  return null;
}

/** The thread a reason is about (a thread's text, a quest offer), so "Why?" can open it. */
export const reasonThreadId = (reason: ReachReason | null) =>
  reason?.source === 'thread' || reason?.source === 'quest' ? reason.threadId : undefined;
