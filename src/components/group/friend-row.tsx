import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { CharacterAvatar, PressableScale, Txt } from '@/components/ui';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
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
 * One friend in a pick list: avatar, name, their world, and an ink check when picked
 * (calm cards: ink marks selection). `locked` dims a row that cannot be picked now.
 */
export function FriendRow({
  friend,
  picked,
  locked,
  onPress,
  accessibilityLabel,
}: {
  friend: Friend;
  picked: boolean;
  locked?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <PressableScale
      scaleTo={0.98}
      style={[styles.row, locked && styles.locked]}
      disabled={locked}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: picked, disabled: locked }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}>
      <CharacterAvatar character={friend.character} size={44} />
      <View style={styles.text}>
        <Txt variant="bodyStrong" lines={1}>
          {friend.name}
        </Txt>
        {friend.character.series ? (
          <Txt variant="small" color={colors.textSecondary} lines={1}>
            {friend.character.series}
          </Txt>
        ) : null}
      </View>
      {picked ? (
        <View style={[styles.check, styles.checkOn]}>
          <Ionicons name="checkmark" size={16} color={colors.textOnInk} />
        </View>
      ) : (
        <View style={styles.check} />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64 },
  locked: { opacity: 0.4 },
  text: { flex: 1, gap: 2 },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  checkOn: {
    borderWidth: 0,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
