import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { haptic } from '@/lib/haptics';
import { colors, systemColors } from '@/theme';

/** Past a tap, before the thumb would expect anything else. */
const HOLD_MS = 220;
/** How far left the finger goes to throw the recording away. */
const CANCEL_AT = 90;

export interface HoldMicProps {
  recording: boolean;
  /** A tap: the recorder sheet, as before. */
  onTap: () => void;
  onHoldStart: () => void;
  /** The finger let go (`send` true), slid away or the system took the touch (false). */
  onHoldEnd: (send: boolean) => void;
  accessibilityLabel: string;
  accessibilityHint: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The composer's mic, as in WhatsApp and Instagram: hold to record, let go to send, slide left to
 * cancel. The tap stays, so the hold is a shortcut and never the only way (HIG Gestures).
 */
export function HoldMic({ recording, onTap, onHoldStart, onHoldEnd, accessibilityLabel, accessibilityHint, style }: HoldMicProps) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.12 }], opacity: 1 - pressed.value * 0.15 }));

  // The composer redraws while recording; the gesture stays one object and reads these.
  const latest = useRef({ onTap, onHoldStart, onHoldEnd });
  useEffect(() => {
    latest.current = { onTap, onHoldStart, onHoldEnd };
  });
  const thrown = useRef(false);
  /** The hold is on: if a reply's ■ takes the mic's place, the recording must not run on with no finger. */
  const holding = useRef(false);
  useEffect(
    () => () => {
      if (holding.current) latest.current.onHoldEnd(false);
    },
    [],
  );

  const gesture = useMemo(() => {
    const hold = Gesture.Pan()
      .runOnJS(true)
      .activateAfterLongPress(HOLD_MS)
      .onBegin(() => {
        pressed.value = withSpring(1, { damping: 22, stiffness: 420 });
      })
      .onStart(() => {
        thrown.current = false;
        holding.current = true;
        haptic.lift();
        latest.current.onHoldStart();
      })
      .onUpdate((e) => {
        if (thrown.current || e.translationX > -CANCEL_AT) return;
        thrown.current = true;
        haptic.selection();
        latest.current.onHoldEnd(false);
      })
      .onEnd((_e, success) => {
        holding.current = false;
        if (!thrown.current) latest.current.onHoldEnd(success);
      })
      .onFinalize(() => {
        pressed.value = withTiming(0, { duration: 140 });
      });
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd((_e, success) => {
        if (success) latest.current.onTap();
      });
    return Gesture.Exclusive(hold, tap);
  }, [pressed]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        onAccessibilityTap={onTap}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={onTap}
        hitSlop={8}
        style={[style, recording && styles.recording, animated]}>
        <Ionicons name={recording ? 'mic' : 'mic-outline'} size={25} color={recording ? colors.white : colors.textSecondary} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  recording: { backgroundColor: systemColors.red },
});
