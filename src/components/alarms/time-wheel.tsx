import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Txt } from '@/components/ui';
import { colors } from '@/theme';

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
}: {
  hour: number;
  minute: number;
  h12: boolean;
  onChange: (hour: number, minute: number) => void;
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
      <View style={[styles.band, { backgroundColor: LIGHT.band }]} pointerEvents="none" />
      <Column
        label={t('alarms.hour')}
        values={hours.map((h) => (h12 ? String(h) : String(h).padStart(2, '0')))}
        index={hourIndex}
        onChange={setHour}
        width={64}
        align="flex-end"
      />
      <Column
        label={t('alarms.minute')}
        values={minutes.map((m) => String(m).padStart(2, '0'))}
        index={minute}
        onChange={(i) => onChange(hour, i)}
        width={64}
        align="flex-start"
      />
      {h12 ? (
        <Column
          label={t('alarms.period')}
          values={[t('alarms.am'), t('alarms.pm')]}
          index={pm ? 1 : 0}
          onChange={setPeriod}
          width={56}
          align="flex-start"
        />
      ) : null}
    </View>
  );
}

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
  const ref = useRef<ScrollView>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Starts on the chosen value; later changes come from the user's own scrolling.
  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM, animated: false }), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const at = (y: number) => Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM)));

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = at(e.nativeEvent.contentOffset.y);
    if (next !== index) onChange(next);
  };

  // The web has no momentum events: snap a moment after the last scroll.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Platform.OS !== 'web') return;
    const y = e.nativeEvent.contentOffset.y;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const next = at(y);
      ref.current?.scrollTo({ y: next * ITEM, animated: true });
      if (next !== index) onChange(next);
    }, 120);
  };

  return (
    <ScrollView
      ref={ref}
      style={{ width, height: ITEM * VISIBLE }}
      contentContainerStyle={{ paddingVertical: PAD }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={onScroll}
      onMomentumScrollEnd={settle}
      onScrollEndDrag={settle}
      accessibilityLabel={`${label}: ${values[index]}`}>
      {values.map((value, i) => {
        const distance = Math.abs(i - index);
        return (
          <Pressable
            key={value}
            style={[styles.item, { alignItems: align }]}
            onPress={() => {
              ref.current?.scrollTo({ y: i * ITEM, animated: true });
              onChange(i);
            }}>
            <Txt
              style={[
                styles.value,
                { color: distance === 0 ? tone.text : distance === 1 ? tone.near : tone.far },
              ]}>
              {value}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
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
