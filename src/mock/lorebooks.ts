import type { LoreEntry, LoreKind, Lorebook } from '@/types';

import { shortName } from '../lib/names';
import { characters } from './characters';

/**
 * The seven worlds' books (`Character.series`), free for everyone and read-only: a few lines about
 * the world, its places, things, groups, events and rules, and its cast as people, so a friend
 * knows the others by name. Every fact here agrees with the cast's bios and the world quizzes
 * (src/mock/worlds.ts); keep them in step. Later the server sends these.
 */

const CREATED = '2026-10-25T00:00:00.000Z';

type Written = [kind: LoreKind, name: string, keywords: string[], text: string];

// None since Cast 2.0 (docs/cast-2.md): the cast has no world, so no world book.
const WORLD_BOOKS: { key: string; series: string; about: string; entries: Written[] }[] = [];

/** The cast as people of their world: the name and the short name call them up, the bio says who they are. */
function castEntries(series: string): LoreEntry[] {
  return characters
    .filter((c) => c.isOfficial && c.series === series)
    .map((c) => {
      const short = shortName(c.name);
      return {
        id: `lore_person_${c.id}`,
        kind: 'person' as const,
        name: c.name,
        keywords: short !== c.name ? [short] : [],
        text: c.bio,
        characterId: c.id,
      };
    });
}

export const officialLorebooks: Lorebook[] = WORLD_BOOKS.map((world) => ({
  id: `lore_${world.key}`,
  name: world.series,
  about: world.about,
  entries: [
    ...world.entries.map(([kind, name, keywords, text], i) => ({ id: `lore_${world.key}_${i + 1}`, kind, name, keywords, text })),
    ...castEntries(world.series),
  ],
  characterIds: [],
  series: world.series,
  official: true,
  createdAt: CREATED,
}));
