import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { Platform, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { night, themed, useNight, useThemed, useTokens } from '@/theme';

/**
 * The approved canvas's four soft colour fields (peach, lavender, mint, pink; or the northern
 * lights in dark mode), rendered once by scripts/build-aurora.py from the palette in colors.ts.
 */
const GROUND_DARK = require('../../../assets/images/aurora-dark.png');
const GROUND_LIGHT = require('../../../assets/images/aurora-light.png');

/**
 * The aurora ground behind the content, as one still picture. HIG Materials keeps the app's
 * background in the content layer and HIG Motion asks for motion only with a purpose, so it does
 * not drift: four live SVG discs per screen cost a software render and ~33 MB of textures each, and
 * their drift kept Android redrawing every screen at 60 fps while the phone sat idle. One small
 * picture is decoded once and shared by every screen.
 */
export function AuroraBackground() {
  const styles = useThemed(sheet);
  // Inside an always-dark screen (`NightScope`) the northern lights whatever the phone is set to.
  const ground = useNight() ? GROUND_DARK : GROUND_LIGHT;
  return (
    <View style={[StyleSheet.absoluteFill, styles.base]} pointerEvents="none">
      <Image source={ground} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
    </View>
  );
}

/** Real Liquid Glass where the phone has it (iOS 26+), checked once. */
const nativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/**
 * A control's glass on the aurora: the system's Liquid Glass on iOS 26+, elsewhere a see-through
 * fill with a bright top rim and a fine dark edge. For controls only, never for content
 * (HIG Materials). `on` marks the selected state (the current tab, a pressed toggle).
 * `prominent` is a screen's one primary action (iOS's prominent glass): tinted in the brand
 * fill, its glyph in `colors.textOnPrimary`.
 */
export function AuroraGlass({
  children,
  style,
  on,
  prominent,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  on?: boolean;
  prominent?: boolean;
}) {
  const styles = useThemed(sheet);
  const { colors, aurora } = useTokens();
  if (nativeGlass) {
    const tint = prominent ? colors.primaryFill : on ? aurora.glassOn : undefined;
    return (
      <GlassView style={style} glassEffectStyle="regular" isInteractive tintColor={tint}>
        {children}
      </GlassView>
    );
  }
  return <View style={[styles.glass, on && styles.glassOn, prominent && styles.prominent, style]}>{children}</View>;
}

const sheet = themed(({ colors, aurora }) =>
  StyleSheet.create({
    base: { backgroundColor: aurora.base, overflow: 'hidden' },
    glass: {
      backgroundColor: aurora.glass,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: aurora.glassEdge,
      borderTopColor: aurora.glassRim,
      shadowColor: aurora.shadow,
      shadowOpacity: aurora === night.aurora ? 0.4 : 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    glassOn: { backgroundColor: aurora.glassOn },
    prominent: { backgroundColor: colors.primaryFill, borderTopColor: aurora.glassEdge },
  }),
);
