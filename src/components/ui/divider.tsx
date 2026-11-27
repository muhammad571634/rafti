import { StyleSheet, View } from 'react-native';

import { themed, useThemed } from '@/theme';

/** A 1pt warm-grey line. `inset` lines it up with the text of the rows it splits. */
export function Divider({ inset = 0 }: { inset?: number }) {
  const styles = useThemed(sheet);
  return <View style={[styles.line, { marginLeft: inset }]} />;
}

const sheet = themed(({ colors }) =>
  StyleSheet.create({
    line: { height: 1, backgroundColor: colors.border },
  }),
);
