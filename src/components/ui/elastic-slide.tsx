import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { InkText } from '@/components/ink';
import { haptic } from '@/lib/haptics';
import { applySlideResistance, elasticStretch, SLIDE_UNLOCK_AT, slideDetentIndex } from '@/lib/slide-wake';
import { createSlideWakeSound, type SlideWakeSound } from '@/lib/slide-wake-sound';
import { colors, systemColors } from '@/theme';
import { ink, inkPeachGlass, inkRadius } from '@/theme/ink';

const TRACK_H = 64;
const PAD = 4;
const THUMB = TRACK_H - PAD * 2;
const RETURN_SPRING = { damping: 18, stiffness: 260, mass: 0.75 };

export interface ElasticSlideProps {
  /** 'alarm' uses golden brand-peach dawn glass; 'call' uses emerald answer glass. */
  variant: 'alarm' | 'call';
  /** Short action text inside the frosted capsule (e.g. "Slide to wake"). */
  label: string;
  /** Fired once when the user slides past the magnetic lock and releases (or activates via VoiceOver). */
  onComplete: () => void;
  /** Optional shared value (`0..1`) updated at 120 FPS on the UI thread to drive screen-wide light bloom. */
  progressOut?: SharedValue<number>;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tactile iOS-style Elastic Liquid Glass slide control for Alarm Wake-Up and Incoming Call.
 * Velocity-coupled handle squash/stretch, progressive micro-detent clicks, magnetic lock catch
 * at 84%, damped spring-back if released early, and warm harmonic chime on unlock.
 * Full VoiceOver/TalkBack fallback via single-action `onAccessibilityTap` (HIG Gestures).
 */
export function ElasticSlide({
  variant,
  label,
  onComplete,
  progressOut,
  accessibilityLabel,
  style,
}: ElasticSlideProps) {
  const reduced = useReducedMotion();
  const [trackW, setTrackW] = useState(0);
  const maxXSV = useSharedValue(0);
  const posX = useSharedValue(0);
  const velX = useSharedValue(0);
  const magneticSV = useSharedValue(false);
  const unlockedSV = useSharedValue(false);
  const lastBucketSV = useSharedValue(0);

  // Subtle staggered chevron flow while waiting for the user to slide.
  const chev1 = useSharedValue(0.3);
  const chev2 = useSharedValue(0.3);
  const chev3 = useSharedValue(0.3);

  useEffect(() => {
    if (reduced) return;
    const pulse = (delayMs: number) =>
      withDelay(
        delayMs,
        withRepeat(
          withSequence(
            withTiming(0.95, { duration: 680, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.24, { duration: 680, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        ),
      );
    chev1.value = pulse(0);
    chev2.value = pulse(180);
    chev3.value = pulse(360);
    return () => {
      cancelAnimation(chev1);
      cancelAnimation(chev2);
      cancelAnimation(chev3);
    };
  }, [reduced, chev1, chev2, chev3]);

  const soundRef = useRef<SlideWakeSound | null>(null);
  useEffect(() => {
    const engine = createSlideWakeSound(variant);
    soundRef.current = engine;
    return () => {
      engine.dispose();
      soundRef.current = null;
    };
  }, [variant]);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const fireTick = useCallback(() => {
    haptic.selection();
    soundRef.current?.tick();
  }, []);

  const fireMagnet = useCallback(() => {
    haptic.lift();
    soundRef.current?.magnet();
  }, []);

  const fireUnlock = useCallback(() => {
    haptic.success();
    soundRef.current?.unlock();
    onCompleteRef.current();
  }, []);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      setTrackW(w);
      maxXSV.value = Math.max(0, w - PAD * 2 - THUMB);
    },
    [maxXSV],
  );

  const gesture = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetX([-4, 4])
      .onBegin(() => {
        'worklet';
        if (unlockedSV.value) return;
        lastBucketSV.value = 0;
        magneticSV.value = false;
      })
      .onUpdate((e) => {
        'worklet';
        if (unlockedSV.value) return;
        const maxX = maxXSV.value;
        if (maxX <= 0) return;

        const { x, magnetic } = applySlideResistance(e.translationX, maxX);
        posX.value = x;
        velX.value = e.velocityX;

        const p = Math.max(0, Math.min(1, x / maxX));
        if (progressOut) progressOut.value = p;

        if (magnetic && !magneticSV.value) {
          magneticSV.value = true;
          scheduleOnRN(fireMagnet);
        } else if (!magnetic && magneticSV.value) {
          magneticSV.value = false;
        }

        const bucket = slideDetentIndex(p);
        if (bucket > lastBucketSV.value) {
          lastBucketSV.value = bucket;
          scheduleOnRN(fireTick);
        } else if (bucket < lastBucketSV.value) {
          lastBucketSV.value = bucket;
        }
      })
      .onEnd(() => {
        'worklet';
        if (unlockedSV.value) return;
        const maxX = maxXSV.value;
        const p = maxX > 0 ? posX.value / maxX : 0;
        velX.value = 0;

        if (p >= SLIDE_UNLOCK_AT || magneticSV.value) {
          unlockedSV.value = true;
          posX.value = withTiming(maxX, { duration: 120, easing: Easing.out(Easing.cubic) });
          if (progressOut) progressOut.value = withTiming(1, { duration: 180 });
          scheduleOnRN(fireUnlock);
        } else {
          magneticSV.value = false;
          lastBucketSV.value = 0;
          posX.value = reduced ? 0 : withSpring(0, RETURN_SPRING);
          if (progressOut) progressOut.value = reduced ? 0 : withSpring(0, RETURN_SPRING);
        }
      })
      .onFinalize(() => {
        'worklet';
        if (unlockedSV.value) return;
        velX.value = 0;
        if (posX.value > 0 && posX.value < maxXSV.value * SLIDE_UNLOCK_AT) {
          magneticSV.value = false;
          posX.value = reduced ? 0 : withSpring(0, RETURN_SPRING);
          if (progressOut) progressOut.value = reduced ? 0 : withSpring(0, RETURN_SPRING);
        }
      });
  }, [maxXSV, posX, velX, magneticSV, unlockedSV, lastBucketSV, progressOut, reduced, fireMagnet, fireTick, fireUnlock]);

  const isAlarm = variant === 'alarm';
  const fillColors: readonly [string, string] = isAlarm
    ? [ink.photoGlass, inkPeachGlass.rim]
    : [ink.photoGlass, systemColors.green];
  const thumbColors: readonly [string, string] = isAlarm
    ? inkPeachGlass.ctaFill
    : [systemColors.green, systemColors.green];
  const iconColor = isAlarm ? inkPeachGlass.ctaText : colors.white;

  const thumbStyle = useAnimatedStyle(() => {
    const { scaleX, scaleY } = reduced ? { scaleX: 1, scaleY: 1 } : elasticStretch(velX.value, magneticSV.value);
    return {
      transform: [{ translateX: posX.value }, { scaleX }, { scaleY }],
    };
  });

  const iconSpinStyle = useAnimatedStyle(() => {
    const maxX = Math.max(1, maxXSV.value);
    const p = Math.max(0, Math.min(1, posX.value / maxX));
    const deg = isAlarm ? p * 110 : -p * 18;
    return {
      transform: [{ rotate: `${deg}deg` }],
    };
  });

  const wakeFillStyle = useAnimatedStyle(() => {
    const maxX = Math.max(1, maxXSV.value);
    const p = Math.max(0, Math.min(1, posX.value / maxX));
    return {
      width: Math.max(THUMB, posX.value + THUMB + PAD),
      opacity: 0.2 + p * 0.72,
    };
  });

  const labelWrapStyle = useAnimatedStyle(() => {
    const maxX = Math.max(1, maxXSV.value);
    const p = Math.max(0, Math.min(1, posX.value / maxX));
    return {
      opacity: Math.max(0, 1 - p * 1.85),
      transform: [{ translateX: p * 18 }],
    };
  });

  const dockStyle = useAnimatedStyle(() => {
    const maxX = Math.max(1, maxXSV.value);
    const p = Math.max(0, Math.min(1, posX.value / maxX));
    return {
      opacity: 0.26 + p * 0.74,
      transform: [{ scale: magneticSV.value ? 1.08 : 1 + p * 0.04 }],
    };
  });

  const c1Style = useAnimatedStyle(() => ({ opacity: chev1.value }));
  const c2Style = useAnimatedStyle(() => ({ opacity: chev2.value }));
  const c3Style = useAnimatedStyle(() => ({ opacity: chev3.value }));

  const a11yActivate = () => {
    if (unlockedSV.value) return;
    unlockedSV.value = true;
    if (progressOut) progressOut.value = 1;
    fireUnlock();
  };

  return (
    <GestureDetector gesture={gesture}>
      <View
        onLayout={onLayout}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onAccessibilityTap={a11yActivate}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={a11yActivate}
        style={[styles.track, style]}>
        {/* Luminous wake ribbon behind the thumb */}
        {trackW > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.wake, wakeFillStyle]}>
            <LinearGradient colors={fillColors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        ) : null}

        {/* Magnetic target dock on trailing edge */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dock,
            { borderColor: isAlarm ? inkPeachGlass.rim : systemColors.green },
            dockStyle,
          ]}>
          <View style={[styles.dockDot, { backgroundColor: isAlarm ? inkPeachGlass.textBright : systemColors.green }]} />
        </Animated.View>

        {/* Centered prompt + breathing directional chevrons */}
        <Animated.View pointerEvents="none" style={[styles.labelRow, labelWrapStyle]}>
          <InkText variant="bodyStrong" color={ink.text} lines={1} style={styles.label}>
            {label}
          </InkText>
          <View style={styles.chevs}>
            <Animated.View style={c1Style}>
              <Ionicons name="chevron-forward" size={14} color={ink.photoLine} />
            </Animated.View>
            <Animated.View style={[styles.chevOverlap, c2Style]}>
              <Ionicons name="chevron-forward" size={14} color={ink.photoLine} />
            </Animated.View>
            <Animated.View style={[styles.chevOverlap, c3Style]}>
              <Ionicons name="chevron-forward" size={14} color={ink.photoLine} />
            </Animated.View>
          </View>
        </Animated.View>

        {/* Elastic liquid-glass handle */}
        <Animated.View style={[styles.thumb, thumbStyle]}>
          <LinearGradient colors={thumbColors} start={{ x: 0.15, y: 0.1 }} end={{ x: 0.85, y: 0.9 }} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={styles.thumbSpec} />
          <Animated.View style={iconSpinStyle}>
            <Ionicons name={isAlarm ? 'sunny' : 'call'} size={24} color={iconColor} />
          </Animated.View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_H,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.photoGlass,
    borderWidth: 1,
    borderColor: ink.photoGlassRim,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  wake: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: inkRadius.pill,
    overflow: 'hidden',
  },
  dock: {
    position: 'absolute',
    right: PAD + 1,
    width: THUMB - 2,
    height: THUMB - 2,
    borderRadius: inkRadius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockDot: {
    width: 7,
    height: 7,
    borderRadius: inkRadius.pill,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: THUMB + 12,
    paddingRight: THUMB + 4,
    gap: 4,
  },
  label: {
    flexShrink: 1,
  },
  chevs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevOverlap: {
    marginLeft: -7,
  },
  thumb: {
    position: 'absolute',
    left: PAD,
    width: THUMB,
    height: THUMB,
    borderRadius: inkRadius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
  },
  thumbSpec: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '44%',
    backgroundColor: ink.hairlineFill,
  },
});
