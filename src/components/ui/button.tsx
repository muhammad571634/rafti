import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Txt } from './text';

/**
 * `primary` is the one solid apricot action on a screen; `secondary` is the quiet
 * white button beside it. No gradients or glow: colour alone marks the main action.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'soft' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const heights: Record<ButtonSize, number> = { sm: 34, md: 44, lg: 48 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  full,
  left,
  right,
  style,
}: ButtonProps) {
  const fg = foreground(variant);

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          height: heights[size],
          borderRadius: size === 'sm' ? radius.sm : radius.md,
          paddingHorizontal: size === 'sm' ? space.md : space.xl,
          backgroundColor: background(variant),
        },
        bordered(variant) && styles.border,
        full && styles.full,
        style,
      ]}>
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <>
            {left}
            <Txt variant={size === 'sm' ? 'smallStrong' : 'bodyStrong'} color={fg}>
              {label}
            </Txt>
            {right}
          </>
        )}
      </View>
    </PressableScale>
  );
}

function background(variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return colors.primary;
    case 'secondary':
      return colors.surface;
    case 'accent':
      return colors.accent;
    case 'soft':
      return colors.primarySoft;
    case 'danger':
      return colors.dangerSoft;
    default:
      return 'transparent';
  }
}

function foreground(variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
    case 'accent':
      return colors.textOnPrimary;
    case 'secondary':
      return colors.text;
    case 'soft':
      return colors.primary;
    case 'danger':
      return colors.danger;
    default:
      return colors.textSecondary;
  }
}

const bordered = (variant: ButtonVariant) => variant === 'secondary' || variant === 'ghost';

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  border: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  full: { alignSelf: 'stretch' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
});
