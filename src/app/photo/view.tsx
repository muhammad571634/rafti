import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { PressableScale } from '@/components/ui';
import { space } from '@/theme';
import { ink } from '@/theme/ink';

const MAX_ZOOM = 4;
/** A double tap zooms to this, around the finger. */
const TAP_ZOOM = 2.5;
/** At full size a drag down this far (or a flick) closes the picture. */
const CLOSE_AT = 120;
const SETTLE = { damping: 24, stiffness: 260, reduceMotion: ReduceMotion.System };

/**
 * A photo from a chat, full screen (iOS Photos, Telegram): on black, pinch to zoom up to 4x, drag
 * around while zoomed, double tap to zoom in at the finger or back out, drag down at full size to
 * close (the black fades as it goes), × in the corner.
 */
export default function PhotoView() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  /** The drag down that closes it, at full size only. */
  const drop = useSharedValue(0);

  const close = () => router.back();

  // How far the zoomed picture may move before an edge comes into view.
  const clamp = (value: number, size: number, zoom: number) => {
    'worklet';
    const room = (size * (zoom - 1)) / 2;
    return Math.max(-room, Math.min(room, value));
  };
  const reset = () => {
    'worklet';
    scale.value = withSpring(1, SETTLE);
    savedScale.value = 1;
    x.value = withSpring(0, SETTLE);
    y.value = withSpring(0, SETTLE);
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.8, Math.min(MAX_ZOOM, savedScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value <= 1.05) return reset();
      savedScale.value = scale.value;
      x.value = withSpring(clamp(x.value, width, scale.value), SETTLE);
      y.value = withSpring(clamp(y.value, height, scale.value), SETTLE);
      savedX.value = clamp(x.value, width, scale.value);
      savedY.value = clamp(y.value, height, scale.value);
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (savedScale.value > 1) {
        x.value = savedX.value + e.translationX;
        y.value = savedY.value + e.translationY;
      } else if (e.numberOfPointers === 1) {
        drop.value = Math.max(0, e.translationY);
      }
    })
    .onEnd((e) => {
      if (savedScale.value > 1) {
        savedX.value = clamp(x.value, width, savedScale.value);
        savedY.value = clamp(y.value, height, savedScale.value);
        x.value = withSpring(savedX.value, SETTLE);
        y.value = withSpring(savedY.value, SETTLE);
        return;
      }
      if (drop.value > CLOSE_AT || e.velocityY > 900) {
        drop.value = withTiming(height, { duration: 180 });
        scheduleOnRN(close);
        return;
      }
      drop.value = withSpring(0, SETTLE);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(260)
    .onEnd((e) => {
      if (savedScale.value > 1) return reset();
      // Zoom in so the spot under the finger stays under it.
      const toX = clamp((width / 2 - e.x) * (TAP_ZOOM - 1), width, TAP_ZOOM);
      const toY = clamp((height / 2 - e.y) * (TAP_ZOOM - 1), height, TAP_ZOOM);
      scale.value = withSpring(TAP_ZOOM, SETTLE);
      savedScale.value = TAP_ZOOM;
      x.value = withSpring(toX, SETTLE);
      y.value = withSpring(toY, SETTLE);
      savedX.value = toX;
      savedY.value = toY;
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const picture = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value + drop.value }, { scale: scale.value * (1 - Math.min(drop.value, 400) / 2000) }],
  }));
  const ground = useAnimatedStyle(() => ({ opacity: 1 - Math.min(drop.value, 300) / 400 }));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Animated.View style={[StyleSheet.absoluteFill, styles.black, ground]} />
      <GestureDetector gesture={gesture}>
        <Animated.View style={[StyleSheet.absoluteFill, picture]}>
          {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityIgnoresInvertColors /> : null}
        </Animated.View>
      </GestureDetector>
      <PressableScale
        scaleTo={0.88}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        hitSlop={8}
        style={[styles.close, { top: insets.top + space.sm }]}>
        <Ionicons name="close" size={22} color={ink.text} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  black: { backgroundColor: '#000' },
  close: {
    position: 'absolute',
    left: space.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // Dark glass: it stays seen over a light picture, zoomed or not.
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
  },
});
