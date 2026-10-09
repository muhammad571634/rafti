import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CharacterAvatar, Txt } from '@/components/ui';
import { colors, fonts, gradients, palette, radius, space } from '@/theme';
import type { Character } from '@/types';

/**
 * What a push looks like on the phone's lock screen: the morning message that would
 * really arrive (same character and line as the planner), with or without its text.
 */
export function LockPreview({
  at,
  date,
  character,
  name,
  line,
}: {
  /** "08:00" */
  at: string;
  date: Date;
  character?: Character;
  name: string;
  /** What the lock screen shows: their words, or the hidden-text stand-in. */
  line: string;
}) {
  const { t, i18n } = useTranslation();
  return (
    <LinearGradient colors={gradients.lockScreen} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={styles.screen}>
      <View style={styles.glow} pointerEvents="none" />
      <Txt style={styles.clock} color={colors.onMedia} center>
        {at}
      </Txt>
      <Txt variant="caption" color={colors.onMediaMuted} center style={styles.date}>
        {date.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}
      </Txt>
      <View style={styles.note}>
        {character ? <CharacterAvatar character={character} size={38} /> : null}
        <View style={styles.body}>
          <View style={styles.who}>
            <Txt variant="smallStrong" color={colors.onMedia} lines={1} style={styles.body}>
              {name}
            </Txt>
            <Txt variant="caption" color={colors.onMediaMuted}>
              {t('notifications.now')}
            </Txt>
          </View>
          <Txt variant="small" color={colors.onMediaSoft} lines={3}>
            {line}
          </Txt>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    marginHorizontal: space.lg,
    marginTop: space.sm,
    borderRadius: radius.xl,
    paddingTop: space.lg,
    paddingBottom: space.md,
    paddingHorizontal: space.md,
    overflow: 'hidden',
  },
  // A warm light in the corner, like a wallpaper.
  glow: {
    position: 'absolute',
    top: -90,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: palette.apricot300,
    opacity: 0.12,
  },
  clock: { fontFamily: fonts.displaySemi, fontSize: 46, lineHeight: 50, letterSpacing: 1 },
  date: { marginTop: space.xs, marginBottom: space.md },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm + 2,
    padding: space.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.onMediaHairline,
    backgroundColor: colors.onMediaGlass,
  },
  body: { flex: 1, minWidth: 0 },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
