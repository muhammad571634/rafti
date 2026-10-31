import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { PressableScale, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { WHEEL_SEGMENTS } from '@/mock';
import { colors, fonts, isDark, palette, radius, systemColors } from '@/theme';

const SEGMENT = 360 / WHEEL_SEGMENTS.length;
/** Pastel iOS colours, led by Sigmazam's peach brand accent. */
const FILLS = [
  colors.primaryFill,
  systemColors.purple,
  systemColors.mint,
  systemColors.yellow,
  systemColors.pink,
  systemColors.blue,
  systemColors.green,
];
const FILL_OPACITY = isDark ? 0.72 : 0.38;
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
  /** Returns the winning segment index, or null when no spin is available; the server's draw arrives later. */
  onSpin: () => number | null | Promise<number | null>;
  onStop: (index: number) => void;
}) {
  const { t } = useTranslation();
  const rotation = useSharedValue(0);
  const [spinning, setSpinning] = useState(false);
  const r = size / 2;
  const hubSize = Math.min(68, Math.max(52, Math.round(size * 0.32)));
  const pointerSize = Math.max(20, Math.round(size * 0.11));
  const pointerInset = pointerSize * 0.14;

  const land = (index: number) => {
    haptic.success();
    onStop(index);
  };

  const spin = async () => {
    if (spinning || disabled) return;
    // Locked while the result comes (the server may draw it), so a second tap cannot spin twice.
    setSpinning(true);
    const index = await onSpin();
    if (index == null) {
      setSpinning(false);
      return;
    }

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
          scheduleOnRN(land, index);
        }
      },
    );
  };

  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <View style={{ width: size, height: size + 14, alignItems: 'center' }}>
      <Animated.View style={[{ width: size, height: size, marginTop: 14 }, wheelStyle]}>
        <Svg width={size} height={size}>
          <Circle cx={r} cy={r} r={r - 1} fill={colors.surface} stroke={colors.border} strokeWidth={1} />
          <G>
            {WHEEL_SEGMENTS.map((value, i) => {
              const from = -90 + i * SEGMENT;
              const mid = from + SEGMENT / 2;
              const rad = (mid * Math.PI) / 180;
              const tx = r + r * 0.64 * Math.cos(rad);
              const ty = r + r * 0.64 * Math.sin(rad);
              const labelColor = isDark && [0, 2, 3, 6].includes(i) ? palette.gray900 : colors.text;
              return (
                <G key={i}>
                  <Path
                    d={slice(r, r, r - 1, from, from + SEGMENT)}
                    fill={FILLS[i % FILLS.length]}
                    fillOpacity={FILL_OPACITY}
                    stroke={colors.surface}
                    strokeWidth={1.5}
                  />
                  <SvgText
                    x={tx}
                    y={ty}
                    fill={labelColor}
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
        </Svg>
      </Animated.View>

      {/* pointer */}
      <Svg width={pointerSize} height={pointerSize} style={styles.pointer}>
        <Path
          d={`M${pointerSize / 2} ${pointerSize - 2} L${pointerInset} ${pointerInset} Q${pointerSize / 2} 0 ${pointerSize - pointerInset} ${pointerInset} Z`}
          fill={colors.text}
          stroke={colors.white}
          strokeWidth={2}
        />
      </Svg>

      <PressableScale
        onPress={spin}
        disabled={spinning || disabled}
        scaleTo={0.9}
        haptic
        style={[
          styles.hub,
          { top: 14 + r - hubSize / 2, width: hubSize, height: hubSize, borderRadius: hubSize / 2 },
          (spinning || disabled) && styles.hubDisabled,
        ]}>
        <Txt variant="bodyStrong" color={colors.textOnPrimary}>
          {t('gifts.spin')}
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
    backgroundColor: colors.primaryFill,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubDisabled: { backgroundColor: colors.textFaint },
});
