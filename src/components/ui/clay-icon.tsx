import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { CLAY_ICONS, type ClayIconName } from '@/assets/brand/registry';
import { colors } from '@/theme';

export type { ClayIconName };

/**
 * A soft 3D clay icon on a warm grey squircle: the app's style for feature entry
 * points (the chat "+" sheet first; Home and the rest follow, see docs/icons-3d.md).
 */
export function ClayIcon({
  name,
  size = 64,
  tile = true,
  style,
}: {
  name: ClayIconName;
  /** Tile size; the art fills about 70% of it */
  size?: number;
  /** false draws the art alone, without the squircle */
  tile?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const art = Math.round(size * (tile ? 0.72 : 1));
  return (
    <View
      style={[
        styles.center,
        { width: size, height: size },
        tile && { borderRadius: Math.round(size * 0.3), backgroundColor: colors.surfaceAlt },
        style,
      ]}>
      <Image source={CLAY_ICONS[name]} style={{ width: art, height: art }} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
