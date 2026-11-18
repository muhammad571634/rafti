import { Image } from 'expo-image';
import { ImageStyle, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ICONS, type IconName } from '@/assets/icons/registry';
import { ink } from '@/theme/ink';

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

/**
 * The shell currency mark: a line glyph in the SF Symbols manner (owner 2026-11-18, the approved
 * no-mascot Profile board; the 3D picture beside line icons broke the one icon style). A scallop
 * with three ribs, drawn in the calm peach; `tintColor` repaints it (the dark ink on a peach button,
 * white on a coloured tile). `backing` fills the shell's body, so overlapping marks read as a stack.
 */
export function ShellIcon({
  size = 16,
  tintColor,
  backing,
  style,
}: {
  size?: number;
  tintColor?: string;
  backing?: string;
  style?: StyleProp<ViewStyle>;
}) {
  // Small marks get a heavier line so they hold at 12-18 pt, as SF Symbols' weights do.
  const weight = size <= 18 ? 2.2 : size <= 30 ? 1.9 : 1.6;
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={tintColor ?? ink.accent} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
        <Path d={SHELL_BODY} fill={backing ?? 'none'} />
        <Path d={SHELL_RIBS} />
      </Svg>
    </View>
  );
}

const SHELL_BODY = 'M12 20C6 20 3 15 3 11a9 9 0 0 1 18 0c0 4-3 9-9 9z';
const SHELL_RIBS = 'M12 20V6M8 19.2 7 8M16 19.2 17 8';
