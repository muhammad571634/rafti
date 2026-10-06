import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

import { Txt } from './text';

/** Unread count: the one apricot mark on a list row. Renders nothing at zero. */
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <View style={styles.badge}>
      <Txt variant="tiny" color={colors.textOnPrimary}>
        {count > 99 ? '99+' : count}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
