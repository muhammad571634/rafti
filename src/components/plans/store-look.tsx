import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, Txt } from '@/components/ui';
import { aurora, isDark, space } from '@/theme';

/**
 * The Store on the aurora (canvas "Store: Plans and Shells", 2026-10-22): colours the canvas
 * uses beyond the aurora tokens, and the parts both tabs share.
 */
export const STORE = isDark
  ? {
      ring: 'rgba(235,235,245,0.3)',
      tint: '#FFB27A',
      onTint: '#3A1A06',
      faint: '#636366',
      peachSoft: '#3A2416',
      peachInk: '#FFB27A',
      violetSoft: '#2E1A3C',
      violetInk: '#D9A6F5',
      inkTag: '#FFFFFF',
      inkTagText: '#1C1C1E',
      greyTag: 'rgba(118,118,128,0.24)',
      proColumn: 'rgba(166,75,214,0.16)',
      proInk: '#D9A6F5',
      cta: '#FFB37A',
      ctaInk: '#3A1A06',
      bar: 'rgba(5,6,15,0.62)',
      barSolid: 'rgba(5,6,15,0.94)',
      barLine: 'rgba(255,255,255,0.14)',
    }
  : {
      ring: 'rgba(60,60,67,0.3)',
      tint: '#C96A32',
      onTint: '#FFFFFF',
      faint: '#AEAEB2',
      peachSoft: '#FFF0E4',
      peachInk: '#A8531F',
      violetSoft: '#F3E8FB',
      violetInk: '#8E3BB8',
      inkTag: '#1C1C1E',
      inkTagText: '#FFFFFF',
      greyTag: 'rgba(118,118,128,0.12)',
      proColumn: 'rgba(91,63,217,0.07)',
      proInk: '#5B3FD9',
      cta: '#FFB37A',
      ctaInk: '#6A2F0C',
      bar: 'rgba(251,246,241,0.72)',
      barSolid: 'rgba(251,246,241,0.94)',
      barLine: 'rgba(0,0,0,0.12)',
    };

/** Pro's own colour: violet into peach, on the Pro card, the Pro pill and a chosen Pro plan. */
export const PRO_GRADIENT = ['#5B3FD9', '#A64BD6', '#F0795A'] as const;
const PRO_STOPS = [0, 0.55, 1] as const;

export const CARD_SHADOW = {
  shadowColor: isDark ? '#000000' : '#3C285A',
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
  const check = <Ionicons name="checkmark" size={15} color={fill === 'tint' ? STORE.onTint : '#FFFFFF'} />;
  if (fill === 'pro') return <ProGradient style={styles.radio}>{check}</ProGradient>;
  return <View style={[styles.radio, { backgroundColor: fill === 'grey' ? '#8E8E93' : STORE.tint }]}>{check}</View>;
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
}: {
  label: string;
  caption: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.md) + 6 }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'ios' ? STORE.bar : STORE.barSolid }]} />
      <PressableScale
        scaleTo={0.97}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        style={[styles.cta, disabled && styles.ctaOff]}>
        <Txt style={styles.ctaText} lines={1}>
          {label}
        </Txt>
      </PressableScale>
      <Txt style={styles.caption} center>
        {caption}
      </Txt>
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
  cta: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: STORE.cta },
  ctaOff: { opacity: 0.5 },
  ctaText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: STORE.ctaInk },
  caption: { fontSize: 13, color: aurora.textMuted },
});
