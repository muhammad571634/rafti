import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Anim, BrandArt, Button, CharacterAvatar, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { callClock } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { colors, gradients, radius, space } from '@/theme';

const TIMERS = [10, 20, 30, 45, 60];

/** "Sleep Together": whispers and white noise from someone you trust, on a sleep timer. */
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
      <Header title={t('bedtime.title')} subtitle={t('bedtime.subtitle')} tint={colors.white} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <BrandArt name="bedtime" width={Math.min(width, 520) - space.lg * 2} radius={radius.xl} bob={running} />
          {reader ? (
            <View style={styles.readerLine}>
              <CharacterAvatar character={reader} size={28} />
              <Txt variant="title" color={colors.white}>
                {reader.name}
              </Txt>
            </View>
          ) : null}
          {running ? (
            <View style={styles.timerRow}>
              <Anim name="voiceWave" size={36} tint="rgba(255,255,255,0.85)" />
              <Txt variant="display" color={colors.white}>
                {callClock(left ?? 0)}
              </Txt>
            </View>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.readerRow}
          contentContainerStyle={styles.readers}>
          {known.map((character) => (
            <PressableScale key={character.id} scaleTo={0.93} onPress={() => setReaderId(character.id)}>
              <CharacterAvatar
                character={character}
                size={50}
                ring={character.id === readerId}
                ringColor={colors.white}
              />
            </PressableScale>
          ))}
        </ScrollView>

        <View style={styles.section}>
          <Txt variant="smallStrong" color="rgba(255,255,255,0.8)">
            {t('bedtime.setTimer')}
          </Txt>
          <View style={styles.chips}>
            {TIMERS.map((value) => (
              <PressableScale
                key={value}
                style={[styles.timer, minutes === value && styles.timerActive]}
                scaleTo={0.93}
                onPress={() => setMinutes(value)}>
                <Txt variant="smallStrong" color={minutes === value ? colors.white : 'rgba(255,255,255,0.6)'}>
                  {t('radio.minutes', { count: value })}
                </Txt>
              </PressableScale>
            ))}
          </View>
        </View>

        <Button
          label={running ? t('radio.stop') : t('bedtime.start')}
          onPress={() => setLeft(running ? null : minutes * 60)}
          variant={running ? 'soft' : 'primary'}
          disabled={!reader}
          full
        />
      </ScrollView>

      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.25)']} style={styles.scrim} pointerEvents="none" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, gap: space.xl, paddingBottom: space.huge },
  hero: { alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  readerLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  readerRow: { flexGrow: 0 },
  readers: { gap: space.md },
  section: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  timer: {
    paddingHorizontal: space.lg,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerActive: { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: colors.white },
  scrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
});
