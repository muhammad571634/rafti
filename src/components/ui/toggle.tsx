import { Platform, Switch } from 'react-native';

import { colors } from '@/theme';

/**
 * An ink switch with a white thumb: settings stay neutral, apricot is kept for the
 * main action. react-native-web colours the "on" thumb from its own
 * `activeThumbColor` prop, which the native typings don't know about.
 */
export function Toggle({
  value,
  onChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const webProps = Platform.OS === 'web' ? ({ activeThumbColor: colors.surface } as object) : {};

  return (
    <Switch
      value={value}
      disabled={disabled}
      onValueChange={onChange}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ true: colors.text, false: colors.borderStrong }}
      thumbColor={colors.surface}
      ios_backgroundColor={colors.borderStrong}
      {...webProps}
    />
  );
}
