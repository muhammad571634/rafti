import type { Message, ReachAsk, Relationship, Temper } from '@/types';

/**
 * "May I text you sometimes?" (Presence 2, P2.2; owner 2026-10-26: the ask comes from the
 * character, softly, in the chat). Character.AI shows a system alert ("Characters can message you
 * while you're away! Allow {{name}}?"); ours is the character asking in their own temper, with two
 * reply ideas. It comes when the user is clearly enjoying the chat, never early, never after a
 * crisis, never in a scene; "Not now" is asked again later in other words, three times at most.
 * "Yes" turns on Let them reach out, shows their words on the lock screen and asks the system for
 * pushes at the moment the user is most willing. Pure and server-portable.
 */
export const REACH_ASK = {
  /** The user's own messages with this friend before the first ask. */
  minTotal: 8,
  /** …and in this sitting: they are here and enjoying it. */
  minSession: 4,
  /** A quiet gap this long starts a new sitting. */
  sessionGapMs: 30 * 60_000,
  /** After "Not now": wait this long… */
  retryAfterMs: 3 * 86_400_000,
  /** …and this many more messages of theirs. */
  retryMessages: 10,
  maxAsks: 3,
} as const;

/** The reach key of the ask line: its ideas and their answer follow the temper. */
export const askReach = (temper: Temper) => `ask:${temper}`;
export const isAskReach = (reach: string | undefined) => !!reach?.startsWith('ask:');

const own = (m: Message) => m.author === 'me' && !m.card && m.kind !== 'system';

/** How many of the user's messages are in the current sitting (no gap longer than `sessionGapMs`). */
export function sittingCount(messages: readonly Message[]) {
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const next = messages[i + 1];
    if (next && Date.parse(next.createdAt) - Date.parse(messages[i].createdAt) > REACH_ASK.sessionGapMs) break;
    if (own(messages[i])) count++;
  }
  return count;
}

/**
 * Whether to ask now, right after their reply: they may not write first yet, the user never said
 * yes (and then turned it off), fewer than three asks, enough messages overall and in this sitting,
 * the wait after a "Not now" is over, no crisis card in the last lines, no scene running and no
 * reply ideas waiting on their line.
 */
export function shouldAskToReach({
  bond,
  messages,
  now,
  inScene,
}: {
  bond: Pick<Relationship, 'messagesFirst' | 'reachAsk'>;
  messages: readonly Message[];
  now: number;
  inScene?: boolean;
}): boolean {
  if (bond.messagesFirst || inScene) return false;
  const ask: ReachAsk = bond.reachAsk ?? { asks: 0 };
  if (ask.answer === 'yes' || ask.asks >= REACH_ASK.maxAsks) return false;
  const mine = messages.filter(own);
  if (mine.length < REACH_ASK.minTotal || sittingCount(messages) < REACH_ASK.minSession) return false;
  if (ask.lastAt) {
    const since = Date.parse(ask.lastAt);
    if (now - since < REACH_ASK.retryAfterMs) return false;
    if (mine.filter((m) => Date.parse(m.createdAt) > since).length < REACH_ASK.retryMessages) return false;
  }
  if (messages.slice(-8).some((m) => m.card === 'helpline')) return false;
  const newest = messages.findLast((m) => m.kind !== 'system' && !m.card);
  return !newest?.ideas?.length;
}

/** The ask's history after asking once more. */
export const askedOnce = (ask: ReachAsk | undefined, now: Date): ReachAsk => ({
  asks: (ask?.asks ?? 0) + 1,
  lastAt: now.toISOString(),
  answer: ask?.answer,
});
