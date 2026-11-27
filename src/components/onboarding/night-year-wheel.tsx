import { memo, type Ref, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
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
  /** Reads the year in the band right now, wherever the drum is (the age gate checks this, not state). */
  handle?: Ref<YearWheelHandle>;
}

export interface YearWheelHandle {
  /** The year in the band at this moment, even mid-fling or before the drum reported where it stopped. */
  year: () => number;
}

/** No scroll event for this long after the last year passed the band: the drum has stopped. */
const STILL_MS = 220;

/**
 * A drum of years, older on top as the system's date wheel. The native ScrollView gives the momentum
 * and the snap over an empty column; nine recycled rows draw the years on the UI thread. A row takes
 * its next year only when it wraps round at the drum's hidden edge, so its React update is never seen.
 * (One animated row per year, ~100 of them, held the A51's main thread at 100 % and froze it, 0z250.)
 * The answer is saved where the drum stops, so the screen never renders mid-fling.
 */
export const NightYearWheel = memo(function NightYearWheel({ initial, min, max, minAge, onChange, handle }: YearWheelProps) {
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

  const rowAt = (y: number) => Math.max(0, Math.min(count - 1, Math.round(y / ROW)));
  useImperativeHandle(handle, () => ({ year: () => min + rowAt(scrollY.get()) }));

  // Android's snap often sends no momentum end after a fling (A51, 2026-11-16: the drum stood on 2010
  // while the screen still held 2005, and Continue let a minor through). So the drum also counts as
  // stopped once no year has passed the band for STILL_MS and no finger is on it.
  const dragging = useRef(false);
  const still = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settled = useRef<number | null>(null);
  const waitForStill = () => {
    if (still.current) clearTimeout(still.current);
    still.current = setTimeout(() => {
      if (!dragging.current) settle(scrollY.get());
    }, STILL_MS);
  };
  useEffect(() => () => (still.current ? clearTimeout(still.current) : undefined), []);

  // A tick per year as it reaches the band (HIG Playing haptics); one call per year, never per frame.
  const passed = () => {
    haptic.selection();
    waitForStill();
  };
  useAnimatedReaction(
    () => Math.round(scrollY.get() / ROW),
    (i, prev) => {
      if (prev !== null && i !== prev) scheduleOnRN(passed);
    },
  );

  const settle = (y: number) => {
    const row = rowAt(y);
    // Android's snap can stop a fast fling between two rows (A51): finish the last bit to the row.
    if (Math.abs(y - row * ROW) > 0.5) ref.current?.scrollTo({ y: row * ROW, animated: true });
    const year = min + row;
    // Reported once per stop: the momentum end and the stillness timer may both say so.
    if (settled.current === year) return;
    settled.current = year;
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
        onScrollBeginDrag={() => {
          dragging.current = true;
          settled.current = null;
        }}
        onScrollEndDrag={(e) => {
          dragging.current = false;
          // A slow drag that stops without momentum still lands (iOS sends no momentum end then).
          if (Platform.OS === 'ios' && Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) settle(e.nativeEvent.contentOffset.y);
          else waitForStill();
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

/**
 * One recycled row, all on the UI thread (0z290): it holds every year it can stand for (its index, +9,
 * +18…) in a short column mounted once, and shows the right one by moving that column inside its own
 * clip. No React update while the drum turns: the old row re-rendered its text through the JS thread at
 * each wrap, which the A51 could not keep up with on a fast fling (late or jumping numbers).
 */
const WheelSlot = memo(function WheelSlot({ slot, scrollY, min, count, blockedFrom }: { slot: number; scrollY: SharedValue<number>; min: number; count: number; blockedFrom: number }) {
  const indices = useMemo(() => {
    const list: number[] = [];
    for (let i = slot; i < count; i += SLOTS) list.push(i);
    return list;
  }, [slot, count]);
  const anyBlocked = indices.some((i) => min + i >= blockedFrom);
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
  // Which of its years the row shows: the column moves by whole rows, never mid-way.
  const column = useAnimatedStyle(() => ({ transform: [{ translateY: -Math.round((slotIndex(slot, scrollY.get() / ROW) - slot) / SLOTS) * ROW }] }));
  // The red only for a year under the age line, settled in the band.
  const inBand = useAnimatedStyle(() => {
    const c = scrollY.get() / ROW;
    const i = slotIndex(slot, c);
    return { opacity: min + i >= blockedFrom && Math.abs(i - c) < 0.5 ? 1 : 0 };
  });
  return (
    <Animated.View style={[styles.slot, style]}>
      <Animated.View style={column}>
        {indices.map((i) => (
          <Text key={i} style={styles.year}>
            {min + i}
          </Text>
        ))}
      </Animated.View>
      {anyBlocked ? (
        <Animated.View style={[StyleSheet.absoluteFill, inBand]}>
          <Animated.View style={column}>
            {indices.map((i) => (
              <Text key={i} style={[styles.year, min + i >= blockedFrom ? styles.red : styles.clear]}>
                {min + i}
              </Text>
            ))}
          </Animated.View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  wheel: { height: ROW * VISIBLE, alignSelf: 'stretch', overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, height: ROW, borderRadius: inkRadius.field, borderCurve: 'continuous', backgroundColor: ink.raised },
  slot: { position: 'absolute', left: 0, right: 0, top: 0, height: ROW, overflow: 'hidden' },
  year: { ...inkType.numeralSmall, fontSize: 56, lineHeight: ROW, height: ROW, textAlign: 'center', includeFontPadding: false },
  red: { color: BLOCKED },
  clear: { color: 'transparent' },
});
