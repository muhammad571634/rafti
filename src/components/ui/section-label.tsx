import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, space } from '@/theme';

import { Txt } from './text';

/** A quiet group label ("Today", "Explore"): it names a section without shouting. */
export function SectionLabel({
  title,
  right,
  style,
}: {
  title: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.base, style]}>
      <Txt variant="smallStrong" color={colors.textMuted} style={styles.title}>
        {title}
      </Txt>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.xs,
  },
  title: { flex: 1 },
});
