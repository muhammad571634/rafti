import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { radius, shadows, space, themed, useThemed } from '@/theme';

import { PressableScale } from './pressable-scale';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** `flat` drops the shadow, `outlined` swaps it for a hairline border. */
  variant?: 'raised' | 'flat' | 'outlined';
}

export function Card({ children, onPress, style, padded = true, variant = 'raised' }: CardProps) {
  const styles = useThemed(sheet);
  const cardStyle: StyleProp<ViewStyle> = [
    styles.base,
    variant === 'raised' && shadows.card,
    variant === 'outlined' && styles.outlined,
    padded && styles.padded,
    style,
  ];

  if (onPress) {
    return (
      <PressableScale style={cardStyle} onPress={onPress} scaleTo={0.985}>
        {children}
      </PressableScale>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const sheet = themed(({ colors }) =>
  StyleSheet.create({
    base: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
    },
    padded: {
      padding: space.lg,
    },
    outlined: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
  }),
);
