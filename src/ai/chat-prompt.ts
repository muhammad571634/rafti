import type { LorePrompt } from '@/lib/lorebook';
import type { PersonaView } from '@/lib/personas';
import type { ReplyPrefs, TurnPlan } from '@/lib/reply-engine';
import type { ActiveScene, Character, MemoryAbout, MemoryItem, Message, Relationship, Thread, TimeSkip, User } from '@/types';

import { steerCue } from '../lib/chat-steer';
import { messageText } from '../lib/story-continuity';

import type { HistoryTurn, HistoryWindow, PromptPart } from './prompt-layout';
import { layoutPrompt, part } from './prompt-layout';
import { REPLY_SHAPE, turnLines } from './reply-style';
import { characterParts } from './rules';
import { threadParts } from './thread-prompt';

/**
 * The prompt for one reply in a one-to-one chat (teardown item 7), laid out for the provider's
 * prompt cache (src/ai/prompt-layout.ts): rules, persona and world, then the chat's own settings
 * and pinned memories, then the history cut in steps, then what this reply alone needs: the bond,
 * the scene, the memories and lore this message brought up, a continue or skip cue, the turn's
 * hints and the answer's shape. Between replies of a warm chat only the new turns and this tail
 * cost full price.
 */

/** The most pinned memories the prompt carries: the newest, so a new pin never reorders the rest. */
export const PINNED_MAX = 20;

/** A memory as the prompt needs it: what, whose, and a chat line kept word for word. */
type MemoryNote = Pick<MemoryItem, 'text' | 'about' | 'quote'>;

/** Whose memory, as the character reads it: the user is "them", the character "you". */
const WHOSE: Record<MemoryAbout, string> = { story: 'Your story', them: 'About you', you: 'About them' };

const memoryLine = (memory: MemoryNote) =>
  memory.quote
    ? `- ${memory.quote.author === 'me' ? 'They said' : 'You said'}: "${memory.text}"`
    : `- ${WHOSE[memory.about ?? 'you']}: ${memory.text}`;

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const byTime = (a: MemoryItem, b: MemoryItem) => compare(a.createdAt, b.createdAt) || compare(a.id, b.id);

/**
 * What they pinned, always in the prompt: the active ones, oldest first, the newest `PINNED_MAX`.
 * The order never depends on the message, so this part stays the same reply after reply and the
 * cached prefix holds until they pin or unpin something.
 */
export function pinnedLines(pinned: readonly MemoryItem[]) {
  const kept = pinned
    .filter((m) => (m.status ?? 'active') === 'active' && !m.supersededBy)
    .sort(byTime)
    .slice(-PINNED_MAX);
  if (!kept.length) return [];
  return ['ALWAYS REMEMBER (they pinned these; true in your story):', ...kept.map(memoryLine)];
}

/** What this message brings to mind besides the pins, for this reply only. */
export function recallLines(memories: readonly (MemoryNote & { pinned?: boolean })[]) {
  const loose = memories.filter((m) => !m.pinned);
  if (!loose.length) return [];
  return ['THIS BRINGS TO MIND (from your past chats; bring up only what fits):', ...loose.map(memoryLine)];
}

/**
 * A one-to-one chat as the model reads it: the lines it may see (`messageText`), one turn per run
 * of one side. A time skip is the user's turn, as they moved the story on; a continue is not shown,
 * so their lines on both sides of it read as one turn.
 */
export function chatTurns(messages: readonly Message[]): HistoryTurn[] {
  const turns: HistoryTurn[] = [];
  for (const message of messages) {
    const text = messageText(message);
    if (text === null) continue;
    const role = message.author === 'me' || message.card === 'skip' ? 'user' : 'assistant';
    const last = turns[turns.length - 1];
    if (last?.role === role) last.text = `${last.text}\n${text}`;
    else turns.push({ role, text });
  }
  return turns;
}

export interface ChatPromptInput {
  character: Character;
  user: User;
  relationship?: Relationship;
  replyLanguage?: string;
  persona?: PersonaView;
  scene?: ActiveScene;
  lore?: LorePrompt;
  prefs?: ReplyPrefs;
  /** This character's pinned memories (`pinnedLines`). */
  pinned?: readonly MemoryItem[];
  /** The summary of earlier chats (backend-plan §7), the last thing before the history. */
  summary?: string;
  /** The chat, oldest first, from its start (or from `HistoryWindow.offset`). */
  messages: readonly Message[];
  /** Memories this message brings up (`buildStoryContinuityContext`); pinned ones are already in. */
  memories?: readonly (MemoryNote & { pinned?: boolean })[];
  /** A continue or a time skip in place of a message (src/lib/chat-steer.ts); `to` is an own skip's words. */
  steer?: { kind: 'continue' | 'skip'; skip?: TimeSkip; to?: string };
  /** This reply's plan (`planReply`), as hints. */
  plan?: TurnPlan;
  /** This friend's threads (`src/lib/threads.ts`): the model follows, moves or settles them. */
  threads?: readonly Thread[];
}

/** The parts of one reply's prompt, every tier; the history comes from `chatTurns`. */
export function chatParts(input: ChatPromptInput): PromptPart[] {
  const { character, user, relationship, replyLanguage, persona, scene, lore, prefs } = input;
  const summary = input.summary?.trim();
  return [
    ...characterParts(character, user, relationship, replyLanguage, persona, scene, lore, prefs),
    part('pinned', 'chat', pinnedLines(input.pinned ?? [])),
    part('summary', 'chat', summary ? ['YOUR STORY SO FAR (your earlier chats, in short):', summary] : []),
    part('recall', 'turn', recallLines(input.memories ?? [])),
    part('cue', 'turn', input.steer ? steerCue(input.steer.kind, input.steer.skip, input.steer.to) : []),
    part('hints', 'turn', input.plan ? turnLines(input.plan) : []),
    ...threadParts(input.threads ?? []),
    part('shape', 'turn', [REPLY_SHAPE]),
  ];
}

/** One reply's prompt, laid out for the cache (`PromptLayout`). */
export function layoutChatPrompt(input: ChatPromptInput, window?: Partial<HistoryWindow>) {
  return layoutPrompt(chatParts(input), chatTurns(input.messages), window);
}
