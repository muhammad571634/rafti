import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { LOGO_ART, LOGO_LAYERS } from '@/assets/brand/logo-layers';
import { haptic } from '@/lib/haptics';

/** How long the word stays out after a tap (owner, 2026-11-04). */
export const LOGO_OPEN_MS = 10_000;

/** A smooth spring without overshoot, close to SwiftUI's `.smooth` (HIG Motion: brief and precise). */
const UNFOLD = { duration: 620, dampingRatio: 1 } as const;
const FOLD = { duration: 520, dampingRatio: 1 } as const;
/** The letters drift this far out from behind the mascot while they appear. */
const DRIFT = 5;

const { hop, si, mascot, mazam } = LOGO_LAYERS;
const LAYER_H = LOGO_ART.height + LOGO_ART.pad * 2;

/**
 * Today's logo: only the mascot, full body and waving, where it sits in the wordmark, so the
 * friend's picture stays clear ("branding defers to content", HIG Branding; owner 2026-11-04: no
 * G, only the mascot). A tap lands it on its G and unfolds "Si" and "MAZAM" out of the G, so the
 * whole Sigmazam word reads; it folds back by itself after ten seconds, or at once on a second
 * tap ("let people cancel motion"), and the mascot is alone again. It squishes softly under the
 * finger. Under Reduce Motion the poses and the word just cross-fade.
 *
 * Fills its parent; the art is `maxHeight` tall at most (smaller when the row is narrow, as the
 * whole wordmark must fit) and its bottom sits `bottom` points above the parent's bottom.
 */
export function FoldingLogo({ maxHeight, bottom, label }: { maxHeight: number; bottom: number; label: string }) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);
  const squish = useSharedValue(1);

  // Wordmark pixels to points: as tall as allowed, never wider than the row.
  const s = width ? Math.min(maxHeight / LOGO_ART.height, width / LOGO_ART.width) : maxHeight / LOGO_ART.height;
  const layerH = LAYER_H * s;
  const siW = si.width * s;
  const mazamW = mazam.width * s;

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(open ? 1 : 0, { duration: 220, easing: Easing.out(Easing.quad) })
      : withSpring(open ? 1 : 0, open ? UNFOLD : FOLD);
    if (!open) return;
    const timer = setTimeout(() => setOpen(false), LOGO_OPEN_MS);
    return () => clearTimeout(timer);
  }, [open, progress, reduceMotion]);

  // First the mascot settles onto its G (the lone pose fades as the one holding the G drops in
  // from a few points above), then "Si" unfolds leftward out of the G and "MAZAM" rightward; the
  // wipe runs a little ahead of the fade so a letter's edge is never hard, and both drift the
  // last few points out from behind. Closing runs the same path backward.
  const hopStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3], [1, 0], 'clamp'),
    transform: [
      { translateY: reduceMotion ? 0 : interpolate(progress.value, [0, 0.3], [0, 3], 'clamp') },
      { scale: squish.value * (reduceMotion ? 1 : interpolate(progress.value, [0, 0.3], [1, 0.96], 'clamp')) },
    ],
  }));
  const onGStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.06, 0.34], [0, 1], 'clamp'),
    transform: [
      { translateY: reduceMotion ? 0 : interpolate(progress.value, [0.06, 0.45], [-4, 0], 'clamp') },
      { scale: squish.value },
    ],
  }));
  const siClip = useAnimatedStyle(() => ({
    width: reduceMotion ? siW : siW * interpolate(progress.value, [0.18, 0.92], [0, 1], 'clamp'),
    opacity: interpolate(progress.value, [0.18, 1], [0, 1], 'clamp'),
  }));
  const siArt = useAnimatedStyle(() => ({
    transform: [{ translateX: reduceMotion ? 0 : (1 - progress.value) * DRIFT }],
  }));
  const mazamClip = useAnimatedStyle(() => ({
    width: reduceMotion ? mazamW : mazamW * interpolate(progress.value, [0.18, 0.92], [0, 1], 'clamp'),
    opacity: interpolate(progress.value, [0.18, 1], [0, 1], 'clamp'),
  }));
  const mazamArt = useAnimatedStyle(() => ({
    transform: [{ translateX: reduceMotion ? 0 : (progress.value - 1) * DRIFT }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="box-none">
      <View
        pointerEvents="box-none"
        style={[styles.art, { bottom: bottom - LOGO_ART.pad * s, width: LOGO_ART.width * s, height: layerH }]}>
        {/* "Si": anchored at its right edge, by the G, and revealed toward the left. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.clip, { right: (LOGO_ART.width - si.x - si.width) * s, height: layerH }, siClip]}>
          <Animated.View style={[styles.anchorRight, { width: siW, height: layerH }, siArt]}>
            <Image source={si.source} style={styles.fill} contentFit="fill" />
          </Animated.View>
        </Animated.View>

        {/* "MAZAM": anchored at the M, revealed toward the right. */}
        <Animated.View pointerEvents="none" style={[styles.clip, { left: mazam.x * s, height: layerH }, mazamClip]}>
          <Animated.View style={[styles.anchorLeft, { width: mazamW, height: layerH }, mazamArt]}>
            <Image source={mazam.source} style={styles.fill} contentFit="fill" />
          </Animated.View>
        </Animated.View>

        {/* The mascot on its G, above the letters. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.layer, { left: mascot.x * s, width: mascot.width * s, height: layerH }, onGStyle]}>
          <Image source={mascot.source} style={styles.fill} contentFit="fill" />
        </Animated.View>

        {/* The mascot alone, on top; this spot is the only thing you can press. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ expanded: open }}
          hitSlop={8}
          onPressIn={() => {
            if (!reduceMotion) squish.value = withSpring(0.9, { duration: 180, dampingRatio: 1 });
          }}
          onPressOut={() => {
            // A soft jelly settle back to size.
            squish.value = reduceMotion ? 1 : withSpring(1, { duration: 560, dampingRatio: 0.5 });
          }}
          onPress={() => {
            haptic.selection();
            setOpen((o) => !o);
          }}
          style={[styles.layer, { left: hop.x * s, width: hop.width * s, height: layerH }]}>
          <Animated.View style={[styles.fill, hopStyle]}>
            <Image source={hop.source} style={styles.fill} contentFit="fill" />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  art: { position: 'absolute', left: 0 },
  clip: { position: 'absolute', top: 0, overflow: 'hidden' },
  anchorLeft: { position: 'absolute', top: 0, left: 0 },
  anchorRight: { position: 'absolute', top: 0, right: 0 },
  layer: { position: 'absolute', top: 0 },
  fill: { width: '100%', height: '100%' },
});
