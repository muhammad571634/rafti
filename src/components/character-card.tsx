import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CharacterAvatar, characterImage, PressableScale, Txt } from '@/components/ui';
import { colors, space } from '@/theme';
import type { Character } from '@/types';

/** Gap between two cards in a row; screens use it to size the two columns. */
export const CARD_GAP = 12;

const MARK = 32;

/**
 * A character as a portrait card (Find, world pages): picture, name, one line of bio.
 * Tapping the card opens the profile. The add button sits over the picture as a
 * sibling of the card, never inside it (a button in a button is unreachable for screen
 * readers and invalid HTML on web); a friend gets a mint tick instead.
 */
export function CharacterCard({
  character,
  width,
  isFriend,
  onOpen,
  onAdd,
}: {
  character: Character;
  width: number;
  isFriend: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const source = characterImage(character);
  const imageHeight = Math.round(width * 0.92);
  return (
    <View style={{ width }}>
      <PressableScale
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel={character.name}
        onPress={onOpen}
        style={styles.card}>
        <View style={[styles.picture, { height: imageHeight }]}>
          {source ? (
            <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <CharacterAvatar character={character} size={width * 0.5} />
          )}
        </View>
        <View style={styles.text}>
          <Txt variant="bodyStrong" lines={1}>
            {character.name}
          </Txt>
          <Txt variant="small" color={colors.textSecondary} lines={1}>
            {character.bio}
          </Txt>
        </View>
      </PressableScale>
      {isFriend ? (
        <View style={[styles.mark, styles.friend]} accessible accessibilityLabel={t('find.friends')}>
          <Ionicons name="checkmark" size={16} color={colors.white} />
        </View>
      ) : (
        <PressableScale
          scaleTo={0.88}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${t('find.add')} ${character.name}`}
          onPress={onAdd}
          style={[styles.mark, styles.add]}>
          <Ionicons name="add" size={20} color={colors.text} />
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  picture: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: { paddingHorizontal: space.md, paddingTop: space.sm + 2, paddingBottom: space.md, gap: 2 },
  mark: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: { backgroundColor: colors.surface },
  friend: { backgroundColor: colors.bondText },
});
