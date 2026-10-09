import { Ionicons } from '@expo/vector-icons';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius as radii } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * An Ionicons name, or a Phosphor icon component imported one by one
 * (`phosphor-react-native/src/icons/Gift`) so Metro bundles only what is used.
 * Phosphor tiles draw the regular (outline) weight.
 */
export type TileIcon = IoniconName | PhosphorIcon;

/**
 * A glyph on a soft squircle: the app's single icon style for rows, menus and the
 * Home grid. Ink outline on warm grey by default; the Explore grid passes a module
 * tint and the duotone weight.
 */
export function IconTile({
  icon,
  size = 38,
  radius,
  color = colors.text,
  background = colors.surfaceAlt,
  weight = 'regular',
  glyphSize,
  dot,
  style,
}: {
  icon: TileIcon;
  size?: number;
  /** Corner radius; follows the size when left out. */
  radius?: number;
  color?: string;
  background?: string;
  /** Phosphor weight; Ionicons ignore it. */
  weight?: 'regular' | 'duotone' | 'fill';
  /** Glyph size; half the tile when left out. */
  glyphSize?: number;
  /** Small apricot dot in the corner: something is waiting here. */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const glyph = glyphSize ?? Math.round(size * 0.5);
  const Glyph = typeof icon === 'string' ? null : icon;
  const inset = Math.round(size * 0.08);

  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: radius ?? Math.round(size * 0.32), backgroundColor: background },
        style,
      ]}>
      {Glyph ? (
        <Glyph size={glyph} color={color} weight={weight} />
      ) : (
        <Ionicons name={icon as IoniconName} size={glyph} color={color} />
      )}
      {dot ? <View style={[styles.dot, { top: inset, right: inset, borderColor: background }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sits inside the tile's corner, ringed in the tile colour so it reads as a cut-out.
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    borderWidth: 2,
  },
});
