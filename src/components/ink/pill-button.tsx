import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { ink, inkPeachGlass } from '@/theme/ink';

import { InkText } from './ink-text';

export type PillKind = 'primary' | 'secondary' | 'accent' | 'quiet';

export interface PillButtonProps {
  label: string;
  onPress: () => void;
  /**
   * `primary`: the one filled pill of a screen. `secondary`: a tinted pill beside it.
   * `accent`: peach glass, only where money is spent. `quiet`: a way out, text only.
   */
  kind?: PillKind;
  /** 56 (the screen's main action) or 48. */
  size?: 'lg' | 'md';
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Grow to the row's width (default) or hug the label. */
  full?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const FILL: Record<PillKind, string> = { primary: 'transparent', secondary: ink.raised, accent: 'transparent', quiet: 'transparent' };
const WORDS: Record<PillKind, string> = { primary: inkPeachGlass.ctaText, secondary: ink.text, accent: inkPeachGlass.ctaText, quiet: ink.text2 };

/**
 * The Ink button (polish §4: one primary pill per screen, a press state on every button). Disabled
 * keeps its shape at 40 %, so it never reads as broken, and says so to VoiceOver.
 */
export function PillButton({ label, onPress, kind = 'primary', size = 'lg', disabled, icon, full = true, accessibilityLabel, accessibilityHint, style }: PillButtonProps) {
  const color = WORDS[kind];
  const peach = kind === 'primary' || kind === 'accent';
  // A peach button that cannot be pressed goes grey, as iOS does: peach at 40% read brown on the night ground.
  const peachOff = peach && !!disabled;
  const words = peachOff ? ink.text3 : color;
  return (
    <PressableScale
      scaleTo={0.97}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        styles.pill,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: FILL[kind] },
        peach && !peachOff && styles.peachRim,
        !full && styles.hug,
        peachOff ? styles.peachOff : disabled && styles.off,
        style,
      ]}>
      {peach && !peachOff ? <LinearGradient colors={inkPeachGlass.ctaFill} style={StyleSheet.absoluteFill} pointerEvents="none" /> : null}
      <View style={styles.row}>
        {icon ? <Ionicons name={icon} size={19} color={words} /> : null}
        <InkText variant={kind === 'quiet' ? 'body' : 'bodyStrong'} color={words} lines={1} style={styles.label}>
          {label}
        </InkText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, borderCurve: 'continuous', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  peachRim: { borderWidth: 1, borderColor: inkPeachGlass.ctaRim },
  lg: { minHeight: 56 },
  md: { minHeight: 48 },
  hug: { alignSelf: 'center' },
  off: { opacity: 0.4 },
  peachOff: { backgroundColor: ink.raised },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' },
  label: { flexShrink: 1, textAlign: 'center' },
});
