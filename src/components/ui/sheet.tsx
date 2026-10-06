import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows, space } from '@/theme';

import { Txt } from './text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Centered card instead of a bottom sheet — used by the level-up moment. */
  center?: boolean;
  dismissable?: boolean;
}

/**
 * Bottom sheet (or centred card) over a light scrim. It appears and leaves at
 * once: no slide, spring or fade, so it never "jumps" at you.
 */
export function Sheet({ visible, onClose, title, children, center, dismissable = true }: SheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.fill}>
        <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={dismissable ? onClose : undefined} />

        <View style={[styles.fill, center ? styles.centerWrap : styles.bottomWrap]} pointerEvents="box-none">
          <View
            style={[
              center ? styles.centerCard : styles.bottomCard,
              !center && { paddingBottom: insets.bottom + space.xl },
              shadows.modal,
            ]}>
            {!center ? <View style={styles.grabber} /> : null}
            {title ? (
              <Txt variant="h3" center={center} style={styles.title}>
                {title}
              </Txt>
            ) : null}
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { backgroundColor: colors.scrim },
  bottomWrap: { justifyContent: 'flex-end' },
  centerWrap: { alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  bottomCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  centerCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: space.xl,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginBottom: space.md,
  },
  title: { marginBottom: space.md },
});
