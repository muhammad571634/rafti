import { STILL_EYES_TOP, STILLS } from '@/assets/stills/registry';
import { portraitOf, type Picture } from '@/components/chat/chat-ground';
import type { Character, Scene } from '@/types';

/** Where their face sits across a moment's picture: the middle, as words lie under it, not beside it. */
export const MOMENT_FACE_AT = 0.5;

/**
 * A moment's picture, for its card and its share poster: its own, else the friend's drawn still for
 * its mood (on any of their moments: it is them in that moment), else their portrait where `art` asks
 * for it, else none (the card shows its glyph on its tint).
 */
export function momentPicture(scene: Scene, character: Character, aspect: number, art: boolean): Picture | undefined {
  if (scene.image) return { source: { uri: scene.image }, position: 'center' };
  const still = scene.still && STILLS[character.id]?.[scene.still];
  if (still != null) return { source: still, position: { left: '50%', top: STILL_EYES_TOP } };
  return art ? portraitOf(character, aspect, MOMENT_FACE_AT) : undefined;
}
