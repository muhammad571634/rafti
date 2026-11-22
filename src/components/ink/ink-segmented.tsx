import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { haptic } from '@/lib/haptics';
import { ink, inkPeachGlass, inkRadius } from '@/theme/ink';

import { InkText } from './ink-text';

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
 * the chosen one a raised thumb with its word in bold. A tap on another segment ticks a selection
 * haptic; a tap on the chosen one does nothing. Labels stay on one line and shrink rather than wrap,
 * growing with text size to 1.3x (HIG: not every control is expected to grow, content first).
 */
export function InkSegmented<T extends string | number>({ options, value, onChange, accessibilityLabel, style }: InkSegmentedProps<T>) {
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      <LinearGradient
        colors={inkPeachGlass.trackFill}
        locations={inkPeachGlass.trackStops}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {options.map((option) => {
        const on = option.value === value;
        return (
          <PressableScale
            key={String(option.value)}
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
            style={[styles.segment, on && styles.on]}>
            {on ? <LinearGradient colors={inkPeachGlass.fill} style={StyleSheet.absoluteFill} pointerEvents="none" /> : null}
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
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: inkRadius.pill,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: inkPeachGlass.trackRim,
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
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  on: {
    borderColor: inkPeachGlass.rim,
  },
});
