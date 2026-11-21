import { Image } from 'expo-image';
import { type ReactElement, type ReactNode, useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
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
const UNFOLD = { duration: 640, dampingRatio: 1 } as const;
const FOLD = { duration: 540, dampingRatio: 1 } as const;
/** The letters drift this far out from behind the mascot while they appear. */
const DRIFT = 4;
/** Room between the open capsule's rounded ends and the word, as in your name's capsule. */
const PAD_X = 14;
/** The mascot's face on the wordmark (art pixels); the closed capsule is a circle around it. */
const FACE_X = 440;

const { hop, si, mascot, mazam } = LOGO_LAYERS;
const LAYER_H = LOGO_ART.height + LOGO_ART.pad * 2;

type GlassComponent = (props: { style?: StyleProp<ViewStyle>; children: ReactNode }) => ReactElement;

/**
 * Today's logo in a glass capsule, the same glass, height and rounding as your name's capsule,
 * mirroring it in the leading corner (owner, 2026-11-04: calm-card edges, the picture showing
 * through, the mascot in the corner like the profile button).
 *
 * Closed: a glass circle in the corner with only the mascot in it, full body and waving, so the
 * friend's picture stays clear ("branding defers to content", HIG Branding; owner: no G, only the
 * mascot). A tap grows the capsule to the right while the mascot slides into its place in the word
 * and settles onto its G, then "Si" and "MAZAM" unfold out of the G inside it. It folds back by
 * itself after ten seconds, or at once on a second tap ("let people cancel motion"). The capsule
 * squishes softly under the finger; under Reduce Motion everything just cross-fades.
 *
 * Fills its parent (as tall as `height`, the capsule's height); the open word fits the row's width.
 */
export function FoldingLogo({
  height,
  artHeight,
  label,
  Glass,
}: {
  height: number;
  artHeight: number;
  label: string;
  Glass: GlassComponent;
}) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);
  const squish = useSharedValue(1);

  // Wordmark pixels to points: as tall as asked, never wider than the row leaves for the capsule.
  const fit = width ? (width - PAD_X * 2) / LOGO_ART.width : Infinity;
  const s = Math.min(artHeight / LOGO_ART.height, fit);
  const layerH = LAYER_H * s;
  const artTop = (height - LOGO_ART.height * s) / 2;
  const siW = si.width * s;
  const mazamW = mazam.width * s;
  // Both start at the row's leading edge: closed, a circle with the mascot's face at its centre;
  // open, the word's width. Closed, the art slides left by `shift` to put the face there.
  const openW = LOGO_ART.width * s + PAD_X * 2;
  const shift = height / 2 - (PAD_X + FACE_X * s);

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(open ? 1 : 0, {
          duration: 220,
          easing: Easing.out(Easing.quad),
        })
      : withSpring(open ? 1 : 0, open ? UNFOLD : FOLD);
    if (!open) return;
    const timer = setTimeout(() => setOpen(false), LOGO_OPEN_MS);
    return () => clearTimeout(timer);
  }, [open, progress, reduceMotion]);

  // The capsule leads; the mascot settles onto its G as it grows (the lone pose fades while the
  // one holding the G drops in from a few points above); then "Si" unfolds leftward out of the G
  // and "MAZAM" rightward, always inside the capsule, the wipe a little ahead of the fade so a
  // letter's edge is never hard. Closing runs the same path backward.
  const capsule = useAnimatedStyle(() => {
    const t = interpolate(progress.value, [0, 0.72], [0, 1], 'clamp');
    return {
      width: height + (openW - height) * t,
    };
  });
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: shift * (1 - interpolate(progress.value, [0, 0.72], [0, 1], 'clamp')) }],
  }));
  const squished = useAnimatedStyle(() => ({
    transform: [{ scale: squish.value }],
  }));
  const hopStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3], [1, 0], 'clamp'),
    transform: [
      {
        translateY: reduceMotion ? 0 : interpolate(progress.value, [0, 0.3], [0, 3], 'clamp'),
      },
      {
        scale: reduceMotion ? 1 : interpolate(progress.value, [0, 0.3], [1, 0.96], 'clamp'),
      },
    ],
  }));
  const onGStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.06, 0.34], [0, 1], 'clamp'),
    transform: [
      {
        translateY: reduceMotion ? 0 : interpolate(progress.value, [0.06, 0.45], [-4, 0], 'clamp'),
      },
    ],
  }));
  const siClip = useAnimatedStyle(() => ({
    width: reduceMotion ? siW : siW * interpolate(progress.value, [0.2, 0.94], [0, 1], 'clamp'),
    opacity: interpolate(progress.value, [0.2, 1], [0, 1], 'clamp'),
  }));
  const siArt = useAnimatedStyle(() => ({
    transform: [{ translateX: reduceMotion ? 0 : (1 - progress.value) * DRIFT }],
  }));
  const mazamClip = useAnimatedStyle(() => ({
    width: reduceMotion ? mazamW : mazamW * interpolate(progress.value, [0.2, 0.94], [0, 1], 'clamp'),
    opacity: interpolate(progress.value, [0.2, 1], [0, 1], 'clamp'),
  }));
  const mazamArt = useAnimatedStyle(() => ({
    transform: [{ translateX: reduceMotion ? 0 : (progress.value - 1) * DRIFT }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  // Squish around the closed circle's centre, the corner the finger presses.
  const origin: ViewStyle = { transformOrigin: [height / 2, height / 2, 0] };

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout} pointerEvents="box-none">
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, squished, origin]}>
        {/* The glass capsule: a circle around the mascot, the whole word's width when open. */}
        <Animated.View style={[styles.capsule, { height, borderRadius: height / 2 }, capsule]}>
          <Glass style={[StyleSheet.absoluteFill, { borderRadius: height / 2 }]}>{null}</Glass>
        </Animated.View>

        <Animated.View
          style={[
            styles.art,
            {
              left: PAD_X,
              top: artTop - LOGO_ART.pad * s,
              width: LOGO_ART.width * s,
              height: layerH,
            },
            slide,
          ]}>
          {/* "Si": anchored at its right edge, by the G, and revealed toward the left. */}
          <Animated.View style={[styles.clip, { right: (LOGO_ART.width - si.x - si.width) * s, height: layerH }, siClip]}>
            <Animated.View style={[styles.anchorRight, { width: siW, height: layerH }, siArt]}>
              <Image source={si.source} style={styles.fill} contentFit="fill" />
            </Animated.View>
          </Animated.View>

          {/* "MAZAM": anchored at the M, revealed toward the right. */}
          <Animated.View style={[styles.clip, { left: mazam.x * s, height: layerH }, mazamClip]}>
            <Animated.View style={[styles.anchorLeft, { width: mazamW, height: layerH }, mazamArt]}>
              <Image source={mazam.source} style={styles.fill} contentFit="fill" />
            </Animated.View>
          </Animated.View>

          {/* The mascot on its G, above the letters. */}
          <Animated.View style={[styles.layer, { left: mascot.x * s, width: mascot.width * s, height: layerH }, onGStyle]}>
            <Image source={mascot.source} style={styles.fill} contentFit="fill" />
          </Animated.View>

          {/* The mascot alone, full body. */}
          <Animated.View style={[styles.layer, { left: hop.x * s, width: hop.width * s, height: layerH }, hopStyle]}>
            <Image source={hop.source} style={styles.fill} contentFit="fill" />
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* The whole capsule is the button, open or closed. */}
      <Animated.View style={[styles.capsule, { height }, capsule]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ expanded: open }}
          hitSlop={4}
          style={styles.fill}
          onPressIn={() => {
            if (!reduceMotion)
              squish.value = withSpring(0.94, {
                duration: 180,
                dampingRatio: 1,
              });
          }}
          onPressOut={() => {
            // A soft jelly settle back to size.
            squish.value = reduceMotion ? 1 : withSpring(1, { duration: 560, dampingRatio: 0.55 });
          }}
          onPress={() => {
            haptic.selection();
            setOpen((o) => !o);
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: { position: 'absolute', top: 0 },
  art: { position: 'absolute' },
  clip: { position: 'absolute', top: 0, overflow: 'hidden' },
  anchorLeft: { position: 'absolute', top: 0, left: 0 },
  anchorRight: { position: 'absolute', top: 0, right: 0 },
  layer: { position: 'absolute', top: 0 },
  fill: { width: '100%', height: '100%' },
});
