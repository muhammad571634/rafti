import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { aurora, colors, radius, shadows, space } from '@/theme';

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
