import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';

import { colors, type as typeScale, type TypeVariant } from '@/theme';

export interface TxtProps extends RNTextProps {
  variant?: TypeVariant;
  color?: string;
  center?: boolean;
  /** Shorthand for `numberOfLines` + ellipsis */
  lines?: number;
  dim?: boolean;
}

/** Single text primitive so every screen pulls from the same type scale. */
export function Txt({
  variant = 'body',
  color,
  center,
  lines,
  dim,
  style,
  ...rest
}: TxtProps) {
  return (
    <RNText
      numberOfLines={lines}
      ellipsizeMode={lines ? 'tail' : undefined}
      style={[
        typeScale[variant],
        { color: color ?? (dim ? colors.textSecondary : colors.text) },
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
