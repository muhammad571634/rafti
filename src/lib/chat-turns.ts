import type { Message } from '@/types';

/**
 * ↻ for every chat and character: the earlier versions go to the model as what was already said,
 * and the new one is the same person taking another angle (a different mood, focus or move), not a
 * rephrase and not a different person. Character.AI's swipes feel alive because no two read alike.
 */
export function redoCue(said: readonly string[]) {
  return [
    'NEW VERSION: the user asked for another version of your last reply. You already said:',
    ...said.slice(-8).map((line) => `- ${line}`),
    'Write a different take, still fully you and true to everything so far: a different mood, focus or move (tease where you comforted, ask where you told, act where you talked). Never a rephrase of the above.',
  ];
}

/** How many versions of their newest reply a chat keeps (↻, Character.AI teardown item 1). */
export const MAX_REPLY_VERSIONS = 5;

/** A line you or they wrote: not a call row, a system line or a card. */
const isLine = (m: Message) => m.kind !== 'system' && m.kind !== 'call' && !m.card;

/** A continue or a time skip: the user's turn without words (`src/lib/chat-steer.ts`). */
export const isSteer = (m: Message) => m.card === 'continue' || m.card === 'skip';

/** Where a turn starts: a line of yours, or a continue or a skip. */
export const isTurn =(m: Message) => (m.author === 'me' && isLine(m)) || isSteer(m);

/**
 * Your newest turn (a message, a continue or a skip) and their reply after it, the unit ↻ redoes
 * and versions switch between. The reply is every text and voice note of theirs after it; system
 * lines in between (a voice-minutes note, the notifications-off note) stay where they are. `crisis` marks a
 * reply that came with the helpline card: that one is never redone.
 */
export function lastExchange(messages: readonly Message[] | undefined) {
  const list = messages ?? [];
  let at = -1;
  for (let i = list.length - 1; i >= 0; i--) {
    if (isTurn(list[i])) {
      at = i;
      break;
    }
  }
  if (at < 0) return null;
  const after = list.slice(at + 1);
  return {
    anchor: list[at],
    burst: after.filter((m) => m.author === 'them' && (m.kind === 'text' || m.kind === 'voice')),
    crisis: after.some((m) => m.card === 'helpline'),
  };
}

/** A line with words in it: their voice notes and cards have none to put on a share card. */
const isQuotable = (m: Message) => m.kind === 'text' && !m.card && !!m.text?.trim();

/** The most lines a chat's share card holds (owner: the last 5-6, so a thread reads as one). */
export const SHARE_LINES = 6;
/** Past this many characters older lines stay off, so long replies still make a card, not a scroll. */
const SHARE_CHARS = 700;
/** What a photo and a voice note weigh against `SHARE_CHARS`: about the room their bubbles take. */
const SHARE_WEIGHT = { image: 300, voice: 80 } as const;

/** A line's weight on the card, or null for one it cannot show (a call row, an empty text). */
function shareWeight(m: Message) {
  if (m.kind === 'image' || m.kind === 'voice') return SHARE_WEIGHT[m.kind];
  return m.kind === 'text' && m.text?.trim() ? m.text.trim().length : null;
}

/**
 * What Share under their newest reply puts on the card, oldest first: the conversation up to their
 * newest written line, yours and theirs, photos and voice notes in their own bubbles, as many as
 * `SHARE_LINES` back (at least two when there are two). System lines and a continue or skip are
 * passed over; a call ends it. Null while their reply has no words yet (typing, a voice note).
 */
export function shareLines(messages: readonly Message[] | undefined) {
  const list = messages ?? [];
  const exchange = lastExchange(list);
  const theirs = exchange
    ? exchange.burst.findLast(isQuotable)
    : list.findLast((m) => m.author === 'them' && isQuotable(m));
  if (!theirs) return null;
  const lines: Message[] = [];
  let chars = 0;
  for (let i = list.indexOf(theirs); i >= 0 && lines.length < SHARE_LINES; i--) {
    const m = list[i];
    if (m.kind === 'system' || m.card) continue;
    if (m.kind === 'call') break;
    const size = shareWeight(m);
    if (size == null) continue;
    if (lines.length >= 2 && chars + size > SHARE_CHARS) break;
    lines.unshift(m);
    chars += size;
  }
  return lines;
}

/**
 * "Rewind to here" goes on their lines that came before your newest turn (a message, a continue or
 * a skip). On their newest reply there is nothing of yours to take back (↻ redoes it instead).
 */
export function canRewindTo(messages: readonly Message[] | undefined, messageId: string) {
  const list = messages ?? [];
  const at = list.findIndex((m) => m.id === messageId);
  if (at < 0 || list[at].author !== 'them' || !isLine(list[at])) return false;
  return list.slice(at + 1).some(isTurn);
}

/** The messages a rewind to `messageId` deletes, as the confirmation counts them. */
export function laterCount(messages: readonly Message[] | undefined, messageId: string) {
  const list = messages ?? [];
  const at = list.findIndex((m) => m.id === messageId);
  return at < 0 ? 0 : list.slice(at + 1).filter((m) => m.kind !== 'system' && !m.card).length;
}
