import { useMemo } from 'react';

import { useFriends } from '@/components/group/friend-row';
import { clipDuration, clipUnlocked } from '@/lib/radio-clips';
import { localized } from '@/i18n/content';
import { radioGifts } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import type { Character } from '@/types';

/** A clip as Radio shows it: a friend's gift or one the user made. */
export interface ClipView {
  id: string;
  character: Character;
  /** The friend's name as the user calls them. */
  name: string;
  title: string;
  lines: string[];
  durationSec: number;
  mine: boolean;
  locked: boolean;
  unlockLevel?: number;
  /** A friend's clip a level just opened, not played yet. */
  isNew?: boolean;
}

/** Gifts from friends the user chats with (open ones first), and the user's own clips, newest first. */
export function useRadioClips(): { gifts: ClipView[]; mine: ClipView[] } {
  const friends = useFriends();
  const radioClips = useAppStore((s) => s.radioClips);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const blockedIds = useAppStore((s) => s.blockedIds);
  const newRadioGifts = useAppStore((s) => s.newRadioGifts);

  return useMemo(() => {
    const friendById = new Map(friends.map((f) => [f.character.id, f]));
    const gifts = localized('radioGifts', radioGifts).flatMap((gift): ClipView[] => {
      const friend = friendById.get(gift.characterId);
      if (!friend) return [];
      return [
        {
          ...gift,
          character: friend.character,
          name: friend.name,
          durationSec: clipDuration(gift.lines),
          mine: false,
          locked: !clipUnlocked(gift.unlockLevel, relationships[gift.characterId]?.level),
          isNew: newRadioGifts.includes(gift.id),
        },
      ];
    });
    // New ones first, then open, then locked.
    gifts.sort((a, b) => Number(a.locked) - Number(b.locked) || Number(!!b.isNew) - Number(!!a.isNew));

    const byId = new Map(characters.map((c) => [c.id, c]));
    const mine = radioClips.flatMap((clip): ClipView[] => {
      const character = byId.get(clip.characterId);
      if (!character || blockedIds.includes(character.id)) return [];
      return [
        {
          ...clip,
          character,
          name: displayName(character, relationships[character.id]),
          mine: true,
          locked: false,
        },
      ];
    });
    return { gifts, mine };
  }, [friends, radioClips, characters, relationships, blockedIds, newRadioGifts]);
}

export function useRadioClip(id: string | undefined): ClipView | undefined {
  const { gifts, mine } = useRadioClips();
  return useMemo(() => [...mine, ...gifts].find((c) => c.id === id), [gifts, mine, id]);
}
