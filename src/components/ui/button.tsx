import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, gradients, radius, shadows, space } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Txt } from './text';

export type ButtonVariant = 'primary' | 'accent' | 'soft' | 'ghost' | 'danger';
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

const heights: Record<ButtonSize, number> = { sm: 34, md: 44, lg: 52 };

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
  const height = heights[size];
  const textVariant = size === 'sm' ? 'smallStrong' : 'bodyStrong';

  const body = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? colors.white : colors.primary} />
      ) : (
        <>
          {left}
          <Txt variant={textVariant} color={foreground(variant)}>
            {label}
          </Txt>
          {right}
        </>
      )}
    </View>
  );

  const shell: StyleProp<ViewStyle> = [
    styles.base,
    { height, borderRadius: radius.pill, paddingHorizontal: size === 'sm' ? space.lg : space.xxl },
    full && styles.full,
    style,
  ];

  if (variant === 'primary') {
    return (
      <PressableScale onPress={onPress} disabled={disabled || loading} style={[shell, shadows.fab]}>
        <LinearGradient
          colors={gradients.fab}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius.pill }]}
        />
        {body}
      </PressableScale>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[shell, { backgroundColor: background(variant) }, variant === 'ghost' && styles.ghost]}>
      {body}
    </PressableScale>
  );
}

function background(variant: ButtonVariant) {
  switch (variant) {
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
      return colors.white;
    case 'accent':
      return colors.white;
    case 'soft':
      return colors.primary;
    case 'danger':
      return colors.danger;
    default:
      return colors.textSecondary;
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  full: { alignSelf: 'stretch' },
  ghost: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
});
