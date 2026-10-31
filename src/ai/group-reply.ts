import type { Character, Message } from '@/types';

import { messageText } from '../lib/story-continuity';

import type { ChatPromptInput } from './chat-prompt';
import type { HistoryTurn, HistoryWindow, PromptPart } from './prompt-layout';
import { layoutPrompt, part } from './prompt-layout';
import { followsUser, languageCue, userLines } from './reply-language';
import { openerLines, repeatCue } from './repetition';
import { REPLY_SHAPE } from './reply-style';
import { groupParts } from './rules';
import { CRISIS_CUE } from './safety';

/**
 * One member's next message in a group chat: one model call per member who answers, each in their
 * own persona, so every voice stays their own (`pickResponders` picks who). The server answers
 * through the same guards as a one-to-one reply (`chatReply`).
 */
export interface GroupPromptInput extends ChatPromptInput {
  /** Everyone else in the chat. */
  others: Character[];
  /** What this turn is for, when it is not simply answering the user. */
  cue?: readonly string[];
}

type TurnInput = Pick<GroupPromptInput, 'character' | 'others' | 'user' | 'persona' | 'messages'>;

/**
 * The group as this member reads it: their own lines are theirs, and everyone else's come as the
 * user's turn with a name in front, so the model can tell who said what.
 */
export function groupTurns({ character, others, user, persona, messages }: TurnInput): HistoryTurn[] {
  const names = new Map(others.map((o) => [o.id, o.name]));
  const you = persona?.name ?? user.displayName;
  const turns: HistoryTurn[] = [];
  for (const message of messages) {
    const text = messageText(message);
    if (text === null) continue;
    const own = message.author === 'them' && message.characterId === character.id;
    const speaker = message.author === 'me' ? you : (names.get(message.characterId ?? '') ?? 'Someone');
    const line = own || message.card === 'skip' ? text : `${speaker}: ${text}`;
    const role = own ? 'assistant' : 'user';
    const last = turns[turns.length - 1];
    if (last?.role === role) last.text = `${last.text}\n${line}`;
    else turns.push({ role, text: line });
  }
  return turns;
}

/** The parts of one member's prompt, every tier; the history comes from `groupTurns`. */
export function groupReplyParts(input: GroupPromptInput): PromptPart[] {
  const { character, others, user, relationship, replyLanguage, persona, lore, messages } = input;
  const own = messages.filter((m: Message) => m.author === 'me' || m.characterId === character.id);
  return [
    ...groupParts(character, others, user, relationship, replyLanguage, persona, lore),
    part('groupForm', 'chat', [
      'In the chat, what the others write starts with their name. You write only your own words, with no name in front.',
      'Text the way people do in a group: short, and most of the time one message. Do not open every line with someone’s name: use a name only when it is not clear who you mean.',
      'Most messages here need no narration. When one does, it is brief and has no "I": *leans back*.',
    ]),
    part('cue', 'turn', input.cue ?? []),
    part('openers', 'turn', openerLines(own)),
    part('repeat', 'turn', input.repeated ? repeatCue(input.repeated) : []),
    part('languageNow', 'turn', followsUser(replyLanguage) ? languageCue(userLines(messages), user.locale) : []),
    part('crisis', 'turn', input.crisis ? CRISIS_CUE : []),
    part('shape', 'turn', [REPLY_SHAPE]),
  ];
}

/** One member's prompt, laid out for the cache. */
export function layoutGroupReply(input: GroupPromptInput, window?: Partial<HistoryWindow>) {
  return layoutPrompt(groupReplyParts(input), groupTurns(input), window);
}

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** "Kai Arden:" or "Kai:" opening a line, bold or not. */
const namedLine = (name: string) => new RegExp(`^\\*{0,2}(?:${escaped(name)}|${escaped(name.split(/\s+/)[0])})\\*{0,2}\\s*:(?:\\*\\*)?\\s*`, 'iu');

/** What the model wrote, as this member's own lines: their name comes off, and a line for someone else goes. */
export function cleanGroupLines(lines: readonly string[], character: Pick<Character, 'name'>, others: readonly Pick<Character, 'name'>[]) {
  return lines.flatMap((line) => {
    if (others.some((o) => namedLine(o.name).test(line))) return [];
    const text = line.replace(namedLine(character.name), '').trim();
    return text ? [text] : [];
  });
}

/** The user just made this group, and this member speaks first. */
export const groupHelloCue = (others: string) => [
  'NEXT: The user just started this group chat, and you speak first.',
  `- Say hello in your own voice, and say something to ${others} by name.`,
  '- One short message.',
];

/** The user just added this member to the group. */
export const groupJoinCue = () => ['NEXT: The user just added you to this group chat. Say a short hello in your own voice, to whoever you know here.'];

/** The second member to answer: a word on what the first said, not another answer to the user. */
export const groupReactCue = (to: string) => [
  `NEXT: ${to} just answered the user. Join in with one short message: react to what ${to} said, or to the user, in your own voice.`,
  '- Leave room for the user: do not take over the conversation.',
];

/** The user's last line is this member's turn at truth or dare. */
export const groupGameCue = () => ['NEXT: You are playing truth or dare with the group, and the user’s last line is your turn. Answer it honestly or do it, as yourself, in one or two short messages.'];
