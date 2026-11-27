import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { KC } from '@/lib/keyboard-native';

/**
 * The chat room's keyboard parts (audit Step 3.4), out of `src/app/chat/[id].tsx` (0z359): with
 * keyboard-controller in the APK the composer rides the keyboard frame by frame and a drag down on the
 * chat takes the keyboard with the finger; older APKs keep the padding box.
 */

const COMPOSER_VEIL = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.88)', 'rgba(0,0,0,0.94)'] as const;
const COMPOSER_VEIL_STOPS = [0, 0.3, 1] as const;

/** The chat's keyboard room: keyboard-controller lifts the parts itself; older APKs keep the padding box. */
export const KeyboardBox = KC ? View : KeyboardAvoidingView;
export const ChatScroll = KC?.KeyboardChatScrollView;
export const keyboardBoxProps = KC ? {} : { behavior: 'padding' as const };
/** A drag starting this far above the keyboard (the composer's height) already takes it along. */
const GESTURE_OFFSET = 64;

/** Android: a drag down on the chat takes the keyboard with the finger, as iOS's interactive dismiss. */
export function ChatGestureArea({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  if (KC && Platform.OS === 'android') {
    return (
      <KC.KeyboardGestureArea interpolator="ios" offset={GESTURE_OFFSET} style={style}>
        {children}
      </KC.KeyboardGestureArea>
    );
  }
  return <View style={style}>{children}</View>;
}

/**
 * The composer rides the keyboard frame by frame, its foot always `space.sm` over the keyboard's top
 * (iOS Messages): it starts to rise only once the keyboard covers its resting room (`lift`), so a drag
 * down never opens a gap between them (a progress-based offset did, mid-drag on the A51).
 */
export function ComposerBox({ lift, children }: { lift: number; children: ReactNode }) {
  if (!KC) return <>{children}</>;
  return <StickyComposer lift={lift}>{children}</StickyComposer>;
}

function StickyComposer({ lift, children }: { lift: number; children: ReactNode }) {
  // KC is set whenever this renders (ComposerBox checks it), and it never changes while the app runs.
  const { height, progress } = KC!.useReanimatedKeyboardAnimation();
  const ride = useAnimatedStyle(() => ({ transform: [{ translateY: Math.min(0, height.value + lift) }] }), [lift]);
  // A drag down scrolls the chat with the finger, so lines pass behind the bar; iOS hides them under its
  // glass. Android cannot afford a live blur, so a dark veil rises with the keyboard (none at rest).
  const veil = useAnimatedStyle(() => ({ opacity: progress.value }));
  return (
    <Animated.View style={ride}>
      <Animated.View pointerEvents="none" style={[styles.composerVeil, veil]}>
        <LinearGradient colors={COMPOSER_VEIL} locations={COMPOSER_VEIL_STOPS} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Behind the composer while the keyboard is up or moving: from a little above the bar to its foot.
  composerVeil: { position: 'absolute', left: 0, right: 0, top: -28, bottom: 0 },
});
