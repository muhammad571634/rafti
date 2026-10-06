import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

/** A 1pt warm-grey line. `inset` lines it up with the text of the rows it splits. */
export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={[styles.line, { marginLeft: inset }]} />;
}

const styles = StyleSheet.create({
  line: { height: 1, backgroundColor: colors.border },
});
