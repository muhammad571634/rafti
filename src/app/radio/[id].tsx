import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoundButton } from '@/components/feature/feature-kit';
import { CARD_SHADOW } from '@/components/plans/store-look';
import { useRadioPlayer } from '@/components/radio/radio-player';
import { useRadioClip } from '@/components/radio/use-clips';
import { CharacterAvatar, characterImage, EmptyState, MODULE_GLYPH, PressableScale, Screen, Txt } from '@/components/ui';
import { duration } from '@/lib/format';
import { lineAt } from '@/lib/radio-clips';
import { useAppStore } from '@/store/use-app-store';
import { bottomRoom, colors, friendAccent, isDark, space, systemColors, systemGround } from '@/theme';
import { confirmAlert as confirm } from '@/lib/alert';

const COVER = 240;

/**
 * Clip player (F27), as Music's Now Playing: the friend's picture as the cover, the title, the
 * words in a card with the line being said in ink, then the progress and the controls. A thing
 * from a friend, so it wears their accent (design-style §10, a friend's space) on Apple's white
 * ground. The user's own clips can go to the chat with that friend, or be deleted.
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

  const back = <RoundButton icon="chevron-down" accessibilityLabel={t('common.back')} onPress={() => router.back()} />;

  if (!clip || clip.locked) {
    return (
      <Screen background={systemGround.ground}>
        <View style={styles.bar}>{back}</View>
        <EmptyState symbol={MODULE_GLYPH.radio} title={t('radio.gone')} actionLabel={t('common.backToRadio')} onAction={() => router.back()} />
      </Screen>
    );
  }

  const elapsed = loaded ? player.elapsed : 0;
  const current = loaded ? lineAt(clip.lines, elapsed) : -1;
  const image = characterImage(clip.character);
  const progress = clip.durationSec ? Math.min(1, elapsed / clip.durationSec) : 0;
  const accent = friendAccent(clip.character.id);

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
    <Screen background={systemGround.ground}>
      <View style={styles.bar}>
        {back}
        <View style={styles.barRight}>
          {/* The clip as a wake-up voice: a new alarm with this friend and this clip. */}
          <RoundButton
            icon="alarm"
            accessibilityLabel={t('radio.wakeWith')}
            onPress={() => router.push({ pathname: '/alarms/edit', params: { characterId: clip.character.id, clipId: clip.id } })}
          />
          {clip.mine ? (
            <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('radio.delete')} onPress={remove} style={styles.round}>
              <Ionicons name="trash" size={19} color={systemColors.red} />
            </PressableScale>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Animated.View style={[styles.cover, coverStyle]}>
            {image ? (
              <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
            ) : (
              <CharacterAvatar character={clip.character} size={COVER * 0.6} />
            )}
          </Animated.View>
          <Txt style={styles.title} center accessibilityRole="header">
            {clip.title}
          </Txt>
          <Txt style={[styles.by, { color: accent.strong }]} center>
            {clip.mine ? t('radio.madeBy', { name: clip.name }) : t('radio.from', { name: clip.name })}
          </Txt>
        </View>

        <View style={styles.words}>
          {clip.lines.map((line, i) => (
            <Txt key={i} style={[styles.line, i === current && styles.lineNow]}>
              {line}
            </Txt>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.controls, { paddingBottom: bottomRoom(insets.bottom, space.lg) + space.sm }]}>
        <View style={styles.meter}>
          <View style={styles.track}>
            <View style={[styles.fill, { backgroundColor: accent.strong, width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <View style={styles.times}>
            <Txt style={styles.clock}>{duration(elapsed)}</Txt>
            <Txt style={styles.clock}>{`-${duration(Math.max(0, clip.durationSec - elapsed))}`}</Txt>
          </View>
        </View>

        <View style={styles.buttons}>
          <PressableScale
            onPress={() => player.play('clip', clip.id, clip.durationSec)}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={t('radio.replay')}
            style={[styles.side, styles.sideFill]}>
            <Ionicons name="refresh" size={24} color={systemGround.label} />
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
              <Ionicons name="paper-plane" size={22} color={systemGround.label} />
            </PressableScale>
          ) : (
            <View style={styles.side} />
          )}
        </View>
      </View>

      {sent ? (
        <View style={[styles.toast, { bottom: bottomRoom(insets.bottom, space.lg) + 170 }]} accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle" size={18} color={systemColors.green} />
          <Txt style={styles.toastText}>{t('radio.sent', { name: clip.name })}</Txt>
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
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.fill },
  barRight: { flexDirection: 'row', gap: space.sm },
  body: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xl, gap: 22 },
  head: { alignItems: 'center', gap: 4, paddingHorizontal: space.lg },
  cover: {
    width: COVER,
    height: COVER,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 18,
    backgroundColor: systemGround.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: isDark ? 0.5 : 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 16 },
  },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3, color: systemGround.label },
  by: { fontSize: 17, fontWeight: '600' },
  words: { gap: 10, padding: 18, borderRadius: 22, backgroundColor: systemGround.card },
  line: { fontSize: 17, lineHeight: 23, color: systemGround.secondaryLabel },
  lineNow: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: systemGround.label },
  controls: { gap: 18, paddingHorizontal: space.xl, paddingTop: space.md },
  meter: { gap: 6 },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: systemGround.fill },
  fill: { height: '100%', borderRadius: 3 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  clock: { fontSize: 12, fontWeight: '600', color: systemGround.secondaryLabel, fontVariant: ['tabular-nums'] },
  buttons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  sideFill: { backgroundColor: systemGround.fill },
  main: {
    width: 76,
    height: 76,
    borderRadius: 38,
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
    borderRadius: 22,
    backgroundColor: systemGround.card,
    ...CARD_SHADOW,
  },
  toastText: { fontSize: 15, fontWeight: '600', color: systemGround.label },
});
