import { Image } from 'expo-image';
import { StyleProp, ImageStyle } from 'react-native';

import { ICONS, type IconName } from '@/assets/icons/registry';

export type { IconName };

/** A bundled 3D illustration (Fluent Emoji) — moments, the shell currency, gift and wheel art. */
export function Icon3D({
  name,
  size = 32,
  style,
}: {
  name: IconName;
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return <Image source={ICONS[name]} style={[{ width: size, height: size }, style]} contentFit="contain" />;
}

/** The shell currency mark. */
export function ShellIcon({ size = 16, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return <Icon3D name="shell" size={size} style={style} />;
}
