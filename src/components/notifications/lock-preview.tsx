import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CharacterAvatar, Txt } from '@/components/ui';
import { colors, fonts, space } from '@/theme';
import type { Character } from '@/types';

/**
 * What a push looks like on the phone: the morning message that would really arrive
 * (same character and line as the planner), with or without its text, on a calm
 * grey card (docs/design-style.md).
 */
export function LockPreview({
  at,
  character,
  name,
  line,
}: {
  /** "08:00" */
  at: string;
  character?: Character;
  name: string;
  /** What the notification shows: their words, or the hidden-text stand-in. */
  line: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.screen}>
      <Txt style={styles.clock} center>
        {at}
      </Txt>
      <View style={styles.note}>
        {character ? <CharacterAvatar character={character} size={38} /> : null}
        <View style={styles.body}>
          <View style={styles.who}>
            <Txt variant="smallStrong" lines={1} style={styles.body}>
              {name}
            </Txt>
            <Txt variant="caption" color={colors.textMuted}>
              {t('notifications.now')}
            </Txt>
          </View>
          <Txt variant="small" color={colors.textSecondary} lines={2}>
            {line}
          </Txt>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    marginHorizontal: space.lg,
    marginTop: space.sm,
    borderRadius: 22,
    paddingTop: space.lg,
    paddingBottom: space.md + 2,
    paddingHorizontal: space.md + 2,
    gap: space.md,
    backgroundColor: colors.surfaceAlt,
  },
  clock: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.text },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  body: { flex: 1, minWidth: 0 },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
