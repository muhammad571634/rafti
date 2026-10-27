import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { aurora, colors, radius, shadows, space, systemColors } from '@/theme';

import { AuroraGlass } from './aurora';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

export interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  /** `aurora`: a glass track on the aurora ground. */
  tone?: 'filled' | 'aurora';
}

/** Two or three tabs in one soft track; the chosen one is a white pill. */
export function Segmented<T extends string>({ options, value, onChange, style, tone = 'filled' }: SegmentedProps<T>) {
  const glass = tone === 'aurora';
  const Track = glass ? AuroraGlass : View;
  return (
    <Track style={[styles.track, glass && styles.trackGlass, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <PressableScale
            key={option.value}
            onPress={() => onChange(option.value)}
            scaleTo={0.97}
            dimOnPress={false}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            style={[styles.segment, on && (glass ? styles.onGlass : styles.on)]}>
            <Txt variant="bodyStrong" color={on ? colors.text : colors.textSecondary}>
              {option.label}
            </Txt>
          </PressableScale>
        );
      })}
    </Track>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: space.xs,
    padding: space.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { backgroundColor: colors.surface, ...shadows.card },
  trackGlass: { backgroundColor: undefined },
  onGlass: { backgroundColor: aurora.thumb, ...shadows.card },
});

/**
 * iOS's own segmented control (UISegmentedControl): a grey track 34pt tall, the chosen segment a
 * raised white (dark: grey) thumb. Used on the iOS-look list and form screens; `locked` options
 * show a small lock and stay tappable.
 */
export function SystemSegmented<T extends string | number>({
  options,
  value,
  onChange,
  style,
}: {
  options: readonly { value: T; label: string; locked?: boolean }[];
  /** Nothing chosen yet leaves every segment plain (UISegmentedControl's noSegment). */
  value: T | undefined;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[system.track, style]} accessibilityRole="tablist">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            style={[system.segment, on && system.on]}>
            {option.locked ? <Ionicons name="lock-closed" size={11} color={colors.textSecondary} /> : null}
            <Txt style={[system.text, on && system.textOn]} lines={1}>
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const system = StyleSheet.create({
  track: { height: 34, padding: 2, borderRadius: 9, flexDirection: 'row', backgroundColor: systemColors.fill },
  segment: { flex: 1, borderRadius: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  on: { backgroundColor: systemColors.thumb, ...shadows.card },
  // UISegmentedControl's 13 pt.
  text: { fontSize: 13, fontWeight: '500', letterSpacing: -0.1, color: colors.text },
  textOn: { fontWeight: '600' },
});
