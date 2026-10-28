import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, Txt } from '@/components/ui';
import { aurora, colors, gradients, isDark, space, storeColors, systemColors } from '@/theme';

/** The Store's colours (`storeColors` in the theme) and the parts both tabs share. */
export const STORE = storeColors;

/** Pro's own colour: violet into peach, on the Pro card, the Pro pill and a chosen Pro plan. */
export const PRO_GRADIENT = gradients.pro;
const PRO_STOPS = [0, 0.55, 1] as const;

export const CARD_SHADOW = {
  shadowColor: aurora.shadow,
  shadowOpacity: isDark ? 0.35 : 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
};

/** Room the scroll leaves under its content for the buy bar. */
export const BUY_BAR_SPACE = 150;

export function ProGradient({ style, children }: { style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  return (
    <LinearGradient colors={PRO_GRADIENT} locations={PRO_STOPS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
      {children}
    </LinearGradient>
  );
}

/**
 * The round choice mark of a plan or pack row: an empty ring, or filled with a check. `pro`
 * fills it with Pro's gradient, `grey` with system grey (Basic), otherwise with the peach tint.
 */
export function Radio({ on, fill = 'tint' }: { on: boolean; fill?: 'tint' | 'pro' | 'grey' }) {
  if (!on) return <View style={[styles.radio, styles.radioOff]} />;
  const check = <Ionicons name="checkmark" size={15} color={fill === 'tint' ? STORE.onTint : colors.white} />;
  if (fill === 'pro') return <ProGradient style={styles.radio}>{check}</ProGradient>;
  return <View style={[styles.radio, { backgroundColor: fill === 'grey' ? systemColors.gray : STORE.tint }]}>{check}</View>;
}

/** An inset group's small caps label ("CHOOSE A PLAN"). */
export function GroupLabel({ children }: { children: string }) {
  return <Txt style={styles.groupLabel}>{children}</Txt>;
}

/** A Settings-style icon tile: a white glyph on a system colour. */
export function IconTile({ fill, size = 30, children }: { fill: string; size?: number; children: React.ReactNode }) {
  return <View style={[styles.tile, { width: size, height: size, backgroundColor: fill }]}>{children}</View>;
}

/** The small violet "Pro" mark on things only Pro has. */
export function ProPill() {
  return (
    <View style={styles.proPill}>
      <Txt style={styles.proPillText}>Pro</Txt>
    </View>
  );
}

/**
 * The bar pinned to the bottom of the store: the one buy button and the billing line under it,
 * over the aurora. iOS blurs what scrolls under it; Android, which has no cheap blur here, gets a
 * nearly solid fill so the line stays readable.
 */
export function StoreBuyBar({
  label,
  caption,
  disabled,
  onPress,
  left,
  children,
}: {
  label: string;
  caption?: string;
  disabled?: boolean;
  onPress: () => void;
  /** A glyph before the label (Photo Booth's lock). */
  left?: React.ReactNode;
  /** A line above the button (Photo Booth's pictures-left meter). */
  children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.md) + 6 }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? STORE.bar : STORE.barSolid }]} />
      {children}
      <PressableScale
        scaleTo={0.97}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        style={[styles.cta, disabled && styles.ctaOff]}>
        {left}
        <Txt style={[styles.ctaText, disabled && styles.ctaTextOff]} lines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {label}
        </Txt>
      </PressableScale>
      {caption ? (
        <Txt style={styles.caption} center>
          {caption}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  radio: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  radioOff: { borderWidth: 1.5, borderColor: STORE.ring },
  groupLabel: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: space.lg * 2,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: aurora.textMuted,
    textTransform: 'uppercase',
  },
  tile: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  proPill: { height: 24, paddingHorizontal: 9, borderRadius: 12, justifyContent: 'center', backgroundColor: STORE.violetSoft },
  proPillText: { fontSize: 13, fontWeight: '700', color: STORE.violetInk },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: space.sm,
    paddingTop: 12,
    paddingHorizontal: space.lg,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: STORE.barLine,
  },
  cta: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STORE.cta,
  },
  // iOS's disabled prominent button: a grey fill and a faint label, not a faded accent.
  ctaOff: { backgroundColor: systemColors.fill },
  ctaText: { flexShrink: 1, fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: STORE.ctaInk },
  ctaTextOff: { color: colors.textFaint },
  caption: { fontSize: 13, color: aurora.textMuted },
});
