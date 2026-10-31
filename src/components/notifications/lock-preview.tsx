import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CharacterAvatar, Txt } from '@/components/ui';
import { colors, isDark, space } from '@/theme';
import type { Character } from '@/types';

/** A soft dusk wallpaper, deeper in dark mode, so the white clock always reads. */
const WALLPAPER = isDark ? (['#2A2560', '#5A3058', '#8A4A3A'] as const) : (['#6C7BE0', '#B48BD8', '#F2A98A'] as const);

/**
 * What a push looks like on the phone: the morning message that would really arrive
 * (same character and line as the planner), with or without its text, as an iOS lock
 * screen: a wallpaper, the big clock and a frosted notification.
 */
export function LockPreview({
  at,
  character,
  name,
  line,
  day,
  dropIn,
  style,
}: {
  /** "08:00" */
  at: string;
  character?: Character;
  name: string;
  /** What the notification shows: their words, or the hidden-text stand-in. */
  line: string;
  /** A date line over the clock ("Saturday, 25 October"). */
  day?: string;
  /** The notification drops in from the top after a beat (onboarding). */
  dropIn?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  return (
    <LinearGradient colors={WALLPAPER} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.screen, style]}>
      {day ? (
        <Txt style={styles.day} center>
          {day}
        </Txt>
      ) : null}
      <Txt style={styles.clock} center>
        {at}
      </Txt>
      <Animated.View
        entering={dropIn ? FadeInDown.withInitialValues({ transform: [{ translateY: -70 }] }).delay(500).springify().damping(15) : undefined}
        style={styles.note}>
        {character ? <CharacterAvatar character={character} size={38} /> : null}
        <View style={styles.body}>
          <View style={styles.who}>
            <Txt style={[styles.name, styles.body]} lines={1}>
              {name}
            </Txt>
            <Txt style={styles.now}>{t('notifications.now')}</Txt>
          </View>
          <Txt style={styles.line} lines={2}>
            {line}
          </Txt>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const INK = colors.text;

const styles = StyleSheet.create({
  screen: {
    marginHorizontal: space.lg,
    marginTop: space.sm,
    borderRadius: 22,
    overflow: 'hidden',
    paddingTop: space.lg,
    paddingBottom: space.md,
    paddingHorizontal: space.md,
    gap: space.lg,
  },
  day: { marginBottom: -space.md, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  // The iOS lock clock: big, heavy and white over the wallpaper.
  clock: { fontSize: 56, lineHeight: 62, fontWeight: '700', letterSpacing: -1, color: colors.white, fontVariant: ['tabular-nums'] },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(30,30,32,0.62)' : 'rgba(255,255,255,0.72)',
  },
  body: { flex: 1, minWidth: 0 },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: INK },
  now: { fontSize: 13, color: isDark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)' },
  line: { fontSize: 15, lineHeight: 20, letterSpacing: -0.2, color: INK },
});
