import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CharacterAvatar, Txt } from '@/components/ui';
import { isDark, space } from '@/theme';
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
    <LinearGradient colors={WALLPAPER} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.screen}>
      <Txt style={styles.clock} center>
        {at}
      </Txt>
      <View style={styles.note}>
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
      </View>
    </LinearGradient>
  );
}

const INK = isDark ? '#FFFFFF' : '#1C1C1E';

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
  // The iOS lock clock: big, heavy and white over the wallpaper.
  clock: { fontSize: 56, lineHeight: 62, fontWeight: '700', letterSpacing: -1, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
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
