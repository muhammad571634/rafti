import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkIconButton, InkText } from '@/components/ink';
import { CARD_SHADOW } from '@/components/plans/store-look';
import { useRadioPlayer } from '@/components/radio/radio-player';
import { RadioWaveScrubber } from '@/components/radio/radio-wave-scrubber';
import { useRadioClip } from '@/components/radio/use-clips';
import { CharacterAvatar, characterImage, DotMatrix, EmptyState, MODULE_GLYPH, PressableScale, Screen } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { lineAt, lineStartSeconds } from '@/lib/radio-clips';
import { sharedScrubberSound } from '@/lib/scrubber-sound';
import { useAppStore } from '@/store/use-app-store';
import { bottomRoom, colors, friendAccent, immersive, space, systemColors } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';
import { confirmAlert as confirm } from '@/lib/alert';

const COVER = 220;
/** The LED field behind the cover: wider than it, so its glow rings the picture. */
const FIELD = 340;

/**
 * Clip player (F27), as Music's Now Playing: the friend's picture as the cover, the title, the
 * words in a card with the line being said in ink, then the progress and the controls. A thing
 * from a friend, so it wears their accent (design-style §10, a friend's space). Always dark, as an
 * immersive player (`immersive`, owner's brief 2026-11-11), with the LED dot field glowing behind the
 * cover in the friend's colour, swelling while the clip plays. The user's own clips can go to the chat with that friend, or be deleted.
 */
export default function ClipPlayerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clip = useRadioClip(id);
  const player = useRadioPlayer();
  const shareRadioClip = useAppStore((s) => s.shareRadioClip);
  const deleteRadioClip = useAppStore((s) => s.deleteRadioClip);
  const markHeard = useAppStore((s) => s.markRadioGiftHeard);
  const hasChat = useAppStore((s) => !!clip && s.conversations.some((c) => c.characterId === clip.character.id));
  const [sent, setSent] = useState(false);
  const [scrubPreview, setScrubPreview] = useState<number | null>(null);
  const toast = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playable = !!clip && !clip.locked;
  const loaded = playable && player.kind === 'clip' && player.id === clip.id;

  // Opening a clip plays it, unless it is already the one loaded.
  useEffect(() => {
    if (!clip || clip.locked) return;
    markHeard(clip.id);
    const now = useRadioPlayer.getState();
    if (now.kind !== 'clip' || now.id !== clip.id) now.play('clip', clip.id, clip.durationSec);
    // Only when the screen opens on a clip; later plays are the user's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip?.id]);

  useEffect(
    () => () => {
      if (toast.current) clearTimeout(toast.current);
    },
    [],
  );

  // The cover breathes while the clip plays (still with Reduce Motion on).
  const reduced = useReducedMotion();
  const breath = useSharedValue(1);
  const playing = loaded && player.playing;
  useEffect(() => {
    if (playing && !reduced) {
      breath.value = withRepeat(withTiming(1.03, { duration: 2000 }), -1, true);
    } else {
      cancelAnimation(breath);
      breath.value = withTiming(1, { duration: 300 });
    }
  }, [playing, reduced, breath]);
  const coverStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));

  const back = <InkIconButton icon="chevron-down" size={22} accessibilityLabel={t('common.back')} onPress={() => router.back()} />;

  const lineStarts = useMemo(() => (clip ? lineStartSeconds(clip.lines) : []), [clip]);

  if (!clip || clip.locked) {
    return (
      <Screen background={ink.ground}>
        <View style={styles.bar}>{back}</View>
        <EmptyState symbol={MODULE_GLYPH.radio} title={t('radio.gone')} actionLabel={t('common.backToRadio')} onAction={() => router.back()} />
      </Screen>
    );
  }

  const elapsed = loaded ? player.elapsed : 0;
  const shownElapsed = scrubPreview ?? elapsed;
  const current = loaded || scrubPreview !== null ? lineAt(clip.lines, shownElapsed) : -1;
  const image = characterImage(clip.character);
  const accent = friendAccent(clip.character.id);

  const jumpToLine = (idx: number) => {
    const startSec = lineStarts[idx] ?? 0;
    if (!loaded) player.play('clip', clip.id, clip.durationSec);
    player.seek(startSec);
    haptic.selection();
    sharedScrubberSound().settle();
  };

  const send = () => {
    if (!shareRadioClip(clip.id)) return;
    setSent(true);
    if (toast.current) clearTimeout(toast.current);
    toast.current = setTimeout(() => setSent(false), 1800);
  };

  const remove = () =>
    confirm(
      t('radio.deleteTitle'),
      t('radio.deleteBody'),
      t('radio.delete'),
      () => {
        if (loaded) player.stop();
        deleteRadioClip(clip.id);
        router.back();
      },
      t('common.cancel'),
    );

  return (
    <Screen background={immersive.ground} statusBarStyle="light">
      <View style={styles.bar}>
        {back}
        <View style={styles.barRight}>
          {/* The clip as a wake-up voice: a new alarm with this friend and this clip. */}
          <InkIconButton
            icon="alarm"
            accessibilityLabel={t('radio.wakeWith')}
            onPress={() => router.push({ pathname: '/alarms/edit', params: { characterId: clip.character.id, clipId: clip.id } })}
          />
          {clip.mine ? <InkIconButton icon="trash" color={systemColors.red} accessibilityLabel={t('radio.delete')} onPress={remove} /> : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <DotMatrix size={FIELD} color={accent.strong} energy={playing ? 1 : 0.3} active={playing} style={styles.field} />
          <Animated.View style={[styles.cover, coverStyle]}>
            {image ? (
              <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
            ) : (
              <CharacterAvatar character={clip.character} size={COVER * 0.6} />
            )}
          </Animated.View>
          <InkText variant="card" center accessibilityRole="header">
            {clip.title}
          </InkText>
          <InkText variant="bodyStrong" color={accent.strong} center>
            {clip.mine ? t('radio.madeBy', { name: clip.name }) : t('radio.from', { name: clip.name })}
          </InkText>
        </View>

        <View style={styles.words}>
          {clip.lines.map((line, i) => {
            const active = i === current;
            return (
              <Pressable
                key={i}
                onPress={() => jumpToLine(i)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.wordRow, active && { backgroundColor: accent.soft }]}>
                <View style={[styles.wordBar, active && { backgroundColor: accent.strong }]} />
                <InkText
                  variant={active ? 'bodyStrong' : 'body'}
                  color={active ? immersive.label : immersive.secondaryLabel}
                  style={styles.wordText}>
                  {line}
                </InkText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.controls, { paddingBottom: bottomRoom(insets.bottom, space.lg) + space.sm }]}>
        <RadioWaveScrubber
          elapsed={elapsed}
          durationSec={clip.durationSec}
          playing={playing}
          accentColor={accent.strong}
          lines={clip.lines}
          lineStarts={lineStarts}
          onSeek={(sec) => {
            if (!loaded) player.play('clip', clip.id, clip.durationSec);
            player.seek(sec);
          }}
          onScrubPreview={setScrubPreview}
        />

        <View style={styles.buttons}>
          <PressableScale
            onPress={() => player.play('clip', clip.id, clip.durationSec)}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={t('radio.replay')}
            style={[styles.side, styles.sideFill]}>
            <Ionicons name="refresh" size={24} color={immersive.label} />
          </PressableScale>
          <PressableScale
            onPress={() => player.toggle('clip', clip.id, clip.durationSec)}
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityLabel={t(playing ? 'radio.pause' : 'radio.play', { title: clip.title })}
            style={[styles.main, { backgroundColor: accent.strong }]}>
            <Ionicons name={playing ? 'pause' : 'play'} size={32} color={colors.white} style={!playing && styles.playNudge} />
          </PressableScale>
          {clip.mine && hasChat ? (
            <PressableScale onPress={send} scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('radio.send')} style={[styles.side, styles.sideFill]}>
              <Ionicons name="paper-plane" size={22} color={immersive.label} />
            </PressableScale>
          ) : (
            <View style={styles.side} />
          )}
        </View>
      </View>

      {sent ? (
        <View style={[styles.toast, { bottom: bottomRoom(insets.bottom, space.lg) + 170 }]} accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle" size={18} color={systemColors.green} />
          <InkText variant="subStrong" color={immersive.label}>
            {t('radio.sent', { name: clip.name })}
          </InkText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 44,
    marginTop: space.xs,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barRight: { flexDirection: 'row', gap: space.sm },
  body: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xl, gap: 22 },
  head: { alignItems: 'center', gap: 4, paddingHorizontal: space.lg, paddingTop: (FIELD - COVER) / 2 - space.md },
  field: { position: 'absolute', top: -space.md, alignSelf: 'center' },
  cover: {
    width: COVER,
    height: COVER,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    marginBottom: 18,
    backgroundColor: immersive.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 16 },
  },
  words: { gap: 6, padding: 12, borderRadius: inkRadius.card, borderCurve: 'continuous', backgroundColor: immersive.card },
  wordRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14 },
  wordBar: { width: 3, height: 18, borderRadius: inkRadius.pill, marginTop: 2 },
  wordText: { flex: 1 },
  controls: { gap: 16, paddingHorizontal: space.xl, paddingTop: space.md },
  buttons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { width: 52, height: 52, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'center' },
  sideFill: { backgroundColor: immersive.fill },
  main: {
    width: 76,
    height: 76,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  // The play triangle sits a touch right of centre, as SF's play.fill does.
  playNudge: { marginLeft: 4 },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: immersive.card,
    ...CARD_SHADOW,
  },
});
