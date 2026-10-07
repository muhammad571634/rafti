import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, CharacterAvatar, ListRow, Txt } from '@/components/ui';
import { colors, space } from '@/theme';
import type { Character } from '@/types';

export const CHARACTER_ROW_AVATAR = 52;

/**
 * A character in a discovery list: portrait (a green phone when they can be called),
 * name and bio, and "Add" or "Friends". The row and "Add" are siblings: a button
 * inside a button is unreachable for screen readers and invalid HTML on web.
 */
export function CharacterRow({
  character,
  isFriend,
  onOpen,
  onAdd,
}: {
  character: Character;
  isFriend: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <ListRow
        size="large"
        title={character.name}
        subtitle={character.bio}
        left={
          <CharacterAvatar character={character} size={CHARACTER_ROW_AVATAR} verified={character.voiceReady} badge="call" />
        }
        onPress={onOpen}
        style={styles.main}
      />
      {isFriend ? (
        <View style={styles.friends}>
          <Ionicons name="checkmark" size={14} color={colors.textMuted} />
          <Txt variant="caption" color={colors.textMuted}>
            {t('find.friends')}
          </Txt>
        </View>
      ) : (
        <Button label={t('find.add')} size="sm" variant="secondary" onPress={onAdd} style={styles.add} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: space.lg },
  main: { flex: 1, paddingRight: space.sm },
  friends: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  add: { minWidth: 56 },
});
