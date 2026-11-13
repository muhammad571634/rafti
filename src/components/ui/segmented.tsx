import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { radius, shadows, space, themed, useThemed, useTokens } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Txt } from './text';

export interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/** Two or three tabs in one soft track; the chosen one is a white pill. */
export function Segmented<T extends string>({ options, value, onChange, style }: SegmentedProps<T>) {
  const styles = useThemed(sheet);
  const { colors } = useTokens();
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
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
            style={[styles.segment, on && styles.on]}>
            <Txt
              variant="bodyStrong"
              color={on ? colors.text : colors.textSecondary}
              lines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}>
              {option.label}
            </Txt>
          </PressableScale>
        );
      })}
    </View>
  );
}

const sheet = themed(({ colors }) =>
  StyleSheet.create({
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
  }),
);

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
  const system = useThemed(systemSheet);
  const { colors } = useTokens();
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
            <Txt
              style={[system.text, on && system.textOn]}
              lines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}>
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const systemSheet = themed(({ colors, systemColors }) =>
  StyleSheet.create({
    track: { height: 34, padding: 2, borderRadius: 9, flexDirection: 'row', backgroundColor: systemColors.fill },
    segment: { flex: 1, borderRadius: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
    on: { backgroundColor: systemColors.thumb, ...shadows.card },
    // UISegmentedControl's 13 pt.
    text: { fontSize: 13, fontWeight: '500', letterSpacing: -0.1, color: colors.text },
    textOn: { fontWeight: '600' },
  }),
);
