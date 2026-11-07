import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { colors, radius, shadows, space } from '@/theme';

import { PressableScale } from './pressable-scale';
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
  /** For long lists (the languages): never taller than the screen, the content scrolls. */
  scroll?: boolean;
  /** Adds the peach ✓ on the right of the header (iOS "Done"); the sheet saves there. */
  onDone?: () => void;
  doneDisabled?: boolean;
}

/** iOS 26/27 floating sheet: 8pt in from the screen edges, with the device's large corners. */
const EDGE = 8;
const CORNER = 38;

/**
 * Bottom sheet (or centred card) over a light scrim, iOS style (approved prototype, 2026-10-16):
 * a floating card with a grabber and, when it has a title, a header row of × / title / ✓.
 * It appears and leaves at once: no slide, spring or fade, so it never "jumps" at you.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  center,
  dismissable = true,
  avoidKeyboard,
  scroll,
  onDone,
  doneDisabled,
}: SheetProps) {
  const insets = useSafeAreaInsets();
  const scrolls = avoidKeyboard || scroll;
  // iOS tucks the card into the home-indicator room; Android's nav bar is solid, so the card stands
  // above it. The keyboard covers either, and the card then sits just over the keys.
  const keyboardUp = useKeyboardVisible();
  const sheetBottom = keyboardUp
    ? EDGE
    : Platform.OS === 'android' && insets.bottom > 0
      ? insets.bottom + EDGE
      : Math.max(EDGE, insets.bottom - 26);
  const { t } = useTranslation();

  const header = title ? (
    center ? (
      <Txt variant="h3" center style={styles.centerTitle}>
        {title}
      </Txt>
    ) : (
      <View style={styles.header}>
        {dismissable ? (
          <PressableScale
            scaleTo={0.88}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={styles.close}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </PressableScale>
        ) : (
          <View style={styles.side} />
        )}
        <Txt style={styles.title} lines={1} adjustsFontSizeToFit minimumFontScale={0.8} accessibilityRole="header">
          {title}
        </Txt>
        {onDone ? (
          <PressableScale
            scaleTo={0.88}
            onPress={onDone}
            disabled={doneDisabled}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.done')}
            accessibilityState={{ disabled: !!doneDisabled }}
            style={[styles.done, doneDisabled && styles.doneOff]}>
            <Ionicons name="checkmark" size={19} color={colors.textOnPrimary} />
          </PressableScale>
        ) : (
          <View style={styles.side} />
        )}
      </View>
    )
  ) : null;

  const content = (
    <>
      {header}
      {children}
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.fill}>
        <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={dismissable ? onClose : undefined} />

        {/* Edge-to-edge Android does not resize the window for the keyboard either, so both need the padding. */}
        <KeyboardAvoidingView
          enabled={!!avoidKeyboard}
          behavior="padding"
          style={[
            styles.fill,
            center
              ? styles.centerWrap
              : [styles.bottomWrap, { paddingTop: insets.top + space.md }],
          ]}
          pointerEvents="box-none">
          {/* The room under the card is its margin: KeyboardAvoidingView owns its own paddingBottom. */}
          <View
            style={[
              center ? styles.centerCard : [styles.bottomCard, { marginBottom: sheetBottom }],
              scrolls && styles.capped,
              shadows.modal,
            ]}>
            {!center ? <View style={styles.grabber} /> : null}
            {scrolls ? (
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
  bottomWrap: { justifyContent: 'flex-end', paddingHorizontal: EDGE },
  centerWrap: { alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  // A floating card, inset from every edge; a darker hairline edge as iOS 27 draws its glass.
  bottomCard: {
    backgroundColor: colors.surface,
    borderRadius: CORNER,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassLine,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xxl,
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
    width: 36,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginBottom: space.xs + 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', height: 44, marginBottom: space.md },
  side: { width: 36 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  done: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneOff: { opacity: 0.4 },
  centerTitle: { marginBottom: space.md },
});
