import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { PressableScale, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { WHEEL_SEGMENTS } from '@/mock';
import { fonts, radius } from '@/theme';
import { ink } from '@/theme/ink';

const SEGMENT = 360 / WHEEL_SEGMENTS.length;
const SPIN_MS = 3600;
const TOP_PRIZE = Math.max(...WHEEL_SEGMENTS);

function slice(cx: number, cy: number, r: number, from: number, to: number) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const x0 = cx + r * Math.cos(rad(from));
  const y0 = cy + r * Math.sin(rad(from));
  const x1 = cx + r * Math.cos(rad(to));
  const y1 = cy + r * Math.sin(rad(to));
  return `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1} Z`;
}

/**
 * The Free Gifts roulette (Ink Night+ refined): calm obsidian alternating slices with a warm
 * bronze-peach top-prize wedge, warm peach pointer and crisp white Spin hub. `onSpin` decides the
 * result (the store owns the odds); the wheel only animates to it and reports back when it stops.
 */
export function LuckyWheel({
  size = 260,
  disabled,
  onSpin,
  onStop,
  autoSpin,
}: {
  size?: number;
  disabled?: boolean;
  /** Spin once on its own, a moment after it shows (Today's "Spin" button opened it). */
  autoSpin?: boolean;
  /** Returns the winning segment index, or null when no spin is available; the server's draw arrives later. */
  onSpin: () => number | null | Promise<number | null>;
  onStop: (index: number) => void;
}) {
  const { t } = useTranslation();
  const rotation = useSharedValue(0);
  const [spinning, setSpinning] = useState(false);
  const r = size / 2;
  const hubSize = Math.min(64, Math.max(52, Math.round(size * 0.28)));
  const pointerSize = Math.max(18, Math.round(size * 0.1));
  const pointerInset = pointerSize * 0.14;

  const land = (index: number) => {
    haptic.success();
    onStop(index);
  };

  const spin = async () => {
    if (spinning || disabled) return;
    setSpinning(true);
    const index = await onSpin();
    if (index == null) {
      setSpinning(false);
      return;
    }

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

  const autoSpun = useRef(false);
  useEffect(() => {
    if (!autoSpin || disabled || autoSpun.current) return;
    autoSpun.current = true;
    const timer = setTimeout(() => void spin(), 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpin, disabled]);

  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <View style={{ width: size, height: size + 14, alignItems: 'center' }}>
      <Animated.View style={[{ width: size, height: size, marginTop: 14 }, wheelStyle]}>
        <Svg width={size} height={size}>
          <Circle cx={r} cy={r} r={r - 1.5} fill="#1E1E29" stroke="rgba(235,173,132,0.42)" strokeWidth={2} />
          <G>
            {WHEEL_SEGMENTS.map((value, i) => {
              const from = -90 + i * SEGMENT;
              const mid = from + SEGMENT / 2;
              const rad = (mid * Math.PI) / 180;
              const tx = r + r * 0.66 * Math.cos(rad);
              const ty = r + r * 0.66 * Math.sin(rad);
              const isJackpot = value === TOP_PRIZE;
              const fill = isJackpot ? '#56392F' : i % 2 === 0 ? '#1E1E29' : '#262634';
              const labelColor = isJackpot || value >= 20 ? ink.accent : ink.text;
              return (
                <G key={i}>
                  <Path
                    d={slice(r, r, r - 2.5, from, from + SEGMENT)}
                    fill={fill}
                    stroke="rgba(255,255,255,0.09)"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={tx}
                    y={ty}
                    fill={labelColor}
                    fontSize={size * 0.072}
                    fontFamily={fonts.body}
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

      {/* Top peach pointer */}
      <Svg width={pointerSize} height={pointerSize} style={styles.pointer}>
        <Path
          d={`M${pointerSize / 2} ${pointerSize - 2} L${pointerInset} ${pointerInset} Q${pointerSize / 2} 0 ${pointerSize - pointerInset} ${pointerInset} Z`}
          fill={ink.accent}
          stroke={ink.ground}
          strokeWidth={1.5}
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
        {/* One word on one line: Russian "Крутить" stays crisp inside the hub. */}
        <Txt
          variant="smallStrong"
          color={spinning || disabled ? ink.text2 : ink.onAccent}
          lines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.58}
          style={styles.hubLabel}>
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ink.accent,
    borderWidth: 3.5,
    borderColor: ink.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubDisabled: { backgroundColor: '#2C2C36' },
  hubLabel: { maxWidth: '100%', paddingHorizontal: 6 },
});
