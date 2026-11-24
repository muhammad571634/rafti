import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef } from 'react';
import { type LayoutChangeEvent, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/pressable-scale';
import { haptic } from '@/lib/haptics';
import { ink, inkPeachGlass, inkRadius } from '@/theme/ink';

import { InkText } from './ink-text';

const TRACK_PAD = 3;
/** Asymmetric lead/trail springs: leading edge sprints ahead while trailing edge follows softly for a liquid stretch. */
const LEAD_SPRING = { stiffness: 620, damping: 36, mass: 1 } as const;
const TRAIL_SPRING = { stiffness: 190, damping: 19, mass: 1 } as const;

export interface InkSegmentedOption<T extends string | number> {
  value: T;
  label: string;
  /** Shows a small lock and stays tappable (the screen says why). */
  locked?: boolean;
}

export interface InkSegmentedProps<T extends string | number> {
  options: readonly InkSegmentedOption<T>[];
  /** Nothing chosen yet leaves every segment plain (UISegmentedControl's noSegment). */
  value: T | undefined;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one segmented control (HIG Segmented controls): two to five equal segments on a soft track,
 * the chosen one inside a Liquid Peach Glass lens that stretches asymmetrically as it glides.
 * A tap on another segment ticks a selection haptic; a tap on the chosen one does nothing.
 */
export function InkSegmented<T extends string | number>({ options, value, onChange, accessibilityLabel, style }: InkSegmentedProps<T>) {
  const reducedMotion = useReducedMotion();
  const activeIdx = value === undefined ? -1 : options.findIndex((o) => o.value === value);

  const rects = useRef<Record<number, { x: number; width: number }>>({});
  const prevIdx = useRef<number>(-1);
  const measured = useRef(false);

  const lensLeft = useSharedValue(TRACK_PAD);
  const lensRight = useSharedValue(TRACK_PAD);
  const lensOpacity = useSharedValue(0);

  const syncLens = useCallback(
    (idx: number, animate: boolean) => {
      if (idx < 0) {
        prevIdx.current = -1;
        lensOpacity.value = animate && !reducedMotion ? withTiming(0, { duration: 140 }) : 0;
        return;
      }
      const rect = rects.current[idx];
      if (!rect || rect.width <= 0) return;

      const targetLeft = rect.x;
      const targetRight = rect.x + rect.width;
      const wasHidden = prevIdx.current < 0;
      const movingRight = idx > prevIdx.current;

      if (!animate || reducedMotion || wasHidden || !measured.current) {
        lensLeft.value = targetLeft;
        lensRight.value = targetRight;
        lensOpacity.value = wasHidden && animate && !reducedMotion ? withTiming(1, { duration: 150 }) : 1;
      } else if (movingRight) {
        lensRight.value = withSpring(targetRight, LEAD_SPRING);
        lensLeft.value = withSpring(targetLeft, TRAIL_SPRING);
        lensOpacity.value = 1;
      } else {
        lensLeft.value = withSpring(targetLeft, LEAD_SPRING);
        lensRight.value = withSpring(targetRight, TRAIL_SPRING);
        lensOpacity.value = 1;
      }

      prevIdx.current = idx;
      measured.current = true;
    },
    [lensLeft, lensOpacity, lensRight, reducedMotion],
  );

  useEffect(() => {
    syncLens(activeIdx, measured.current);
  }, [activeIdx, syncLens]);

  const onSegmentLayout = useCallback(
    (idx: number) => (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      const prev = rects.current[idx];
      if (prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.width - width) < 0.5) return;
      rects.current[idx] = { x, width };
      if (idx === activeIdx) {
        syncLens(activeIdx, false);
      }
    },
    [activeIdx, syncLens],
  );

  const lensStyle = useAnimatedStyle(() => {
    const left = Math.min(lensLeft.value, lensRight.value);
    const width = Math.max(0, Math.abs(lensRight.value - lensLeft.value));
    return {
      left,
      width,
      opacity: lensOpacity.value,
    };
  });

  return (
    <View style={[styles.track, style]} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      <LinearGradient
        colors={inkPeachGlass.trackFill}
        locations={inkPeachGlass.trackStops}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Animated.View pointerEvents="none" style={[styles.lens, lensStyle]}>
        <LinearGradient colors={inkPeachGlass.fill} style={StyleSheet.absoluteFill} pointerEvents="none" />
      </Animated.View>
      {options.map((option, idx) => {
        const on = idx === activeIdx;
        return (
          <View key={String(option.value)} onLayout={onSegmentLayout(idx)} style={styles.segmentWrap}>
            <PressableScale
              onPress={() => {
                if (on) return;
                haptic.selection();
                onChange(option.value);
              }}
              scaleTo={0.97}
              dimOnPress={false}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              aria-selected={on}
              style={styles.segment}>
              {option.locked ? <Ionicons name="lock-closed" size={12} color={on ? inkPeachGlass.text : ink.text2} /> : null}
              <InkText
                variant={on ? 'subStrong' : 'sub'}
                color={on ? inkPeachGlass.text : ink.text2}
                lines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                maxFontSizeMultiplier={1.3}>
                {option.label}
              </InkText>
            </PressableScale>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: TRACK_PAD,
    borderRadius: inkRadius.pill,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: inkPeachGlass.trackRim,
  },
  lens: {
    position: 'absolute',
    top: TRACK_PAD,
    bottom: TRACK_PAD,
    borderRadius: inkRadius.pill,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: inkPeachGlass.rim,
  },
  segmentWrap: {
    flex: 1,
  },
  // 38 + the track's 3 + 3 = a 44 pt control.
  segment: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: inkRadius.pill,
  },
});
