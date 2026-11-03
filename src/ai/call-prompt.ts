import type { Message, MessageAuthor } from '@/types';

/**
 * A call on the model (step 1 of calls, 0z102): the user holds the mic and speaks, the server writes
 * out what was said (`/v1/voice/transcribe`), and the character answers in `mode: 'call'`
 * (`MODE_BLOCKS.call`), shown as live captions. A voice comes later (ElevenLabs reads the same lines).
 */

/** One line said on a call. `language` is what the transcriber heard the user speak. */
export interface CallLine {
  author: MessageAuthor;
  text: string;
  language?: string;
}

/** Who placed the call: the user, or the character (an incoming call the user picked up). */
export type CallPlacedBy = 'user' | 'character';

/** What a call keeps in the chat afterwards: the last lines, each cut, so the row stays small enough to sync. */
export const CALL_LINES_KEPT = 30;
export const CALL_LINE_CHARS = 300;

/** The cue for the call's first line, before anyone has spoken; none once the user has. */
export function callCue(placedBy: CallPlacedBy, said: readonly CallLine[]): string[] {
  if (said.length) return [];
  return placedBy === 'user'
    ? ['THE USER JUST CALLED YOU and you picked up. Answer the call as yourself: a short hello, in your own way.']
    : ['YOU CALLED THEM and they just picked up. Say hello and why you called, in a sentence or two.'];
}

/**
 * The call so far as chat messages after the real chat, so the model reads it as the newest turns:
 * the user's lines as voice messages (their words are a transcript, and `spokenCue` hears the
 * language), the character's as texts.
 */
export function callMessages(said: readonly CallLine[], conversationId: string, at: string): Message[] {
  return said.map((line, i) =>
    line.author === 'me'
      ? { id: `call_${i}`, conversationId, author: 'me', kind: 'voice', transcript: line.text, transcriptLanguage: line.language, createdAt: at }
      : { id: `call_${i}`, conversationId, author: 'them', kind: 'text', text: line.text, createdAt: at },
  );
}

/** A lone high surrogate at the end: half an emoji after a cut, which the database refuses. */
const HALF_EMOJI = /[\uD800-\uDBFF]$/;

/** The lines a finished call keeps on its row in the chat. */
export function keptCallLines(said: readonly CallLine[]): { author: MessageAuthor; text: string }[] {
  return said
    .filter((line) => line.text.trim())
    .slice(-CALL_LINES_KEPT)
    .map((line) => ({ author: line.author, text: line.text.trim().slice(0, CALL_LINE_CHARS).replace(HALF_EMOJI, '') }));
}

/** A call's lines as history turns (`chatTurns`): each under its speaker, the first marked as a call. */
export function callTurnLines(lines: readonly { author: MessageAuthor; text: string }[]): { author: MessageAuthor; text: string }[] {
  return lines.map((line, i) => ({ author: line.author, text: i === 0 ? `[Voice call] ${line.text}` : line.text }));
}

/** A call row as the model reads it later, in the chat and in the memory pass. */
export function callText(lines: readonly { author: MessageAuthor; text: string }[] | undefined): string {
  if (!lines?.length) return '[Call]';
  return ['[Voice call]', ...lines.map((line) => `${line.author === 'me' ? 'User' : 'Character'}: ${line.text}`)].join('\n');
}

/** How long a caption stays up before the next of their lines: about the time it takes to say it. */
export function captionMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(7000, Math.max(1800, Math.round((words / 2.6) * 1000)));
}
