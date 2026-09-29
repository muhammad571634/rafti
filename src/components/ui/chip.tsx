import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

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

/** The category pills on Find — white when idle, tinted fill when selected. */
export function Chip({ label, active, onPress, style, tone = 'primary' }: ChipProps) {
  const activeBg =
    tone === 'accent' ? colors.accentSoft : tone === 'neutral' ? colors.surfaceAlt : colors.primarySoft;
  const activeFg = tone === 'accent' ? colors.accent : tone === 'neutral' ? colors.text : colors.primary;

  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      dimOnPress={false}
      scaleTo={0.94}
      style={[
        styles.base,
        active
          ? { backgroundColor: activeBg, borderColor: activeFg }
          : { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}>
      <Txt variant="smallStrong" color={active ? activeFg : colors.textSecondary}>
        {label}
      </Txt>
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
