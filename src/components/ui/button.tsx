import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, gradients, radius, space } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Txt } from './text';

/**
 * `primary` is the one soft peach action on a screen (a light top-to-bottom peach with
 * ink-brown text, owner's pick 2026-10-15); `secondary` is the quiet white button beside it.
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

// lg is iOS's large control (50 pt); sm reaches the 44 pt target through hitSlop.
const heights: Record<ButtonSize, number> = { sm: 34, md: 44, lg: 50 };

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
      hitSlop={size === 'sm' ? 5 : undefined}
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
      {variant === 'primary' ? <LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} /> : null}
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <>
            {left}
            <Txt
              variant={size === 'sm' ? 'smallStrong' : 'bodyStrong'}
              color={fg}
              lines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}>
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
      return colors.primaryFill;
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
      return colors.textOnPrimary;
    case 'accent':
      return colors.white;
    case 'secondary':
      return colors.text;
    case 'soft':
      return colors.brandText;
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
