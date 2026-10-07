import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui';
import { colors, radius, space } from '@/theme';

/** How full the profile is: a thin apricot bar and the percent beside it. */
export function CompletionMeter({ percent }: { percent: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${percent}%`}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <Txt variant="smallStrong" color={percent === 100 ? colors.text : colors.brandText}>
        {percent}%
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  track: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
});
