import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { PressableScale, Txt } from '@/components/ui';
import { WHEEL_SEGMENTS } from '@/mock';
import { colors, fonts, palette, radius, shadows } from '@/theme';

const SEGMENT = 360 / WHEEL_SEGMENTS.length;
const FILLS = [palette.apricot100, palette.white, palette.mint100, palette.white];
const SPIN_MS = 3600;

function slice(cx: number, cy: number, r: number, from: number, to: number) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const x0 = cx + r * Math.cos(rad(from));
  const y0 = cy + r * Math.sin(rad(from));
  const x1 = cx + r * Math.cos(rad(to));
  const y1 = cy + r * Math.sin(rad(to));
  return `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1} Z`;
}

/**
 * The Free Gifts roulette. `onSpin` decides the result (the store owns the odds);
 * the wheel only animates to it and reports back when it stops.
 */
export function LuckyWheel({
  size = 260,
  disabled,
  onSpin,
  onStop,
}: {
  size?: number;
  disabled?: boolean;
  /** Returns the winning segment index, or null when no spin is available. */
  onSpin: () => number | null;
  onStop: (index: number) => void;
}) {
  const rotation = useSharedValue(0);
  const [spinning, setSpinning] = useState(false);
  const r = size / 2;

  const spin = () => {
    if (spinning || disabled) return;
    const index = onSpin();
    if (index == null) return;

    setSpinning(true);
    // Land the middle of the winning slice under the pointer, after five full turns.
    const current = rotation.value % 360;
    const target = 360 - (index * SEGMENT + SEGMENT / 2);
    const delta = 360 * 5 + ((target - current + 360) % 360);

    rotation.value = withTiming(
      rotation.value + delta,
      { duration: SPIN_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          scheduleOnRN(setSpinning, false);
          scheduleOnRN(onStop, index);
        }
      },
    );
  };

  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <View style={{ width: size, height: size + 14, alignItems: 'center' }}>
      <Animated.View style={[{ width: size, height: size, marginTop: 14 }, wheelStyle]}>
        <Svg width={size} height={size}>
          <Circle cx={r} cy={r} r={r} fill={palette.apricot400} />
          <G>
            {WHEEL_SEGMENTS.map((value, i) => {
              const from = -90 + i * SEGMENT;
              const mid = from + SEGMENT / 2;
              const rad = (mid * Math.PI) / 180;
              const tx = r + r * 0.64 * Math.cos(rad);
              const ty = r + r * 0.64 * Math.sin(rad);
              const jackpot = value === Math.max(...WHEEL_SEGMENTS);
              return (
                <G key={i}>
                  <Path
                    d={slice(r, r, r - 8, from, from + SEGMENT)}
                    fill={jackpot ? '#FFE08A' : FILLS[i % FILLS.length]}
                    stroke={palette.apricot200}
                    strokeWidth={1.5}
                  />
                  <SvgText
                    x={tx}
                    y={ty}
                    fill={jackpot ? '#B8610E' : palette.apricot700}
                    fontSize={size * 0.075}
                    fontFamily={fonts.display}
                    fontWeight="700"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    transform={`rotate(${mid + 90} ${tx} ${ty})`}>
                    {String(value)}
                  </SvgText>
                </G>
              );
            })}
          </G>
          {/* bulbs around the rim */}
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i * 22.5 * Math.PI) / 180;
            return (
              <Circle
                key={i}
                cx={r + (r - 4) * Math.cos(a)}
                cy={r + (r - 4) * Math.sin(a)}
                r={2.6}
                fill={i % 2 ? '#FFFFFF' : '#FFE08A'}
              />
            );
          })}
        </Svg>
      </Animated.View>

      {/* pointer */}
      <Svg width={30} height={30} style={styles.pointer}>
        <Path d="M15 28 L4 6 Q15 0 26 6 Z" fill={colors.primary} stroke={colors.white} strokeWidth={2} />
      </Svg>

      <PressableScale
        onPress={spin}
        disabled={spinning || disabled}
        scaleTo={0.9}
        haptic
        style={[
          styles.hub,
          { top: 14 + r - 34 },
          shadows.fab,
          (spinning || disabled) && styles.hubDisabled,
        ]}>
        <Txt color={colors.white} style={styles.hubText}>
          SPIN
        </Txt>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  pointer: { position: 'absolute', top: 0 },
  hub: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubDisabled: { backgroundColor: palette.gray400 },
  hubText: { fontFamily: fonts.display, fontSize: 16, letterSpacing: 1 },
});
