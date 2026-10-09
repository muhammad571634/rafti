import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Anim, BrandArt, Button, CharacterAvatar, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { callClock, shortName } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { colors, gradients, radius, space } from '@/theme';

const TIMERS = [10, 20, 30, 45, 60];
const SOFT_WHITE = 'rgba(255,255,255,0.72)';

/**
 * "Sleep Together": whispers and white noise from someone you trust, on a sleep timer.
 * Keeps its night canvas (like the call screen); the rest follows docs/design-style.md:
 * h3 sections, option buttons with a white selection, an action bar at the bottom.
 */
export default function BedtimeScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);

  const known = useMemo(
    () => characters.filter((c) => c.voiceReady && conversations.some((v) => v.characterId === c.id)),
    [characters, conversations],
  );

  const [readerId, setReaderId] = useState(known[0]?.id);
  const [minutes, setMinutes] = useState(20);
  const [left, setLeft] = useState<number | null>(null);

  const reader = known.find((c) => c.id === readerId);
  const running = left != null;
  const name = reader ? shortName(reader.name) : '';

  useEffect(() => {
    if (left == null) return;
    if (left <= 0) {
      setLeft(null);
      return;
    }
    // Real builds stream the whisper track with expo-audio and fade it out at zero.
    const tick = setTimeout(() => setLeft((s) => (s == null ? null : s - 1)), 1000);
    return () => clearTimeout(tick);
  }, [left]);

  return (
    <Screen background={gradients.night} statusBarStyle="light">
      <Header title={t('bedtime.title')} tint={colors.white} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <BrandArt
          name="bedtime"
          width={Math.min(width, 520) - space.lg * 2}
          height={196}
          contentFit="cover"
          radius={22}
          bob={running}
        />

        <View style={styles.status}>
          {running ? (
            <>
              <View style={styles.timerRow}>
                <Anim name="voiceWave" size={32} tint="rgba(255,255,255,0.85)" />
                <Txt variant="heroFigure" color={colors.white}>
                  {callClock(left ?? 0)}
                </Txt>
              </View>
              <Txt variant="small" color={SOFT_WHITE}>
                {t('bedtime.whispering', { name })}
              </Txt>
            </>
          ) : reader ? (
            <>
              <Txt variant="h3" color={colors.white}>
                {t('bedtime.sleepWith', { name })}
              </Txt>
              <Txt variant="small" color={SOFT_WHITE}>
                {t('bedtime.what')}
              </Txt>
            </>
          ) : (
            <Txt variant="small" color={SOFT_WHITE}>
              {t('bedtime.noVoices')}
            </Txt>
          )}
        </View>

        {known.length > 0 ? (
          <>
            <Txt variant="h3" color={colors.white} style={styles.section}>
              {t('bedtime.who')}
            </Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.readers}>
              {known.map((character) => {
                const on = character.id === readerId;
                return (
                  <PressableScale
                    key={character.id}
                    style={styles.reader}
                    scaleTo={0.93}
                    accessibilityLabel={character.name}
                    accessibilityState={{ selected: on }}
                    onPress={() => setReaderId(character.id)}>
                    <View style={[styles.ring, on && styles.ringOn]}>
                      <CharacterAvatar character={character} size={52} />
                    </View>
                    <Txt variant="caption" lines={1} color={on ? colors.white : 'rgba(255,255,255,0.65)'} style={on && styles.bold}>
                      {shortName(character.name)}
                    </Txt>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <Txt variant="h3" color={colors.white} style={styles.section}>
          {t('bedtime.setTimer')}
        </Txt>
        <View style={styles.timers}>
          {TIMERS.map((value) => {
            const on = minutes === value;
            return (
              <PressableScale
                key={value}
                style={[styles.timer, on && styles.timerOn]}
                scaleTo={0.95}
                dimOnPress={false}
                accessibilityState={{ selected: on }}
                onPress={() => setMinutes(value)}>
                <Txt variant="smallStrong" color={on ? colors.white : SOFT_WHITE}>
                  {t('radio.minutes', { count: value })}
                </Txt>
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>

      {/* Action bar on the night canvas: one button and what happens next. */}
      <View style={styles.actionBar}>
        <Button
          label={running ? t('radio.stop') : t('bedtime.start')}
          size="lg"
          onPress={() => setLeft(running ? null : minutes * 60)}
          variant={running ? 'secondary' : 'primary'}
          disabled={!reader}
          full
        />
        <Txt variant="caption" color={SOFT_WHITE} center>
          {running ? t('bedtime.fades') : t('bedtime.stopsAfter', { count: minutes })}
        </Txt>
      </View>

      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.25)']} style={styles.scrim} pointerEvents="none" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.xl, alignItems: 'stretch' },
  status: { alignItems: 'center', justifyContent: 'center', gap: space.xs, minHeight: 92, paddingTop: space.md },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  section: { marginTop: space.lg, marginBottom: space.md },
  readers: { gap: space.md + 2 },
  reader: { width: 60, alignItems: 'center', gap: space.xs + 2 },
  ring: { padding: 2, borderRadius: radius.pill, borderWidth: 2, borderColor: 'transparent' },
  ringOn: { borderColor: colors.white },
  timers: { flexDirection: 'row', gap: space.sm },
  timer: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerOn: { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: colors.white },
  actionBar: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(16,22,48,0.45)',
    zIndex: 1,
  },
  scrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
});
