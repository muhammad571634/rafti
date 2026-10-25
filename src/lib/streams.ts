import type { Message, Stream, StreamLine } from '@/types';

import { clip, readJson } from '../ai/character-draft';
import { detectCrisis } from '../ai/safety';
import { contentProblems } from './create-character';

/**
 * Streams, after Character.AI's: the user picks two characters and a topic and watches them talk
 * about it. Each line is written by the one who says it, from their own persona prompt
 * (`buildStreamLinePrompt`), so both voices stay their own, as in group chats. A round adds
 * `STREAM_FIRST_LINES` to start and `STREAM_MORE_LINES` with Keep going, up to `STREAM_MAX_LINES`;
 * what a round costs is in src/economy/streams.ts. Pure and server-portable.
 */

export const STREAM_TOPIC_MAX = 150;
export const STREAM_LINE_MAX = 240;
export const STREAM_FIRST_LINES = 8;
export const STREAM_MORE_LINES = 6;
export const STREAM_MAX_LINES = 26;
/** Streams kept on the device, newest first (one storage key holds the whole save). */
export const STREAMS_KEPT = 20;
/** How many of the last lines the next one is written from. */
export const STREAM_CONTEXT = 10;

export type StreamProblem = 'pair' | 'topic' | 'crisis' | 'minors' | 'explicit';

/** Checks before a stream starts: two different characters and a topic within the content rules. */
export function checkStream(input: { characterIds: string[]; topic: string }): StreamProblem[] {
  const problems: StreamProblem[] = [];
  if (input.characterIds.length !== 2 || new Set(input.characterIds).size !== 2) problems.push('pair');
  if (!input.topic.trim()) problems.push('topic');
  // A crisis is never a show to watch: the chat answers it with care and the helpline card.
  if (detectCrisis(input.topic)) problems.push('crisis');
  problems.push(...contentProblems(input.topic));
  return problems;
}

/** Ideas under the topic field; `{user}` is the watcher's name. */
export const STREAM_TOPICS = [
  'Who would last longer in a horror movie',
  'The perfect first date, and why the other one is wrong',
  'What they would cook for {user}',
  'Swap jobs for a day',
  'Rate each other’s style, honestly',
  'The worst advice they ever got',
  'Plan a surprise for {user}',
  'A week on a desert island together',
] as const;

export const fillTopic = (topic: string, userName: string) => topic.replaceAll('{user}', userName);

/** More lines are still coming: fewer than the rounds paid for, and not paused. */
export const isPlaying = (stream: Pick<Stream, 'lines' | 'target' | 'stopped'>) => !stream.stopped && stream.lines.length < stream.target;

/** Paused partway through a round: the rest of it is paid for already. */
export const isPaused = (stream: Pick<Stream, 'lines' | 'target' | 'stopped'>) => !!stream.stopped && stream.lines.length < stream.target;

/** Who says the next line: they take turns, the first one opening. */
export const nextSpeaker = (stream: Pick<Stream, 'characterIds' | 'lines'>) => stream.characterIds[stream.lines.length % 2];

/** The target after one more round (8 lines to start, then 6 more), or null when the stream is full. */
export function nextTarget(stream: Pick<Stream, 'target'> | undefined): number | null {
  const from = stream?.target ?? 0;
  if (from >= STREAM_MAX_LINES) return null;
  return Math.min(STREAM_MAX_LINES, from + (from === 0 ? STREAM_FIRST_LINES : STREAM_MORE_LINES));
}

/** A line as the chat bubbles draw it (`MessageBubble`). */
export const lineMessage = (streamId: string, line: StreamLine): Message => ({
  id: line.id,
  conversationId: streamId,
  author: 'them',
  kind: 'text',
  text: line.text,
  characterId: line.characterId,
  createdAt: line.createdAt,
});

/**
 * The model's answer for one line (`{"line": "…"}`), cleaned: a name it put in front ("Kai: …") and
 * wrapping quotes go, long lines are cut at a word. Null when there is nothing to show.
 */
export function parseStreamLine(raw: string, names: string[]): string | null {
  const data = readJson(raw);
  let line = typeof data?.line === 'string' ? data.line : '';
  line = line.replace(/\s+/g, ' ').trim();
  for (const name of names) {
    const prefix = `${name.toLowerCase()}:`;
    if (line.toLowerCase().startsWith(prefix)) line = line.slice(prefix.length).trim();
  }
  line = line.replace(/^["“](.*)["”]$/, '$1').trim();
  return line ? clip(line, STREAM_LINE_MAX) : null;
}
