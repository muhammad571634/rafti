import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRadioPlayer } from '@/components/radio/radio-player';
import { useRadioClip } from '@/components/radio/use-clips';
import { CharacterAvatar, characterImage, EmptyState, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { duration } from '@/lib/format';
import { lineAt } from '@/lib/radio-clips';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

const COVER = 220;

/** Alert.alert is a no-op on web; fall back to the browser's confirm there (as in group info). */
function confirm(title: string, message: string, action: string, onConfirm: () => void, cancel: string) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * Clip player (F27, approved prototype): the friend's picture, the title, the words with the
 * line being said in ink, the progress, and play. The user's own clips can go to the chat
 * with that friend, or be deleted.
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
  const hasChat = useAppStore((s) => !!clip && s.conversations.some((c) => c.characterId === clip.character.id));
  const [sent, setSent] = useState(false);
  const toast = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playable = !!clip && !clip.locked;
  const loaded = playable && player.kind === 'clip' && player.id === clip.id;

  // Opening a clip plays it, unless it is already the one loaded.
  useEffect(() => {
    if (!clip || clip.locked) return;
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

  if (!clip || clip.locked) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('radio.title')} />
        <EmptyState
          icon="radio"
          title={t('radio.gone')}
          actionLabel={t('radio.title')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const elapsed = loaded ? player.elapsed : 0;
  const current = loaded ? lineAt(clip.lines, elapsed) : -1;
  const image = characterImage(clip.character);

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
    <Screen background={colors.bgPlain}>
      <Header
        title={t('radio.title')}
        right={
          clip.mine ? (
            <PressableScale
              onPress={remove}
              hitSlop={10}
              scaleTo={0.88}
              accessibilityRole="button"
              accessibilityLabel={t('radio.delete')}>
              <Ionicons name="trash-outline" size={22} color={colors.text} />
            </PressableScale>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Animated.View style={[styles.cover, coverStyle]}>
            {image ? (
              <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
            ) : (
              <CharacterAvatar character={clip.character} size={COVER * 0.6} />
            )}
          </Animated.View>
          <Txt variant="h2" center>
            {clip.title}
          </Txt>
          <Txt variant="body" color={colors.textSecondary} center>
            {clip.mine ? t('radio.madeBy', { name: clip.name }) : t('radio.from', { name: clip.name })}
          </Txt>
        </View>

        <View style={styles.words}>
          {clip.lines.map((line, i) => (
            <Txt
              key={i}
              variant={i === current ? 'title' : 'body'}
              color={i === current ? colors.text : colors.textFaint}>
              {line}
            </Txt>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, space.lg) + space.sm }]}>
        <View style={styles.meter}>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${clip.durationSec ? Math.min(100, (elapsed / clip.durationSec) * 100) : 0}%` },
              ]}
            />
          </View>
          <View style={styles.times}>
            <Txt variant="caption" color={colors.textSecondary} style={styles.clock}>
              {duration(elapsed)}
            </Txt>
            <Txt variant="caption" color={colors.textSecondary} style={styles.clock}>
              {duration(clip.durationSec)}
            </Txt>
          </View>
        </View>

        <View style={styles.buttons}>
          <PressableScale
            onPress={() => player.play('clip', clip.id, clip.durationSec)}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={t('radio.replay')}
            style={styles.side}>
            <Ionicons name="refresh" size={24} color={colors.text} />
          </PressableScale>
          <PressableScale
            onPress={() => player.toggle('clip', clip.id, clip.durationSec)}
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityLabel={t(playing ? 'radio.pause' : 'radio.play', { title: clip.title })}
            style={styles.main}>
            <Ionicons name={playing ? 'pause' : 'play'} size={28} color={colors.textOnInk} />
          </PressableScale>
          {clip.mine && hasChat ? (
            <PressableScale
              onPress={send}
              scaleTo={0.9}
              accessibilityRole="button"
              accessibilityLabel={t('radio.send')}
              style={styles.side}>
              <Ionicons name="paper-plane-outline" size={24} color={colors.text} />
            </PressableScale>
          ) : (
            <View style={styles.side} />
          )}
        </View>
      </View>

      {sent ? (
        <View
          style={[styles.toast, { bottom: Math.max(insets.bottom, space.lg) + 150 }]}
          accessibilityLiveRegion="polite">
          <Txt variant="smallStrong" color={colors.textOnInk} center>
            {t('radio.sent', { name: clip.name })}
          </Txt>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xl, gap: space.xl },
  head: { alignItems: 'center', gap: space.xs + 2, paddingHorizontal: space.lg },
  cover: {
    width: COVER,
    height: COVER,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: space.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: {
    gap: space.sm + 2,
    padding: space.lg,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  controls: { gap: space.lg, paddingHorizontal: space.xl, paddingTop: space.md },
  meter: { gap: space.xs + 2 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.text },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  clock: { fontVariant: ['tabular-nums'] },
  buttons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  main: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: 14,
    backgroundColor: colors.text,
  },
});
