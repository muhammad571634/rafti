import { useMemo } from 'react';

import { FaceRow, PickMark } from '@/components/character/kit';
import { CharacterAvatar } from '@/components/ui';
import { phrase } from '@/i18n';
import { displayName, useAppStore } from '@/store/use-app-store';
import type { Character } from '@/types';

/** A friend the user can put in a group: someone they already chat with. */
export interface Friend {
  character: Character;
  name: string;
}

/** Everyone the user chats with one-to-one, most recent first; blocked characters are gone already. */
export function useFriends(): Friend[] {
  const conversations = useAppStore((s) => s.conversations);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const blockedIds = useAppStore((s) => s.blockedIds);
  return useMemo(() => {
    const byId = new Map(characters.map((c) => [c.id, c]));
    return [...conversations]
      .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt))
      .flatMap((conversation) => {
        const character = byId.get(conversation.characterId);
        if (!character || blockedIds.includes(character.id)) return [];
        return [{ character, name: displayName(character, relationships[character.id]) }];
      });
  }, [conversations, characters, relationships, blockedIds]);
}

/**
 * One friend in a pick list, in the merged look (kit `FaceRow`): face, name and world, then a pick
 * circle (empty ring, or a peach disc with a tick). `last` drops the hairline under the row;
 * `locked` dims a row that cannot be picked now.
 */
export function FriendRow({
  friend,
  picked,
  locked,
  last,
  onPress,
  accessibilityLabel,
}: {
  friend: Friend;
  picked: boolean;
  locked?: boolean;
  last?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <FaceRow
      face={<CharacterAvatar character={friend.character} size={44} />}
      title={friend.name}
      meta={friend.character.series ? phrase(friend.character.series) : undefined}
      end={<PickMark on={picked} />}
      last={last}
      disabled={locked}
      dim={locked}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: picked, disabled: !!locked }}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
