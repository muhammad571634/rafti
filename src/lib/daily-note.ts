import { dayKey } from '../mock/time';
import type { Message, SecretNote } from '@/types';

/**
 * Today's sealed note (owner, 2026-11-03: Today should also show things like secret notes). A note
 * used to exist only once the user opened Secret note, so a new install never had one on Today.
 * Now, once a day, the friend you talked with last answers the day's question on their own and
 * seals it; Today shows it until it is opened, and the swap stays the user's choice.
 *
 * - **One waiting:** while a sealed note waits to be opened, nobody writes another.
 * - **One a day:** none when a note is already from today (theirs, or one the user started).
 * - **Busy model:** their note left unwritten is asked for again (the store spaces the tries).
 * - **Never:** on a day with a helpline card in that chat (care first, not a game).
 *
 * 'new' writes today's note, 'ask' asks again for the one left unwritten, null does nothing.
 */
export function dailyNoteStep(
  notes: readonly SecretNote[],
  characterId: string,
  chat: readonly Message[],
  now = new Date(),
): 'new' | 'ask' | null {
  if (notes.some((n) => n.status === 'ready')) return null;
  const today = dayKey(now);
  if (chat.some((m) => m.card === 'helpline' && dayKey(m.createdAt) === today)) return null;
  // The newest note comes first (`newSecretNote` puts it on top).
  const latest = notes.find((n) => n.characterId === characterId);
  if (latest?.status === 'composing') return 'ask';
  return notes.some((n) => n.date === today) ? null : 'new';
}
