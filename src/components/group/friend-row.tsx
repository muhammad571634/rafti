import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CharacterAvatar, Txt } from '@/components/ui';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
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
 * One friend in a pick list, iOS style: avatar, name and world, then a selection circle (empty
 * ring, or a peach disc with a tick when picked). `last` drops the hairline under the row;
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
    <Pressable
      style={({ pressed }) => [styles.row, locked && styles.locked, pressed && styles.pressed]}
      disabled={locked}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: picked, disabled: locked }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}>
      <CharacterAvatar character={friend.character} size={40} />
      <View style={[styles.body, !last && styles.line]}>
        <View style={styles.text}>
          <Txt style={styles.name} lines={1}>
            {friend.name}
          </Txt>
          {friend.character.series ? (
            <Txt style={styles.series} lines={1}>
              {friend.character.series}
            </Txt>
          ) : null}
        </View>
        {picked ? (
          <View style={[styles.check, styles.checkOn]}>
            <Ionicons name="checkmark" size={15} color={colors.white} />
          </View>
        ) : (
          <View style={styles.check} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  pressed: { backgroundColor: colors.surfaceAlt },
  locked: { opacity: 0.4 },
  body: { flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingRight: space.lg },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  text: { flex: 1, gap: 1 },
  name: { fontSize: 17, letterSpacing: -0.4, color: colors.text },
  series: { fontSize: 13, color: colors.textSecondary },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderStrong },
  checkOn: { borderWidth: 0, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
