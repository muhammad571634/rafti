import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface IconButtonProps {
  icon: IoniconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  background?: string;
  /** Small count bubble in the top-right corner. */
  badge?: number;
  /** Red dot with no number. */
  dot?: boolean;
  /** What a screen reader says — the icon alone says nothing. */
  accessibilityLabel?: string;
  /** A light tap on press, for actions that matter (e.g. send). */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  size = 22,
  color = colors.text,
  background,
  badge,
  dot,
  accessibilityLabel,
  haptic,
  style,
}: IconButtonProps) {
  const box = size + space.lg;

  return (
    <PressableScale
      onPress={onPress}
      hitSlop={8}
      scaleTo={0.88}
      haptic={haptic}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        { width: box, height: box, borderRadius: box / 2 },
        background ? { backgroundColor: background } : null,
        style,
      ]}>
      <Ionicons name={icon} size={size} color={color} />
      {badge != null && badge > 0 ? (
        <View style={styles.badge}>
          <Txt variant="tiny" color={colors.white}>
            {badge > 99 ? '99+' : badge}
          </Txt>
        </View>
      ) : dot ? (
        <View style={styles.dot} />
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
  },
});
