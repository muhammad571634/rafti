import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Anim, Header, IconTile, PressableScale, Screen, Txt } from '@/components/ui';
import { duration } from '@/lib/format';
import { radioTracks } from '@/mock';
import { colors, radius, space } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Line icons for the calm-cards rows (docs/design-style.md); the clay art stays for other screens. */
const LINE_ICON: Record<string, IoniconName> = {
  r_rain: 'rainy-outline',
  r_fire: 'flame-outline',
  r_waves: 'water-outline',
  r_cafe: 'cafe-outline',
  r_lullaby: 'moon-outline',
};

/**
 * Background sounds. The playing track is the selected card, and a bar at the bottom
 * says how long is left. Real builds play the track with expo-audio; the mock runs the clock.
 */
export default function RadioScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [playing, setPlaying] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const track = radioTracks.find((r) => r.id === playing);
  const total = track ? track.minutes * 60 : 0;

  useEffect(() => {
    if (!playing) return;
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, [playing]);

  // The track ends on its own when its time is up.
  useEffect(() => {
    if (track && elapsed >= total) setPlaying(null);
  }, [track, elapsed, total]);

  const toggle = (id: string) => {
    setElapsed(0);
    setPlaying((current) => (current === id ? null : id));
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('radio.title')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {radioTracks.map((item) => {
          const active = playing === item.id;
          const title = t(`radio.tracks.${item.titleKey}`);
          return (
            <PressableScale
              key={item.id}
              scaleTo={0.985}
              onPress={() => toggle(item.id)}
              accessibilityRole="button"
              accessibilityLabel={title}
              accessibilityState={{ selected: active }}
              style={[styles.row, active && styles.rowActive]}>
              <IconTile icon={LINE_ICON[item.id] ?? 'musical-notes-outline'} size={44} radius={13} glyphSize={21} />
              <View style={styles.flex}>
                <Txt variant="title">{title}</Txt>
                <Txt variant="small" color={colors.textSecondary}>
                  {t('radio.minutes', { count: item.minutes })}
                </Txt>
              </View>
              <View style={[styles.play, active && styles.playActive]}>
                <Ionicons
                  name={active ? 'pause' : 'play'}
                  size={16}
                  color={active ? colors.textOnPrimary : colors.text}
                />
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>

      {track ? (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.md) + space.sm }]}>
          <View style={styles.barHead}>
            <Anim name="voiceWave" size={26} tint={colors.text} />
            <Txt variant="bodyStrong" style={styles.flex} lines={1}>
              {t(`radio.tracks.${track.titleKey}`)}
            </Txt>
            <Txt variant="small" color={colors.textSecondary} style={styles.clock}>
              {t('radio.left', { time: duration(Math.max(0, total - elapsed)) })}
            </Txt>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, (elapsed / total) * 100)}%` }]} />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.huge, gap: space.xs + 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md + 2,
    minHeight: 72,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.tile,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rowActive: { backgroundColor: colors.surface, borderColor: colors.text },
  play: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playActive: { backgroundColor: colors.text },
  bar: {
    gap: space.sm + 2,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  barHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  clock: { fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.text },
});
