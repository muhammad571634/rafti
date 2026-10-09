import { Image } from 'expo-image';
import { StyleProp, ImageStyle } from 'react-native';

import { ICONS, type IconName } from '@/assets/icons/registry';

export type { IconName };

/** A bundled 3D illustration (Fluent Emoji) — moments, the shell currency, gift and wheel art. */
export function Icon3D({
  name,
  size = 32,
  tintColor,
  style,
}: {
  name: IconName;
  size?: number;
  /** Paints the art as a flat silhouette, e.g. white on a solid button. */
  tintColor?: string;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      tintColor={tintColor}
    />
  );
}

/** The shell currency mark. */
export function ShellIcon({
  size = 16,
  tintColor,
  style,
}: {
  size?: number;
  tintColor?: string;
  style?: StyleProp<ImageStyle>;
}) {
  return <Icon3D name="shell" size={size} tintColor={tintColor} style={style} />;
}
