import { useCallback, useImperativeHandle, useMemo, useRef, type ReactNode, type Ref } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/** Sideways travel before a row starts to slide. */
const START = 20;
/** A vertical move this long, before the sideways one, leaves the touch to the list's scroll. */
const SCROLL_FIRST = 10;
/** The settle after a release: no bounce, carries the finger's speed. */
const SETTLE = { duration: 350, dampingRatio: 1, overshootClamping: true, reduceMotion: ReduceMotion.System };

/** The further past the edge, the less the row follows. */
function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Where a flick would come to rest (Apple's decay projection), short enough for a row. */
function project(velocity: number, rate = 0.99) {
  'worklet';
  return ((velocity / 1000) * rate) / (1 - rate);
}

export interface SwipeRowMethods {
  close: () => void;
}

/**
 * A list row that slides sideways over its actions, iOS Mail style, built on a pan that gives up as
 * soon as the finger moves up or down first: a scroll, even a slanted one, never opens a row. The row
 * follows the finger one to one and stops at its actions with growing resistance; on release it opens
 * when it is past half its actions or was flicked that way, and closes otherwise.
 */
export function SwipeRow({
  ref,
  enabled = true,
  leftWidth,
  rightWidth,
  renderLeft,
  renderRight,
  style,
  onOpenStart,
  onWillOpen,
  onWillClose,
  children,
}: {
  ref?: Ref<SwipeRowMethods>;
  enabled?: boolean;
  /** The width of the actions under each side; 0 keeps that side shut. */
  leftWidth: number;
  rightWidth: number;
  renderLeft: (progress: SharedValue<number>) => ReactNode;
  renderRight: (progress: SharedValue<number>) => ReactNode;
  style?: StyleProp<ViewStyle>;
  /** A drag starts on a closed row. */
  onOpenStart?: () => void;
  /** Both fire on release, as the row heads for its new place. */
  onWillOpen?: () => void;
  onWillClose?: () => void;
  children: ReactNode;
}) {
  const x = useSharedValue(0);
  /** Where the row was when the drag began, and the finger's travel at that moment. */
  const from = useSharedValue(0);
  const grab = useSharedValue(0);
  /** -1 open on the right, 0 closed, 1 open on the left. */
  const side = useSharedValue(0);

  // The latest callbacks, behind one stable function, so the gesture and `close` never change.
  const handlers = useRef({ onOpenStart, onWillOpen, onWillClose });
  handlers.current = { onOpenStart, onWillOpen, onWillClose };
  const emit = useCallback((event: 'onOpenStart' | 'onWillOpen' | 'onWillClose') => handlers.current[event]?.(), []);

  const close = useCallback(() => {
    if (side.value !== 0) {
      side.value = 0;
      emit('onWillClose');
    }
    x.value = withSpring(0, SETTLE);
  }, [emit, side, x]);

  useImperativeHandle(ref, () => ({ close }), [close]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetX([-START, START])
        .failOffsetY([-SCROLL_FIRST, SCROLL_FIRST])
        .onStart((e) => {
          from.value = x.value;
          // Measured from here, so the row does not jump by the start distance.
          grab.value = e.translationX;
          if (side.value === 0) scheduleOnRN(emit, 'onOpenStart');
        })
        .onUpdate((e) => {
          const next = from.value + e.translationX - grab.value;
          if (next > leftWidth) x.value = leftWidth + rubberband(next - leftWidth, leftWidth || START);
          else if (next < -rightWidth) x.value = -rightWidth + rubberband(next + rightWidth, rightWidth || START);
          else x.value = next;
        })
        .onEnd((e) => {
          const rest = x.value + project(e.velocityX);
          const to = leftWidth > 0 && rest > leftWidth / 2 ? leftWidth : rightWidth > 0 && rest < -rightWidth / 2 ? -rightWidth : 0;
          const next = Math.sign(to);
          // A drag that ends shut reports it even if the row never opened: its start announced an opening.
          if (next === 0) scheduleOnRN(emit, 'onWillClose');
          else if (next !== side.value) scheduleOnRN(emit, 'onWillOpen');
          side.value = next;
          x.value = withSpring(to, { ...SETTLE, velocity: e.velocityX });
        }),
    [enabled, leftWidth, rightWidth, emit, from, grab, side, x],
  );

  const leftProgress = useDerivedValue(() =>
    leftWidth > 0 ? interpolate(x.value, [0, leftWidth], [0, 1], Extrapolation.CLAMP) : 0,
  );
  const rightProgress = useDerivedValue(() =>
    rightWidth > 0 ? interpolate(-x.value, [0, rightWidth], [0, 1], Extrapolation.CLAMP) : 0,
  );
  const moving = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={style}>
      {leftWidth > 0 ? <View style={[styles.side, { left: 0, width: leftWidth }]}>{renderLeft(leftProgress)}</View> : null}
      {rightWidth > 0 ? <View style={[styles.side, { right: 0, width: rightWidth }]}>{renderRight(rightProgress)}</View> : null}
      <GestureDetector gesture={pan} touchAction="pan-y">
        <Animated.View style={moving}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  side: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row' },
});
