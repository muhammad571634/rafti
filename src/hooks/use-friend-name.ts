import { useCallback } from 'react';

import { shortName } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import type { Character } from '@/types';

/**
 * What the user calls a friend: the nickname they gave ("Mom"), else the name (or its first
 * part with `short`). Personal places (alarms, diary, calls, photos, history) use this, like the
 * chat header; the catalog (Find, worlds, onboarding) keeps the character's own name.
 */
export function useFriendName() {
  const relationships = useAppStore((s) => s.relationships);
  return useCallback(
    (character: Character, short = false) =>
      relationships[character.id]?.nickname || (short ? shortName(character.name) : character.name),
    [relationships],
  );
}
