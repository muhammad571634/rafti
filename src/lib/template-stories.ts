import type { Character } from '@/types';

import { BEST_FRIEND } from './template-stories/best-friend';
import { BOSS } from './template-stories/boss';
import { CLOSE_TO_HOME } from './template-stories/close-to-home';
import { COMFORT } from './template-stories/comfort';
import { DANGEROUS } from './template-stories/dangerous';
import { ENEMIES } from './template-stories/enemies';
import { EX } from './template-stories/ex';
import { FANTASY } from './template-stories/fantasy';
import { LIKES_YOU } from './template-stories/likes-you';
import { MARRIED } from './template-stories/married';
import type { TemplateStory } from './template-stories/story';

export type { TemplateStory } from './template-stories/story';

/** Every story template's story, by template id (`src/lib/templates.ts`). Pure and server-portable. */
export const TEMPLATE_STORIES: Readonly<Record<string, TemplateStory>> = {
  ...BEST_FRIEND,
  ...CLOSE_TO_HOME,
  ...LIKES_YOU,
  ...MARRIED,
  ...DANGEROUS,
  ...BOSS,
  ...ENEMIES,
  ...EX,
  ...FANTASY,
  ...COMFORT,
};

type Depth = Pick<Character, 'fromTemplate' | 'history' | 'mask' | 'exception' | 'quirk' | 'likes' | 'dislikes' | 'arc' | 'justMet'>;

const blank = (s?: string) => !s?.trim();

/**
 * A character made from a story template, with what the template's story gives it: only fields the
 * character does not have yet, so whatever the user wrote in Create stays theirs, and an arc already
 * written (and maybe half lived) is never swapped. `cardMasks` are the template card's own mask lines
 * (every language): a mask still equal to one of them was never edited, and the story's fuller one,
 * which does not give the secret away, takes its place. Returns the same object when nothing changes.
 */
export function withTemplateStory<C extends Depth>(character: C, story: TemplateStory | undefined, cardMasks: readonly string[] = []): C {
  if (!character.fromTemplate || !story) return character;
  const patch: Partial<Depth> = {};
  if (blank(character.history)) patch.history = story.history;
  if (blank(character.exception)) patch.exception = story.exception;
  if (blank(character.quirk)) patch.quirk = story.quirk;
  if (blank(character.mask) || cardMasks.includes(character.mask!.trim())) {
    if (character.mask !== story.mask) patch.mask = story.mask;
  }
  if (!character.likes?.length && story.likes.length) patch.likes = story.likes;
  if (!character.dislikes?.length && story.dislikes.length) patch.dislikes = story.dislikes;
  if (!character.arc?.beats.length) patch.arc = story.arc;
  if (story.justMet && character.justMet == null) patch.justMet = true;
  return Object.keys(patch).length ? { ...character, ...patch } : character;
}
