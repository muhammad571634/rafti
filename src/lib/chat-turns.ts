import type { Message } from '@/types';

/** How many versions of their newest reply a chat keeps (↻, Character.AI teardown item 1). */
export const MAX_REPLY_VERSIONS = 5;

/** A line you or they wrote: not a call row, a system line or a card. */
const isLine = (m: Message) => m.kind !== 'system' && m.kind !== 'call' && !m.card;

/** A continue or a time skip: the user's turn without words (`src/lib/chat-steer.ts`). */
export const isSteer = (m: Message) => m.card === 'continue' || m.card === 'skip';

/** Where a turn starts: a line of yours, or a continue or a skip. */
const isTurn = (m: Message) => (m.author === 'me' && isLine(m)) || isSteer(m);

/**
 * Your newest turn (a message, a continue or a skip) and their reply after it, the unit ↻ redoes
 * and versions switch between. The reply is every text and voice note of theirs after it; system
 * lines in between (the AI notice, a voice-minutes note) stay where they are. `crisis` marks a
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
