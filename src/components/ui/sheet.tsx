import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { radius, shadows, space, themed, useThemed, useTokens } from '@/theme';
import { inkFace, inkPeachGlass } from '@/theme/ink';

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
/** A drag down this far, or a flick, closes the sheet; anything less springs it back. */
const CLOSE_AT = 110;
const FLICK = 900;
/** How long a sheet that just appeared ignores touches (the opening tap's tail). */
const ARM_MS = 250;
const BACK = { damping: 26, stiffness: 320, reduceMotion: ReduceMotion.System };

/**
 * Bottom sheet (or centred card) over a light scrim, iOS style (approved prototype, 2026-10-16):
 * a floating card with a grabber and, when it has a title, a header row of × / title / ✓.
 * It appears and leaves at once: no slide, spring or fade, so it never "jumps" at you. A bottom sheet
 * that can be dismissed also follows a drag down from its top (the grabber and the header row): far
 * enough or flicked, it carries on down and closes; otherwise it springs back. Only the top takes the
 * drag, so lists, wheels and fields inside keep their own touches.
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
  const styles = useThemed(sheet);
  const { colors } = useTokens();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // Every bottom sheet is capped to the screen and scrolls once its content is taller (owner,
  // 2026-11-08: a sheet is never taller than the screen). `scroll` / `avoidKeyboard` scroll always; the
  // rest scroll only when they overflow, so a wheel or a drag inside a short sheet keeps its touches.
  const scrolls = !center;
  const [overflow, setOverflow] = useState({ box: 0, content: 0 });
  const scrollable = !!(avoidKeyboard || scroll) || overflow.content > overflow.box + 1;
  // iOS tucks the card into the home-indicator room; Android's nav bar is solid, so the card stands
  // above it. The keyboard covers either, and the card then sits just over the keys.
  const keyboardUp = useKeyboardVisible();
  const sheetBottom = keyboardUp
    ? EDGE
    : Platform.OS === 'android' && insets.bottom > 0
      ? insets.bottom + EDGE
      : Math.max(EDGE, insets.bottom - 26);
  const { t } = useTranslation();
  const { height } = useWindowDimensions();

  // The drag down: the card follows the finger, the scrim fades with it.
  const drop = useSharedValue(0);
  useEffect(() => {
    if (visible) drop.value = 0;
  }, [visible, drop]);

  // A sheet appears at once, so the tap that opened it can land on whatever appears under the finger
  // (A51, 0z271: Choose on Find opened the role sheet and picked "Big brother" in one tap). Touches
  // wait a beat after it opens.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!visible) return setArmed(false);
    const id = setTimeout(() => setArmed(true), ARM_MS);
    return () => clearTimeout(id);
  }, [visible]);
  const latestClose = useRef(onClose);
  latestClose.current = onClose;
  const draggable = !center && dismissable;
  const drag = useMemo(() => {
    const close = () => latestClose.current();
    return Gesture.Pan()
      .enabled(draggable)
      .activeOffsetY(8)
      .failOffsetX([-20, 20])
      .onUpdate((e) => {
        // Down follows the finger; up gives a little, as iOS does.
        drop.value = e.translationY > 0 ? e.translationY : e.translationY * 0.15;
      })
      .onEnd((e) => {
        if (drop.value > CLOSE_AT || e.velocityY > FLICK) {
          drop.value = withTiming(height, { duration: 160, reduceMotion: ReduceMotion.System });
          scheduleOnRN(close);
          return;
        }
        drop.value = withSpring(0, BACK);
      });
  }, [draggable, drop, height]);
  const following = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value }] }));
  const fading = useAnimatedStyle(() => ({ opacity: interpolate(drop.value, [0, 400], [1, 0.2], Extrapolation.CLAMP) }));

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
        {/* A long title (Russian, German) wraps to a second line instead of shrinking (HIG Typography). */}
        <Txt style={styles.title} lines={2} accessibilityRole="header">
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
            <Ionicons name="checkmark" size={19} color={inkPeachGlass.ctaText} />
          </PressableScale>
        ) : (
          <View style={styles.side} />
        )}
      </View>
    )
  ) : null;

  // The part that takes the drag: the grabber, and the header row when there is one.
  const top = (
    <GestureDetector gesture={drag}>
      <View collapsable={false} style={styles.top}>
        {!center ? <View style={styles.grabber} /> : null}
        {header}
      </View>
    </GestureDetector>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* A Modal is its own window on Android: gestures inside it need their own root. */}
      <GestureHandlerRootView style={styles.fill} pointerEvents={armed ? 'auto' : 'none'}>
        <Animated.View style={[StyleSheet.absoluteFill, fading]}>
          <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={dismissable ? onClose : undefined} />
        </Animated.View>

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
          <Animated.View
            style={[
              center ? styles.centerCard : [styles.bottomCard, { marginBottom: sheetBottom }],
              scrolls && styles.capped,
              // A percentage cap ignored the status bar's padding on the A51 (the widget gallery ran
              // under the clock, 2026-11-16): with the keyboard down it is the room in points.
              scrolls && !keyboardUp && !center && { maxHeight: windowHeight - insets.top - space.md - sheetBottom },
              shadows.modal,
              following,
            ]}>
            {/* The top stays put over a list that scrolls, so the drag never fights the scroll. */}
            {top}
            {scrolls ? (
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                scrollEnabled={scrollable}
                onLayout={(e) => {
                  const box = e.nativeEvent.layout.height;
                  setOverflow((o) => (Math.abs(o.box - box) < 1 ? o : { ...o, box }));
                }}
                onContentSizeChange={(_, content) => setOverflow((o) => (Math.abs(o.content - content) < 1 ? o : { ...o, content }))}
                style={styles.scrollBox}
                contentContainerStyle={styles.scroll}>
                {children}
              </ScrollView>
            ) : (
              children
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const sheet = themed(({ colors }) =>
  StyleSheet.create({
    fill: { flex: 1 },
    scrim: { backgroundColor: colors.scrim },
    bottomWrap: { justifyContent: 'flex-end', paddingHorizontal: EDGE },
    centerWrap: { alignItems: 'center', justifyContent: 'center', padding: space.xxl },
    // Apple Dark Mode Elevated floating card: one perceptual step lighter than base cards (`colors.surface`) with a crisp top rim.
    bottomCard: {
      backgroundColor: colors.elevated,
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
      backgroundColor: colors.elevated,
      borderRadius: radius.xxl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.glassLine,
      padding: space.xl,
    },
    /** Never taller than the room left above the keyboard. */
    capped: { maxHeight: '100%' },
    scroll: { flexGrow: 1 },
    // Under a fixed top, the list takes what is left of the capped card.
    scrollBox: { flexShrink: 1 },
    // The grabber's row reaches the card's top edge, so a drag can start right at it.
    top: { marginTop: -space.sm, paddingTop: space.sm },
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 5,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(235,235,245,0.34)',
      marginBottom: space.xs + 2,
    },
    header: { flexDirection: 'row', alignItems: 'center', height: 44, marginBottom: space.md },
    side: { width: 36 },
    close: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.elevatedAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { ...inkFace('bodyStrong'), flex: 1, textAlign: 'center', color: colors.text },
    done: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: inkPeachGlass.ctaSolid,
      borderWidth: 1,
      borderColor: inkPeachGlass.ctaRim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneOff: { opacity: 0.4 },
    centerTitle: { marginBottom: space.md },
  }),
);
