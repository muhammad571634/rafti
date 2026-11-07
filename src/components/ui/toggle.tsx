import { Platform, Switch } from 'react-native';

import { haptic } from '@/lib/haptics';
import { colors, systemColors } from '@/theme';

/**
 * The app's one switch, as iOS draws UISwitch: a green track and a white thumb in light and dark,
 * on both platforms (Android's own switch would tint its thumb blue). react-native-web colours the "on" thumb from its own
 * `activeThumbColor` prop, which the native typings don't know about.
 */
/** The UISwitch thumb is white in both modes. */
const THUMB = colors.white;

export function Toggle({
  value,
  onChange,
  disabled,
  accessibilityLabel,
  onColor = systemColors.green,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** The "on" track; the iOS green by default. */
  onColor?: string;
}) {
  const webProps = Platform.OS === 'web' ? ({ activeThumbColor: THUMB } as object) : {};

  return (
    <Switch
      value={value}
      disabled={disabled}
      onValueChange={(v) => {
        haptic.toggle(v);
        onChange(v);
      }}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ true: onColor, false: colors.borderStrong }}
      thumbColor={THUMB}
      ios_backgroundColor={colors.borderStrong}
      {...webProps}
    />
  );
}
