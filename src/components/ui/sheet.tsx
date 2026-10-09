import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
  /**
   * For sheets with a text field: the sheet sits on top of the keyboard, is never
   * taller than the space above it, and its content scrolls instead of being pushed
   * off the top of the screen.
   */
  avoidKeyboard?: boolean;
}

/**
 * Bottom sheet (or centred card) over a light scrim. It appears and leaves at
 * once: no slide, spring or fade, so it never "jumps" at you.
 */
export function Sheet({ visible, onClose, title, children, center, dismissable = true, avoidKeyboard }: SheetProps) {
  const insets = useSafeAreaInsets();

  const content = (
    <>
      {title ? (
        <Txt variant="h3" center={center} style={styles.title}>
          {title}
        </Txt>
      ) : null}
      {children}
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.fill}>
        <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={dismissable ? onClose : undefined} />

        {/* Android resizes the window for the keyboard on its own; iOS needs the padding. */}
        <KeyboardAvoidingView
          enabled={!!avoidKeyboard && Platform.OS === 'ios'}
          behavior="padding"
          style={[styles.fill, center ? styles.centerWrap : [styles.bottomWrap, { paddingTop: insets.top + space.md }]]}
          pointerEvents="box-none">
          <View
            style={[
              center ? styles.centerCard : styles.bottomCard,
              !center && { paddingBottom: insets.bottom + space.xl },
              avoidKeyboard && styles.capped,
              shadows.modal,
            ]}>
            {!center ? <View style={styles.grabber} /> : null}
            {avoidKeyboard ? (
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}>
                {content}
              </ScrollView>
            ) : (
              content
            )}
          </View>
        </KeyboardAvoidingView>
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
  /** Never taller than the room left above the keyboard. */
  capped: { maxHeight: '100%' },
  scroll: { flexGrow: 1 },
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
