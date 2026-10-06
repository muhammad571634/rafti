import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * An outline glyph on a soft squircle: the app's single icon style for rows,
 * menus and the Home grid. Ink on warm grey; colour is kept for meaning.
 */
export function IconTile({
  icon,
  size = 38,
  color = colors.text,
  dot,
  style,
}: {
  icon: IoniconName;
  size?: number;
  color?: string;
  /** Small apricot dot in the corner: something is waiting here. */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: Math.round(size * 0.32) }, style]}>
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={color} />
      {dot ? <View style={styles.dot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.bgPlain,
  },
});
