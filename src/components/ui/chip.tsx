import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Txt } from './text';

export interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** `accent` is the lavender variant used on Secret Note. */
  tone?: 'primary' | 'accent' | 'neutral';
}

/**
 * A pill: white when idle, ink when selected (the `accent` and `neutral` tones keep
 * their tints). Without `onPress` it is a plain label, not a disabled button.
 */
export function Chip({ label, active, onPress, style, tone = 'primary' }: ChipProps) {
  const activeBg = tone === 'accent' ? colors.accentSoft : tone === 'neutral' ? colors.surfaceAlt : colors.text;
  const activeFg =
    tone === 'accent' ? colors.accent : tone === 'neutral' ? colors.text : colors.textOnPrimary;
  const activeBorder = tone === 'primary' ? colors.text : activeFg;

  const pillStyle = [
    styles.base,
    active
      ? { backgroundColor: activeBg, borderColor: activeBorder }
      : { backgroundColor: colors.surface, borderColor: colors.border },
    style,
  ];
  const text = (
    <Txt variant="smallStrong" color={active ? activeFg : colors.textSecondary}>
      {label}
    </Txt>
  );

  if (!onPress) return <View style={pillStyle}>{text}</View>;

  return (
    <PressableScale
      onPress={onPress}
      dimOnPress={false}
      scaleTo={0.94}
      // 34pt pill, 44pt target.
      hitSlop={{ top: 5, bottom: 5 }}
      accessibilityState={{ selected: !!active }}
      style={pillStyle}>
      {text}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: space.lg,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
