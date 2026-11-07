import type { Message } from '@/types';

import { pickResponders } from '../lib/group-chat';

import type { CallLine } from './call-prompt';
import { groupReactCue } from './group-reply';
import { detectCrisis } from './safety';

/**
 * A group call on the model (0z113): the user talks with the open mic, as on a one-to-one call, and
 * one or two members answer each time through the group route (`/v1/chat/group`), each in their own
 * persona, reading the group chat and the call so far. The lines show as captions under the member
 * who says them. No voice yet: the group route signs no lines for ElevenLabs.
 */

/** One line said on a group call; a member's line carries who said it. */
export interface GroupCallLine extends CallLine {
  characterId?: string;
}

/** Every member's turn on the call: spoken words only, as a voice will say them. */
export const GROUP_CALL_FORM = [
  'THIS IS A LIVE VOICE CALL with the whole group, not the chat: everyone hears everyone.',
  '- Say only the words you would say out loud: one or two short sentences, no narration, no actions, no emoji.',
];

/**
 * This member's cue: the call's form, then what the turn is for. On the opening the first member
 * picks up with a hello and the second adds theirs; later the second reacts to the first.
 */
export function groupCallCue({ opening, first }: { opening: boolean; first?: string }): string[] {
  if (!first) {
    return opening
      ? [...GROUP_CALL_FORM, 'NEXT: THE USER JUST CALLED THE GROUP and you all picked up. Say a short hello in your own way.']
      : GROUP_CALL_FORM;
  }
  return opening
    ? [...GROUP_CALL_FORM, `NEXT: The user just called the group and ${first} said hello first. Add your own short hello.`]
    : [...GROUP_CALL_FORM, ...groupReactCue(first)];
}

/**
 * The call so far as group messages after the real chat: the user's lines as voice messages (a
 * transcript, so the spoken language is heard), each member's as their own text.
 */
export function groupCallMessages(said: readonly GroupCallLine[], groupId: string, at: string): Message[] {
  return said.map((line, i) =>
    line.author === 'me'
      ? { id: `gcall_${i}`, conversationId: groupId, author: 'me', kind: 'voice', transcript: line.text, transcriptLanguage: line.language, createdAt: at }
      : { id: `gcall_${i}`, conversationId: groupId, author: 'them', kind: 'text', text: line.text, characterId: line.characterId, createdAt: at },
  );
}

/** The members who spoke on the call, oldest first. */
export function callSpeakers(said: readonly GroupCallLine[]): string[] {
  return said.flatMap((line) => (line.author === 'them' && line.characterId ? [line.characterId] : []));
}

/**
 * Who answers next on the call (`pickResponders`, as in the chat): two say hello when it opens; then
 * a member the user named, else the one quiet longest, and on every other turn a second joins in.
 * A crisis gets one answer only.
 */
export function groupCallResponders(
  memberIds: string[],
  names: Record<string, string>,
  said: readonly GroupCallLine[],
  chatSpeakers: readonly string[],
): { responders: string[]; crisis: boolean } {
  const speakers = [...chatSpeakers, ...callSpeakers(said)];
  const mine = said.filter((line) => line.author === 'me');
  const last = mine[mine.length - 1];
  if (!last) return { responders: pickResponders(memberIds, names, '', speakers, 1), crisis: false };
  const crisis = detectCrisis(last.text);
  const responders = pickResponders(memberIds, names, last.text, speakers, crisis ? 0 : mine.length);
  return { responders: crisis ? responders.slice(0, 1) : responders, crisis };
}
