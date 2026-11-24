import type { Character, CharacterArc } from '@/types';

import { ARC_LEVELS } from '../world-story';

/**
 * What a story template's character has beyond its card, as the official cast has it
 * (`src/mock/character-stories.ts`): what is already between them and the user, the face they keep
 * on, the exception, a small habit, what they love and can't stand, and what they hold back, opening
 * in three beats with the bond. Written in the second person, with no name and no he or she, so it
 * still fits when a user makes the template their own and changes either. The user is "them".
 * `history`, `mask`, `exception`, `quirk`, the secret and the beats are for the model only and stay
 * English; `likes`, `dislikes` and the beat titles are shown and translated (content `templates.<id>.story`).
 */
export type TemplateStory = Required<Pick<Character, 'history' | 'mask' | 'exception' | 'quirk' | 'likes' | 'dislikes' | 'arc'>> & { justMet?: boolean };

/** One template's story; `likes` / `dislikes` are `|`-separated. */
export function story(
  fields: { history: string; mask: string; exception: string; quirk: string; likes: string; dislikes: string; justMet?: boolean },
  secret: string,
  ...beats: [title: string, beat: string][]
): TemplateStory {
  const arc: CharacterArc = { secret, beats: beats.map(([title, beat], i) => ({ atLevel: ARC_LEVELS[i], title, beat })) };
  return {
    history: fields.history,
    mask: fields.mask,
    exception: fields.exception,
    quirk: fields.quirk,
    likes: fields.likes.split('|').map((s) => s.trim()),
    dislikes: fields.dislikes.split('|').map((s) => s.trim()),
    arc,
    ...(fields.justMet ? { justMet: true } : {}),
  };
}
