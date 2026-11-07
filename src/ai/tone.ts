import type { Message, MessageTone } from '@/types';

/** The order the menu shows them, top to bottom. */
export const MESSAGE_TONES: readonly MessageTone[] = ['whisper', 'playful', 'flirty', 'serious'];

const HEARD: Record<MessageTone, string> = {
  whisper: 'They whispered their last message, low and close, as if only you should hear it. Answer close and quiet, in few words.',
  playful: 'They said their last message playfully, teasing or joking. Tease back and keep this reply light.',
  flirty: 'They said their last message flirting with you. You notice, and it shows in this reply, in your own way and as far as your bond allows.',
  serious: 'They said their last message seriously, with no joking. Drop the teasing for this reply and answer it straight.',
};

const MARK = 'HOW THEY SAID IT:';

/**
 * What the model hears of the tone of the user's last text, while it is still unanswered: this
 * reply only, so the cached history stays as it is. ↻ removes the old answer first, so a new
 * version hears it too. A reply still landing from an earlier text does not count as an answer:
 * only a reply that has read this text (`readAt`) does. Their words and the safety rules outrank
 * their tone: a playful "you won't have to put up with me much longer" is still a warning sign.
 */
export function toneCue(messages: readonly Message[]): string[] | undefined {
  const last = messages.findLastIndex((m) => m.author === 'me');
  const message = messages[last];
  if (!message?.tone) return undefined;
  if (message.readAt && messages.slice(last + 1).some((m) => m.kind !== 'system')) return undefined;
  return [
    `${MARK} ${HEARD[message.tone]} The first thing you say reacts to how they said it, as a person would, in your own voice. ` +
      'Never mention a menu, a setting or a "tone". The tone never changes "crisis": if their words say they are hurting or in danger, answer the words. ' +
      'If they say they are under 18, your rules win and there is no flirting.',
  ];
}

/** A cue with the tone taken out: in a crisis (`CRISIS_CUE`) nobody teases or flirts. */
export function withoutTone(cue: readonly string[]) {
  return cue.filter((line) => !line.startsWith(MARK));
}
