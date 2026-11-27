import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Txt } from '@/components/ui';
import { ink, inkGlass, inkPeachGlass } from '@/theme/ink';

import { ThinkingSphere } from './thinking-sphere';

/** Asymmetric springs so width and height settle slightly out of phase like iOS Dynamic Island. */
const WIDTH_SPRING = { stiffness: 380, damping: 24, mass: 1 } as const;
const HEIGHT_SPRING = { stiffness: 300, damping: 22, mass: 1 } as const;
const RADIUS_SPRING = { stiffness: 340, damping: 24, mass: 1 } as const;
const ENTER_SPRING = { stiffness: 360, damping: 26, mass: 1 } as const;

export type MorphIslandState =
  | { kind: 'thinking'; label: string; accent?: string }
  | { kind: 'memory'; title: string; subtitle: string; onPress?: () => void }
  | { kind: 'pin'; text: string }
  | { kind: 'photo'; label: string };

interface Dimensions {
  w: number;
  h: number;
  r: number;
}

function targetDimensions(state: MorphIslandState, maxW: number): Dimensions {
  switch (state.kind) {
    case 'thinking':
      return { w: Math.min(204, maxW), h: 36, r: 18 };
    case 'memory':
      return { w: Math.min(286, maxW), h: 56, r: 24 };
    case 'pin':
      return { w: Math.min(220, maxW), h: 38, r: 19 };
    case 'photo':
      return { w: Math.min(224, maxW), h: 42, r: 21 };
  }
}

export interface MorphIslandProps {
  /** Active status to display; `null` smoothly collapses the island away. */
  state: MorphIslandState | null;
  /** Top offset below the chat header. */
  top: number;
}

/**
 * Floating dark Liquid Glass status capsule under the chat header that morphs width, height, and
 * corner radius with asymmetric springs as live chat events happen (thinking, saved memory, pin).
 */
export function MorphIsland({ state, top }: MorphIslandProps) {
  const { width: screenWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const maxW = Math.max(180, screenWidth - 36);

  // Keep the last non-null state briefly so the collapse animation shows its content while fading out.
  const lastState = useRef<MorphIslandState | null>(state);
  if (state) lastState.current = state;
  const shown = state ?? lastState.current;

  const boxW = useSharedValue(180);
  const boxH = useSharedValue(36);
  const boxR = useSharedValue(18);
  const visible = useSharedValue(0);

  useEffect(() => {
    if (!state) {
      visible.value = reducedMotion ? 0 : withTiming(0, { duration: 180 });
      return;
    }
    const { w, h, r } = targetDimensions(state, maxW);
    if (reducedMotion || visible.value < 0.05) {
      boxW.value = w;
      boxH.value = h;
      boxR.value = r;
    } else {
      boxW.value = withSpring(w, WIDTH_SPRING);
      boxH.value = withSpring(h, HEIGHT_SPRING);
      boxR.value = withSpring(r, RADIUS_SPRING);
    }
    visible.value = reducedMotion ? 1 : withSpring(1, ENTER_SPRING);
  }, [boxH, boxR, boxW, maxW, reducedMotion, state, visible]);

  const shellStyle = useAnimatedStyle(() => ({
    width: boxW.value,
    height: boxH.value,
    borderRadius: boxR.value,
    opacity: visible.value,
    transform: [
      { translateY: (1 - visible.value) * -10 },
      { scale: 0.88 + visible.value * 0.12 },
    ],
  }));

  if (!shown) return null;

  const isMemory = shown.kind === 'memory';
  const rimColor = isMemory || shown.kind === 'pin' ? inkPeachGlass.rim : inkGlass.rim;
  const onPress = shown.kind === 'memory' ? shown.onPress : undefined;

  const inner = (
    <Animated.View
      key={`${shown.kind}:${shown.kind === 'memory' ? shown.subtitle : shown.kind === 'pin' ? shown.text : shown.label}`}
      entering={reducedMotion ? undefined : FadeIn.duration(150)}
      exiting={reducedMotion ? undefined : FadeOut.duration(90)}
      style={styles.inner}>
      {shown.kind === 'thinking' ? (
        <View style={styles.rowCenter}>
          <ThinkingSphere size={18} color={shown.accent ?? ink.accent} />
          <Txt variant="caption" color={inkPeachGlass.textBright} style={styles.label} lines={1}>
            {shown.label}
          </Txt>
        </View>
      ) : shown.kind === 'memory' ? (
        <View style={styles.rowMemory}>
          <View style={styles.memoryIcon}>
            <Ionicons name="sparkles" size={15} color={ink.accent} />
          </View>
          <View style={styles.memoryText}>
            <Txt variant="caption" color={inkPeachGlass.textBright} style={styles.memoryTitle} lines={1}>
              {shown.title}
            </Txt>
            <Txt variant="caption" color={ink.text2} style={styles.memorySub} lines={1}>
              {shown.subtitle}
            </Txt>
          </View>
        </View>
      ) : shown.kind === 'pin' ? (
        <View style={styles.rowCenter}>
          <Ionicons name="pin" size={14} color={ink.accent} />
          <Txt variant="caption" color={inkPeachGlass.textBright} style={styles.label} lines={1}>
            {shown.text}
          </Txt>
        </View>
      ) : (
        <View style={styles.rowCenter}>
          <Ionicons name="arrow-up-circle" size={15} color={ink.accent} />
          <Txt variant="caption" color={inkPeachGlass.textBright} style={styles.label} lines={1}>
            {shown.label}
          </Txt>
        </View>
      )}
    </Animated.View>
  );

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="box-none" accessibilityLiveRegion="polite">
      <Animated.View
        pointerEvents={state ? (onPress ? 'auto' : 'none') : 'none'}
        style={[styles.shell, { borderColor: rimColor }, shellStyle]}>
        <LinearGradient
          colors={inkPeachGlass.trackFill}
          locations={inkPeachGlass.trackStops}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {onPress ? (
          <Pressable onPress={onPress} style={styles.fill} accessibilityRole="button" accessibilityLabel={shown.kind === 'memory' ? shown.title : undefined}>
            {inner}
          </Pressable>
        ) : (
          inner
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  shell: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fill: {
    flex: 1,
    justifyContent: 'center',
  },
  inner: {
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  rowMemory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: inkPeachGlass.flat,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: inkPeachGlass.rim,
  },
  memoryText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  memoryTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  memorySub: {
    fontSize: 11.5,
    fontWeight: '400',
  },
});
