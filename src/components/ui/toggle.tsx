import { Platform, Switch } from 'react-native';

import { colors } from '@/theme';

/**
 * An ink switch with a white thumb in light and dark, as iOS draws it: settings stay
 * neutral, apricot is kept for the main action. react-native-web colours the "on" thumb from its own
 * `activeThumbColor` prop, which the native typings don't know about.
 */
/** The UISwitch thumb is white in both modes. */
const THUMB = '#FFFFFF';

export function Toggle({
  value,
  onChange,
  disabled,
  accessibilityLabel,
  onColor = colors.text,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** The "on" track; ink by default. Alarms use the iOS green from their approved prototype. */
  onColor?: string;
}) {
  const webProps = Platform.OS === 'web' ? ({ activeThumbColor: THUMB } as object) : {};

  return (
    <Switch
      value={value}
      disabled={disabled}
      onValueChange={onChange}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ true: onColor, false: colors.borderStrong }}
      thumbColor={THUMB}
      ios_backgroundColor={colors.borderStrong}
      {...webProps}
    />
  );
}
