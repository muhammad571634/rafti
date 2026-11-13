import type { Message } from '@/types';

const flat = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * A voice note that only repeats the text bubbles right after it: a friend's voice reply (or a free
 * user's voice note) is stored as the note plus the same words as text, so a search must not show
 * that line twice. A voice note of your own followed by something else you typed is kept.
 */
export function echoesNextText(messages: readonly Message[], index: number): boolean {
  const voice = messages[index];
  const next = messages[index + 1];
  if (voice?.kind !== 'voice' || !voice.transcript || next?.kind !== 'text' || next.author !== voice.author || !next.text) return false;
  return flat(voice.transcript).startsWith(flat(next.text));
}

/** Lines of a chat that hold `query` (two letters or more), newest first, voice transcripts included. */
export function searchMessages(messages: readonly Message[] | undefined, query: string): Message[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2 || !messages) return [];
  const hits: Message[] = [];
  messages.forEach((m, i) => {
    if (!(m.text ?? m.transcript ?? '').toLowerCase().includes(q)) return;
    if (echoesNextText(messages, i)) return;
    hits.push(m);
  });
  return hits.reverse();
}
