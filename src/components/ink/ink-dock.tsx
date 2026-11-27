import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bottomRoom, space } from '@/theme';
import { ink, inkGutter } from '@/theme/ink';

/** Room a scroll leaves under its content for a dock with one 56 pt pill. */
export const INK_DOCK_SPACE = 104;

/**
 * The bottom of an Ink screen with one action (Dating's dock, 0z325): pinned over the ground, a
 * hairline on top, nearly opaque so rows scrolling under it never ghost through (no live blur on the A51).
 * Holds a `PillButton` (or a row of them). `inFlow`: the last child of a `KeyboardAvoidingView`, so
 * it rides up with the keyboard (an absolute dock stays behind the keys); the scroll above takes `flex: 1`.
 */
export function InkDock({ children, inFlow }: { children: React.ReactNode; inFlow?: boolean }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.dock, !inFlow && styles.pinned, { paddingBottom: bottomRoom(insets.bottom, space.md) }]}>{children}</View>;
}

const styles = StyleSheet.create({
  pinned: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  dock: {
    paddingTop: 12,
    paddingHorizontal: inkGutter,
    backgroundColor: ink.dock,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ink.edge,
  },
});
