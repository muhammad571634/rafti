import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { CLAY_ICONS, type ClayIconName } from '@/assets/brand/registry';
import { colors, radius as radii } from '@/theme';

export type { ClayIconName };

/**
 * A soft 3D clay icon on a warm grey squircle: the app's style for feature entry
 * points (the chat "+" sheet first; Home and the rest follow, see docs/icons-3d.md).
 */
export function ClayIcon({
  name,
  size = 64,
  tile = true,
  radius,
  dot,
  style,
}: {
  name: ClayIconName;
  /** Tile size; the art fills about 70% of it */
  size?: number;
  /** false draws the art alone, without the squircle */
  tile?: boolean;
  /** Corner radius; follows the size when left out. */
  radius?: number;
  /** Small apricot dot in the corner: something is waiting here. */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const art = Math.round(size * (tile ? 0.72 : 1));
  const inset = Math.round(size * 0.08);
  return (
    <View
      style={[
        styles.center,
        { width: size, height: size },
        tile && { borderRadius: radius ?? Math.round(size * 0.3), backgroundColor: colors.surfaceAlt },
        style,
      ]}>
      <Image source={CLAY_ICONS[name]} style={{ width: art, height: art }} contentFit="contain" />
      {dot ? <View style={[styles.dot, { top: inset, right: inset }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  // Ringed in the tile colour so it reads as a cut-out, like IconTile's dot.
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surfaceAlt,
  },
});
