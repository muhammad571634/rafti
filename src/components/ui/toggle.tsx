import { Platform, Switch } from 'react-native';

import { colors } from '@/theme';

/**
 * Brand-coloured switch. react-native-web colours the "on" thumb from its own
 * `activeThumbColor` prop, which the native typings don't know about.
 */
export function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const webProps = Platform.OS === 'web' ? ({ activeThumbColor: colors.primary } as object) : {};

  return (
    <Switch
      value={value}
      disabled={disabled}
      onValueChange={onChange}
      trackColor={{ true: colors.primarySoft, false: colors.border }}
      thumbColor={value ? colors.primary : colors.surface}
      {...webProps}
    />
  );
}
