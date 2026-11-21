import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui';
import { colors, radius, space, weight } from '@/theme';

/**
 * Mint heart and level: how close you are, at a glance (Today chat rows, the Chats tab).
 * Visual only; the row's accessibility label spells the level out ("bond level N").
 */
export function BondChip({ level }: { level: number }) {
  return (
    <View style={styles.bond}>
      <HeartIcon size={10} color={colors.bond} weight="fill" />
      <Txt variant="tiny" color={colors.bondText} style={styles.bondText}>
        {level}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  bond: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    paddingLeft: space.xs + 1,
    paddingRight: space.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.bondSoft,
  },
  bondText: { fontWeight: weight.bold },
});
