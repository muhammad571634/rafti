import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { ink } from '@/theme/ink';

import { InkText } from './ink-text';

export type PillKind = 'primary' | 'secondary' | 'accent' | 'quiet';

export interface PillButtonProps {
  label: string;
  onPress: () => void;
  /**
   * `primary`: the one filled white pill of a screen. `secondary`: a tinted pill beside it.
   * `accent`: peach, only where money is spent. `quiet`: a way out, text only.
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

const FILL: Record<PillKind, string> = { primary: ink.accent, secondary: ink.raised, accent: ink.accent, quiet: 'transparent' };
const WORDS: Record<PillKind, string> = { primary: ink.onAccent, secondary: ink.text, accent: ink.onAccent, quiet: ink.text2 };

/**
 * The Ink button (polish §4: one filled pill per screen, a press state on every button). Disabled
 * keeps its shape at 40 %, so it never reads as broken, and says so to VoiceOver.
 */
export function PillButton({ label, onPress, kind = 'primary', size = 'lg', disabled, icon, full = true, accessibilityLabel, accessibilityHint, style }: PillButtonProps) {
  const color = WORDS[kind];
  return (
    <PressableScale
      scaleTo={0.97}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.pill, size === 'lg' ? styles.lg : styles.md, { backgroundColor: FILL[kind] }, !full && styles.hug, disabled && styles.off, style]}>
      <View style={styles.row}>
        {icon ? <Ionicons name={icon} size={19} color={color} /> : null}
        <InkText variant={kind === 'quiet' ? 'body' : 'bodyStrong'} color={color} lines={1} style={styles.label}>
          {label}
        </InkText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  lg: { minHeight: 56 },
  md: { minHeight: 48 },
  hug: { alignSelf: 'center' },
  off: { opacity: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' },
  label: { flexShrink: 1, textAlign: 'center' },
});
