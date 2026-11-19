import type { Character } from '@/types';

/**
 * The character as a share poster may show them: a picture the user put in from their phone (any
 * picture, owner 2026-11-19) never goes on a Sigmazam poster, so the poster shows their initials;
 * our own art and a picture we drew (`pictureDrawn`) stay. docs/agent-tasks/creator-ecosystem.md §0.
 */
export function posterCharacter(character: Character): Character {
  if (character.isOfficial || !character.avatarUri || character.pictureDrawn) return character;
  return { ...character, avatarUri: undefined };
}
