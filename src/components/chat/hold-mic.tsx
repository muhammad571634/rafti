import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useOnPhoto } from '@/components/chat/chat-ground';
import { haptic } from '@/lib/haptics';
import { elasticMicDrag } from '@/lib/reaction-motion';
import { sharedScrubberSound } from '@/lib/scrubber-sound';
import { colors, systemColors } from '@/theme';

/** Past a tap, before the thumb would expect anything else. */
const HOLD_MS = 220;
/** How far left the finger goes to throw the recording away. */
const CANCEL_AT = 90;
/** How far up the finger goes to lock the recording and let go (hands free). */
const LOCK_AT = 70;
/** Past the circle: an easy target for a thumb (HIG: at least 44pt, more on the move). */
const REACH = 10;

export interface HoldMicProps {
  recording: boolean;
  /** A tap: record hands free, right in the composer. */
  onTap: () => void;
  onHoldStart: () => void;
  /** The finger let go (`send` true), slid away or the system took the touch (false). */
  onHoldEnd: (send: boolean) => void;
  /** The finger slid up to the lock: the recording goes on without it. */
  onLock?: () => void;
  accessibilityLabel: string;
  accessibilityHint: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The composer's mic, as in WhatsApp and Instagram: hold to record, let go to send, slide left to
 * cancel with elastic rubber-band resistance, slide up to lock hands free. A tap records hands free
 * too, so the hold is a shortcut and never the only way (HIG Gestures).
 */
export function HoldMic({ recording, onTap, onHoldStart, onHoldEnd, onLock, accessibilityLabel, accessibilityHint, style }: HoldMicProps) {
  const onPhoto = useOnPhoto();
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const cancelProgress = useSharedValue(0);

  const animated = useAnimatedStyle(() => {
    const holdBoost = recording ? 1.12 - cancelProgress.value * 0.18 : 1 - pressed.value * 0.1;
    return {
      transform: [
        { translateX: reduced ? 0 : dragX.value },
        { translateY: reduced ? 0 : dragY.value },
        { scale: reduced ? 1 : holdBoost },
      ],
      opacity: 1 - pressed.value * 0.12,
    };
  }, [recording, reduced]);

  // The composer redraws while recording; the gesture stays one object and reads these.
  const latest = useRef({ onTap, onHoldStart, onHoldEnd, onLock });
  useEffect(() => {
    latest.current = { onTap, onHoldStart, onHoldEnd, onLock };
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
    const resetDrag = () => {
      dragX.value = withSpring(0, { damping: 18, stiffness: 280 });
      dragY.value = withSpring(0, { damping: 18, stiffness: 280 });
      cancelProgress.value = withTiming(0, { duration: 140 });
    };

    const hold = Gesture.Pan()
      .runOnJS(true)
      .hitSlop(REACH)
      .activateAfterLongPress(HOLD_MS)
      .onBegin(() => {
        pressed.value = withSpring(1, { damping: 22, stiffness: 420 });
      })
      .onStart(() => {
        thrown.current = false;
        holding.current = true;
        haptic.lift();
        sharedScrubberSound().tick();
        latest.current.onHoldStart();
      })
      .onUpdate((e) => {
        if (thrown.current) return;
        const absX = Math.abs(Math.min(0, e.translationX));
        const absY = Math.abs(Math.min(0, e.translationY));

        if (absY > absX && latest.current.onLock) {
          dragX.value = 0;
          dragY.value = elasticMicDrag(e.translationY, LOCK_AT * 0.85);
          cancelProgress.value = 0;
        } else {
          dragY.value = 0;
          dragX.value = elasticMicDrag(e.translationX, CANCEL_AT * 0.92);
          cancelProgress.value = Math.min(1, absX / CANCEL_AT);
        }

        if (e.translationY < -LOCK_AT && latest.current.onLock) {
          // Locked: the finger may go; the composer's own send and trash take over.
          thrown.current = true;
          holding.current = false;
          resetDrag();
          haptic.selection();
          sharedScrubberSound().settle();
          latest.current.onLock();
          return;
        }
        if (e.translationX > -CANCEL_AT) return;
        thrown.current = true;
        resetDrag();
        haptic.selection();
        sharedScrubberSound().settle();
        latest.current.onHoldEnd(false);
      })
      .onEnd((_e, success) => {
        holding.current = false;
        resetDrag();
        if (!thrown.current) latest.current.onHoldEnd(success);
      })
      .onFinalize(() => {
        pressed.value = withTiming(0, { duration: 140 });
        resetDrag();
      });
    const tap = Gesture.Tap()
      .runOnJS(true)
      .hitSlop(REACH)
      .onEnd((_e, success) => {
        if (success) latest.current.onTap();
      });
    return Gesture.Exclusive(hold, tap);
  }, [pressed, dragX, dragY, cancelProgress]);

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
        style={[style, recording && styles.recording, animated]}>
        <Ionicons name={recording ? 'mic' : 'mic-outline'} size={29} color={recording ? colors.white : onPhoto ? colors.onMediaSoft : colors.textSecondary} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  recording: { backgroundColor: systemColors.red },
});
