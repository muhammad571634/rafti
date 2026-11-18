import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptic } from '@/lib/haptics';
import { colors, type as typeScale } from '@/theme';

const ITEM = 36;
const VISIBLE = 5;
const PAD = ITEM * Math.floor(VISIBLE / 2);

/** The three greys of a wheel, plus its band; light by default, `sleepColors` on Bedtime. */
export interface WheelTone {
  text: string;
  near: string;
  far: string;
  band: string;
}

const LIGHT: WheelTone = { text: colors.text, near: colors.textMuted, far: colors.textFaint, band: 'rgba(118,118,128,0.12)' };

/** One column on its own (Bedtime's sleep timer): the same snap and band as the time wheel. */
export function ValueWheel({
  label,
  values,
  index,
  onChange,
  width = 160,
  tone = LIGHT,
}: {
  label: string;
  values: string[];
  index: number;
  onChange: (index: number) => void;
  width?: number;
  tone?: WheelTone;
}) {
  return (
    <View style={styles.wheel}>
      <View style={[styles.band, { backgroundColor: tone.band }]} pointerEvents="none" />
      <Column label={label} values={values} index={index} onChange={onChange} width={width} align="center" tone={tone} />
    </View>
  );
}

/**
 * The iPhone alarm wheel: hour, minute and (on a 12-hour phone) AM / PM columns that snap
 * to a grey band in the middle. `hour` is always 0-23; the columns convert.
 */
export function TimeWheel({
  hour,
  minute,
  h12,
  onChange,
  tone = LIGHT,
}: {
  hour: number;
  minute: number;
  h12: boolean;
  onChange: (hour: number, minute: number) => void;
  /** Colours for a dark ground (Alarms on Bedtime's navy). */
  tone?: WheelTone;
}) {
  const { t } = useTranslation();
  const hours = h12 ? Array.from({ length: 12 }, (_, i) => i + 1) : Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const pm = hour >= 12;
  const hourIndex = h12 ? (hour % 12 === 0 ? 11 : (hour % 12) - 1) : hour;

  const setHour = (index: number) => {
    if (!h12) return onChange(index, minute);
    const h = hours[index] % 12;
    onChange(h + (pm ? 12 : 0), minute);
  };
  const setPeriod = (index: number) => onChange((hour % 12) + (index === 1 ? 12 : 0), minute);

  return (
    <View style={styles.wheel}>
      <View style={[styles.band, { backgroundColor: tone.band }]} pointerEvents="none" />
      <Column
        label={t('alarms.hour')}
        values={hours.map((h) => (h12 ? String(h) : String(h).padStart(2, '0')))}
        index={hourIndex}
        onChange={setHour}
        width={64}
        align="flex-end"
        tone={tone}
      />
      <Column
        label={t('alarms.minute')}
        values={minutes.map((m) => String(m).padStart(2, '0'))}
        index={minute}
        onChange={(i) => onChange(hour, i)}
        width={64}
        align="flex-start"
        tone={tone}
      />
      {h12 ? (
        <Column
          label={t('alarms.period')}
          values={[t('alarms.am'), t('alarms.pm')]}
          index={pm ? 1 : 0}
          onChange={setPeriod}
          width={56}
          align="flex-start"
          tone={tone}
        />
      ) : null}
    </View>
  );
}

/**
 * One column (owner, 2026-11-18: "the minute wheel must be light and smooth"). The scroll runs on the UI
 * thread: rows fade and shrink with their distance from the band frame by frame, as a UIPickerView
 * does, and each new row under the band ticks. The screen hears the value only once the wheel has come
 * to rest, so nothing re-renders mid-flick; a value changed from outside (the − / + buttons) moves it.
 */
function Column({
  label,
  values,
  index,
  onChange,
  width,
  align,
  tone = LIGHT,
}: {
  label: string;
  values: string[];
  index: number;
  onChange: (index: number) => void;
  width: number;
  align: 'flex-start' | 'flex-end' | 'center';
  tone?: WheelTone;
}) {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const y = useSharedValue(index * ITEM);
  const row = useSharedValue(index);
  const last = values.length - 1;
  // What the wheel itself settled on last, so a change from outside is told apart from its own.
  const settled = useRef(index);
  const latest = useRef({ index, onChange });
  latest.current = { index, onChange };

  // Starts on the chosen value.
  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM, animated: false }), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The − / + buttons (or anything else) changed the value: roll the wheel there.
  useEffect(() => {
    if (index === settled.current) return;
    settled.current = index;
    ref.current?.scrollTo({ y: index * ITEM, animated: true });
  }, [index, ref]);

  const tick = useCallback(() => haptic.selection(), []);
  const commit = useCallback(
    (offset: number) => {
      const next = Math.max(0, Math.min(last, Math.round(offset / ITEM)));
      settled.current = next;
      if (next !== latest.current.index) latest.current.onChange(next);
    },
    [last],
  );

  const onScroll = useAnimatedScrollHandler(
    {
      onScroll: (e) => {
        y.value = e.contentOffset.y;
        const now = Math.max(0, Math.min(last, Math.round(e.contentOffset.y / ITEM)));
        if (now !== row.value) {
          row.value = now;
          scheduleOnRN(tick);
        }
      },
      // A drag let go without a flick stops here; a flick settles when its momentum ends.
      onEndDrag: (e) => {
        if (Math.abs(e.velocity?.y ?? 0) < 0.05) scheduleOnRN(commit, e.contentOffset.y);
      },
      onMomentumEnd: (e) => {
        scheduleOnRN(commit, e.contentOffset.y);
      },
    },
    [last, tick, commit],
  );

  const step = (to: number) => {
    const next = Math.max(0, Math.min(last, to));
    ref.current?.scrollTo({ y: next * ITEM, animated: true });
    settled.current = next;
    if (next !== index) onChange(next);
  };

  return (
    <Animated.ScrollView
      ref={ref}
      style={{ width, height: ITEM * VISIBLE }}
      contentContainerStyle={{ paddingVertical: PAD }}
      showsVerticalScrollIndicator={false}
      // The wheel sits inside the editor's own vertical scroll: on Android the page took every drag
      // and the wheel never turned (A51, 2026-11-18) until the inner scroll may claim it.
      nestedScrollEnabled
      snapToInterval={ITEM}
      decelerationRate="normal"
      scrollEventThrottle={16}
      onScroll={onScroll}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: values[index] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e: AccessibilityActionEvent) => step(index + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}>
      {values.map((value, i) => (
        <WheelRow key={value} value={value} at={i} y={y} align={align} tone={tone} onPress={() => step(i)} />
      ))}
    </Animated.ScrollView>
  );
}

/** A row that fades and shrinks with its distance from the band, on the UI thread. */
function WheelRow({
  value,
  at,
  y,
  align,
  tone,
  onPress,
}: {
  value: string;
  at: number;
  y: SharedValue<number>;
  align: 'flex-start' | 'flex-end' | 'center';
  tone: WheelTone;
  onPress: () => void;
}) {
  const look = useAnimatedStyle(() => {
    const distance = Math.abs(y.value / ITEM - at);
    return {
      opacity: interpolate(distance, [0, 1, 2, 3], [1, 0.55, 0.3, 0.15], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(distance, [0, 2], [1, 0.88], Extrapolation.CLAMP) }],
    };
  });
  return (
    <Pressable style={[styles.item, { alignItems: align }]} onPress={onPress} accessible={false}>
      <Animated.Text style={[typeScale.body, styles.value, { color: tone.text }, look]}>{value}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wheel: { flexDirection: 'row', justifyContent: 'center', gap: 14, height: ITEM * VISIBLE },
  band: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: PAD,
    height: ITEM,
    borderRadius: 9,
  },
  item: { height: ITEM, justifyContent: 'center', paddingHorizontal: 6 },
  value: { fontSize: 22, lineHeight: 28, fontVariant: ['tabular-nums'] },
});
