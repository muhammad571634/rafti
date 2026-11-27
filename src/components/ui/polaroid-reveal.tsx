import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import {
  POLAROID_DEV_DELAY_MS,
  POLAROID_DEV_MS,
  POLAROID_EJECT_MS,
  polaroidTiltDeg,
} from '@/lib/polaroid-motion';
import { createPolaroidSound, type PolaroidSound } from '@/lib/polaroid-sound';
import { ink, inkRadius } from '@/theme/ink';

const EJECT_SPRING = { damping: 16, stiffness: 145, mass: 0.9 };
const TILT_SPRING = { damping: 18, stiffness: 220, mass: 0.7 };

export interface PolaroidRevealProps {
  children: React.ReactNode;
  /** Plays camera flash, mechanical shutter/whir, ejection slide, and darkroom develop sparkle on mount. */
  active?: boolean;
  /** Draws a sleek darkroom print slot bar directly above the emerging Polaroid. */
  withSlot?: boolean;
  /** Adds a chemical darkroom emulsion veil over the child (for components without their own developer). */
  withVeil?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tactile Polaroid ejection + chemical darkroom reveal + interactive 3D paper tilt.
 * Preserves view-shot capture once settled (100% opaque, zero clipping distortion).
 */
export function PolaroidReveal({
  children,
  active = true,
  withSlot = false,
  withVeil = false,
  style,
}: PolaroidRevealProps) {
  const reduced = useReducedMotion();
  const [size, setSize] = useState({ w: 220, h: 260 });
  const sizeW = useSharedValue(220);
  const sizeH = useSharedValue(260);

  const ejectY = useSharedValue(active && !reduced ? -160 : 0);
  const ejectRot = useSharedValue(active && !reduced ? -4.5 : 0);
  const flashOp = useSharedValue(0);
  const veilOp = useSharedValue(active && withVeil && !reduced ? 0.92 : 0);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const glareOp = useSharedValue(0);

  const soundRef = useRef<PolaroidSound | null>(null);

  useEffect(() => {
    if (!active) return;
    const sound = createPolaroidSound();
    soundRef.current = sound;
    haptic.lift();
    sound.shutter();

    let sparkleTimer: ReturnType<typeof setTimeout> | undefined;

    if (!reduced) {
      flashOp.value = withSequence(
        withTiming(0.82, { duration: 70, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }),
      );
      ejectY.value = -160;
      ejectRot.value = -4.5;
      ejectY.value = withDelay(60, withSpring(0, EJECT_SPRING));
      ejectRot.value = withDelay(60, withTiming(0, { duration: POLAROID_EJECT_MS, easing: Easing.out(Easing.cubic) }));

      if (withVeil) {
        veilOp.value = 0.92;
        veilOp.value = withDelay(
          POLAROID_DEV_DELAY_MS,
          withTiming(0, { duration: POLAROID_DEV_MS, easing: Easing.out(Easing.cubic) }),
        );
      }

      sparkleTimer = setTimeout(() => {
        haptic.tap();
        soundRef.current?.sparkle();
      }, POLAROID_DEV_DELAY_MS + POLAROID_DEV_MS);
    }

    return () => {
      if (sparkleTimer) clearTimeout(sparkleTimer);
      cancelAnimation(ejectY);
      cancelAnimation(ejectRot);
      cancelAnimation(flashOp);
      cancelAnimation(veilOp);
      sound.dispose();
      soundRef.current = null;
    };
  }, [active, reduced, withVeil, ejectY, ejectRot, flashOp, veilOp]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      if (width > 0 && height > 0) {
        setSize({ w: width, h: height });
        sizeW.value = width;
        sizeH.value = height;
      }
    },
    [sizeW, sizeH],
  );

  // Subtle interactive 3D tilt when rubbing or inspecting the developed Polaroid.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-8, 8])
        .onUpdate((e) => {
          'worklet';
          if (reduced) return;
          const nx = (e.x / Math.max(1, sizeW.value)) * 2 - 1;
          const ny = (e.y / Math.max(1, sizeH.value)) * 2 - 1;
          const { rotateX, rotateY } = polaroidTiltDeg(nx, ny, 9);
          tiltX.value = rotateX;
          tiltY.value = rotateY;
          glareOp.value = 0.22;
        })
        .onFinalize(() => {
          'worklet';
          tiltX.value = withSpring(0, TILT_SPRING);
          tiltY.value = withSpring(0, TILT_SPRING);
          glareOp.value = withTiming(0, { duration: 220 });
        }),
    [reduced, sizeW, sizeH, tiltX, tiltY, glareOp],
  );

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { translateY: ejectY.value },
      { rotateZ: `${ejectRot.value}deg` },
      { rotateX: `${tiltX.value}deg` },
      { rotateY: `${tiltY.value}deg` },
    ],
  }));

  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOp.value }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veilOp.value }));
  const glareStyle = useAnimatedStyle(() => ({ opacity: glareOp.value }));

  return (
    <View style={[styles.wrap, style]}>
      {withSlot ? <View pointerEvents="none" style={[styles.slot, { width: Math.max(160, size.w + 18) }]} /> : null}
      <View style={withSlot ? styles.slotMask : undefined}>
        <GestureDetector gesture={pan}>
          <Animated.View onLayout={onLayout} style={cardStyle}>
            {children}
            {withVeil ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.veil, veilStyle]} /> : null}
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glare, glareStyle]} />
          </Animated.View>
        </GestureDetector>
      </View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: {
    height: 9,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.ground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
    marginBottom: -4,
    zIndex: 2,
  },
  slotMask: {
    overflow: 'hidden',
    paddingTop: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  veil: {
    borderRadius: 6,
    backgroundColor: ink.ground,
  },
  glare: {
    borderRadius: 6,
    backgroundColor: ink.text,
  },
  flash: {
    backgroundColor: ink.text,
    zIndex: 10,
  },
});
