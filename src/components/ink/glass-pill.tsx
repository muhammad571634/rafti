import type { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { PressableScale } from '@/components/ui/pressable-scale';
import { SFIcon } from '@/components/ui/symbol';
import { ink, inkRadius } from '@/theme/ink';

import { InkText } from './ink-text';

export interface PhotoGlassPillProps {
  /** Short pill label (stays single-line per HIG; omit for icon + trailing badge pills). */
  label?: string;
  /** iOS SF Symbol name paired with Android/web Ionicons fallback. */
  ios?: SFSymbol;
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  /** Optional trailing content (e.g. a shell reward badge). */
  trailing?: ReactNode;
  /** Expand across available row width instead of hugging content. */
  flex?: boolean;
  haptic?: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Clear dark-glass pill drawn over photography (owner's standing rule: never solid white or opaque
 * frosted blocks covering character art; no live blur on Android so the Galaxy A51 keeps 60 fps).
 */
export function PhotoGlassPill({
  label,
  ios,
  icon,
  iconSize = 15,
  trailing,
  flex = false,
  haptic,
  disabled,
  onPress,
  accessibilityLabel,
  style,
}: PhotoGlassPillProps) {
  return (
    <PressableScale
      scaleTo={0.96}
      haptic={haptic}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={[styles.pill, flex && styles.flex, disabled && styles.disabled, style]}>
      <View style={styles.row}>
        {ios && icon ? <SFIcon ios={ios} icon={icon} size={iconSize} color={ink.text} /> : null}
        {label ? (
          <InkText
            variant="subStrong"
            color={ink.text}
            lines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            style={styles.label}>
            {label}
          </InkText>
        ) : null}
        {trailing}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: inkRadius.pill,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.photoGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
  },
  flex: { flex: 1, minWidth: 0 },
  disabled: { opacity: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, maxWidth: '100%' },
  label: { flexShrink: 1 },
});
