import { memo, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptic } from '@/lib/haptics';
import { ink, inkRadius, inkType } from '@/theme/ink';

const ROW = 60;
const VISIBLE = 5;
/** Rows drawn: enough to cover the drum with one hidden at each end, where a row changes its year. */
const SLOTS = 9;
const BLOCKED = '#FF8A82';

export interface YearWheelProps {
  /** The year the wheel opens on (read once). */
  initial: number;
  min: number;
  max: number;
  /** Years whose holder is under this age show red in the band. */
  minAge: number;
  onChange: (year: number) => void;
}

/**
 * A drum of years, older on top as the system's date wheel. The native ScrollView gives the momentum
 * and the snap over an empty column; nine recycled rows draw the years on the UI thread. A row takes
 * its next year only when it wraps round at the drum's hidden edge, so its React update is never seen.
 * (One animated row per year, ~100 of them, held the A51's main thread at 100 % and froze it, 0z250.)
 * The answer is saved where the drum stops, so the screen never renders mid-fling.
 */
export const NightYearWheel = memo(function NightYearWheel({ initial, min, max, minAge, onChange }: YearWheelProps) {
  const count = max - min + 1;
  const ref = useAnimatedRef<Animated.ScrollView>();
  const pad = ROW * Math.floor(VISIBLE / 2);
  // No `contentOffset` prop (a render on Android re-applies it and yanks the drum back): it scrolls there once, on layout.
  const [start] = useState(() => ({ x: 0, y: Math.max(0, Math.min(count - 1, initial - min)) * ROW }));
  const [ready, setReady] = useState(false);
  const scrollY = useSharedValue(start.y);
  const shake = useSharedValue(0);

  // Web lays out without onLayout ordering guarantees: scroll there once more after mount.
  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ y: start.y, animated: false }), 0);
    return () => clearTimeout(id);
  }, [ref, start]);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  // A tick per year as it reaches the band (HIG Playing haptics).
  const tick = () => haptic.selection();
  useAnimatedReaction(
    () => Math.round(scrollY.get() / ROW),
    (i, prev) => {
      if (prev !== null && i !== prev) scheduleOnRN(tick);
    },
  );

  const settle = (y: number) => {
    const row = Math.max(0, Math.min(count - 1, Math.round(y / ROW)));
    // Android's snap can stop a fast fling between two rows (A51): finish the last bit to the row.
    if (Math.abs(y - row * ROW) > 0.5) ref.current?.scrollTo({ y: row * ROW, animated: true });
    const year = min + row;
    onChange(year);
    if (max - year < minAge) shake.set(withSequence(withTiming(-7, { duration: 70 }), withTiming(6, { duration: 80 }), withTiming(-3, { duration: 80 }), withTiming(0, { duration: 90 })));
  };

  const drum = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const place = () => {
    if (ready) return;
    ref.current?.scrollTo({ y: start.y, animated: false });
    setReady(true);
  };
  const slots = useMemo(() => Array.from({ length: SLOTS }, (_, k) => k), []);

  return (
    <Animated.View style={[styles.wheel, !ready && styles.hidden, drum]}>
      <View pointerEvents="none" style={[styles.band, { top: pad }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: pad }]}>
        {slots.map((k) => (
          <WheelSlot key={k} slot={k} scrollY={scrollY} min={min} count={count} blockedFrom={max - minAge + 1} />
        ))}
      </View>
      <Animated.ScrollView
        ref={ref}
        style={StyleSheet.absoluteFill}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        snapToInterval={ROW}
        decelerationRate="fast"
        onScroll={onScroll}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          // A slow drag that stops without momentum still lands (iOS sends no momentum end then).
          if (Platform.OS === 'ios' && Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) settle(e.nativeEvent.contentOffset.y);
        }}
        scrollEventThrottle={16}
        onLayout={place}>
        <View style={{ height: (count - 1) * ROW + pad * 2 + ROW }} />
      </Animated.ScrollView>
    </Animated.View>
  );
});

/** The year index slot `k` stands for: the one ≡ k (mod SLOTS) nearest the band. */
function slotIndex(k: number, centre: number) {
  'worklet';
  return k + SLOTS * Math.round((centre - k) / SLOTS);
}

/** One recycled row: placed and bent on the UI thread, its text changed only while hidden at the edge. */
const WheelSlot = memo(function WheelSlot({ slot, scrollY, min, count, blockedFrom }: { slot: number; scrollY: SharedValue<number>; min: number; count: number; blockedFrom: number }) {
  const [index, setIndex] = useState(() => slotIndex(slot, scrollY.get() / ROW));
  useAnimatedReaction(
    () => slotIndex(slot, scrollY.get() / ROW),
    (i, prev) => {
      if (i !== prev) scheduleOnRN(setIndex, i);
    },
  );
  const year = min + index;
  const blocked = year >= blockedFrom;
  const style = useAnimatedStyle(() => {
    const c = scrollY.get() / ROW;
    const i = slotIndex(slot, c);
    const d = i - c;
    const ad = Math.abs(d);
    if (ad > 3.5 || i < 0 || i > count - 1) return { opacity: 0, transform: [{ translateY: d * ROW }] };
    // Bend the straight column into a drum: rows bunch up toward the edges and tip away.
    const bent = Math.sin(Math.max(-1.45, Math.min(1.45, d * 0.38))) * ROW * 2.75;
    const scale = ad < 1 ? 1 - 0.42 * ad : 0.58 - 0.07 * (ad - 1);
    return {
      opacity: Math.max(0, 1 - ad * 0.26),
      transform: [{ perspective: 600 }, { translateY: bent }, { rotateX: `${-d * 17}deg` }, { scale }],
    };
  });
  // The red only for a year under the age line, settled in the band.
  const inBand = useAnimatedStyle(() => ({ opacity: blocked && Math.abs(slotIndex(slot, scrollY.get() / ROW) - scrollY.get() / ROW) < 0.5 ? 1 : 0 }));
  if (index < 0 || index > count - 1) return null;
  return (
    <Animated.View style={[styles.slot, style]}>
      <Animated.Text style={styles.year}>{year}</Animated.Text>
      {blocked ? <Animated.Text style={[styles.year, styles.red, inBand]}>{year}</Animated.Text> : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  wheel: { height: ROW * VISIBLE, alignSelf: 'stretch', overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, height: ROW, borderRadius: inkRadius.field, borderCurve: 'continuous', backgroundColor: ink.raised },
  slot: { position: 'absolute', left: 0, right: 0, top: 0, height: ROW, justifyContent: 'center' },
  year: { ...inkType.numeralSmall, fontSize: 56, lineHeight: ROW, height: ROW, textAlign: 'center', includeFontPadding: false },
  red: { position: 'absolute', left: 0, right: 0, top: 0, color: BLOCKED },
});
