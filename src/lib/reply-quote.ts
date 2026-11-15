import type { Message, ReplyTo } from '@/types';

/** A quoted line is cut here: enough to know which line it was, never a second copy of a long one. */
export const REPLY_QUOTE_MAX = 120;

/** Words and pictures can be answered; cards, system lines, calls and a line still on its way cannot. */
export function canReplyTo(message: Message): boolean {
  if (message.card || message.pending || message.muted) return false;
  if (message.kind === 'text') return !!message.text?.trim();
  return message.kind === 'voice' || message.kind === 'image';
}

/** Cuts at a word where one is close, with an ellipsis; spaces run together. */
export function cutQuote(text: string, max = REPLY_QUOTE_MAX): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const head = flat.slice(0, max);
  const space = head.lastIndexOf(' ');
  return `${(space > max * 0.6 ? head.slice(0, space) : head).trimEnd()}…`;
}

/** The copy a reply keeps of the line it answers. */
export function replySnapshot(message: Message): ReplyTo {
  const words = (message.text ?? message.transcript ?? '').trim();
  return {
    id: message.id,
    author: message.author,
    ...(message.characterId ? { characterId: message.characterId } : {}),
    kind: message.kind,
    ...(words ? { text: cutQuote(words) } : {}),
  };
}

/** What the quoted line says, for the model: its words, or what it was. */
function quotedWords(quote: ReplyTo): string {
  if (quote.text) return `"${quote.text}"`;
  if (quote.kind === 'image') return 'a photo';
  if (quote.kind === 'voice') return 'a voice message';
  return 'a message';
}

/**
 * The note in front of a reply, so the model knows which line the user answered. `reader` is the
 * character whose prompt this is; `names` gives the other group members' names.
 */
export function replyCue(quote: ReplyTo, reader?: string, names?: ReadonlyMap<string, string>): string {
  const whose =
    quote.author === 'me'
      ? 'my own earlier message'
      : !quote.characterId || quote.characterId === reader
        ? 'your message'
        : `${names?.get(quote.characterId) ?? 'someone'}'s message`;
  return `[Replying to ${whose}: ${quotedWords(quote)}]`;
}

/** The user's line as the model reads it: the quote's note first when it answers a line. */
export function withReplyCue(message: Message, text: string, reader?: string, names?: ReadonlyMap<string, string>): string {
  return message.author === 'me' && message.replyTo ? `${replyCue(message.replyTo, reader, names)} ${text}` : text;
}
