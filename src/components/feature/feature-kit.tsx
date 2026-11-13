import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { PressableScale, SFIcon, Txt } from '@/components/ui';
import { hitSlop, immersive, space, systemGround, type Look } from '@/theme';

/**
 * The parts every feature screen shares (design-style §10, family 2: Gifts, Store, Radio, Board,
 * Photo Booth): round head buttons on Apple's fill, grey cards on the white ground, one hero card in
 * the feature's signature gradient and capsules in its tint. One place, so the screens stay alike.
 */

const ROUND = 44;

/** A round head button: an SF Symbol on iPhone (`ios`), an Ionicon elsewhere, on Apple's fill. */
export function RoundButton({
  icon,
  ios,
  accessibilityLabel,
  onPress,
  dark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  ios?: SFSymbol;
  accessibilityLabel: string;
  onPress: () => void;
  /** On an always-dark screen (`immersive`): smoky glass with a lit rim and a white glyph. */
  dark?: boolean;
}) {
  const tint = dark ? immersive.label : systemGround.label;
  return (
    <PressableScale scaleTo={0.9} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={[styles.round, dark && styles.roundDark]}>
      {ios ? <SFIcon ios={ios} icon={icon} size={20} color={tint} /> : <Ionicons name={icon} size={22} color={tint} style={icon === 'chevron-back' && styles.backNudge} />}
    </PressableScale>
  );
}

/** The head row: the back button on the leading side, an optional item on the trailing one. */
export function FeatureBar({ backLabel, onBack, right }: { backLabel: string; onBack: () => void; right?: ReactNode }) {
  return (
    <View style={styles.bar}>
      <RoundButton icon="chevron-back" accessibilityLabel={backLabel} onPress={onBack} />
      {right}
    </View>
  );
}

/** The screen's one card in its feature's gradient. */
export function HeroCard({ look, style, children }: { look: Pick<Look, 'hero'>; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return (
    <LinearGradient colors={look.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, style]}>
      {children}
    </LinearGradient>
  );
}

/** A capsule button in the feature's tint (Invite, Share, Spin). */
export function TintCapsule({
  look,
  label,
  onPress,
  disabled,
  loading,
}: {
  look: Look;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <PressableScale
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.capsule, { backgroundColor: look.soft }, disabled && styles.off]}>
      {loading ? <ActivityIndicator size="small" color={look.text} /> : <Txt style={[styles.capsuleText, { color: look.text }]}>{label}</Txt>}
    </PressableScale>
  );
}

export const featureStyles = StyleSheet.create({
  /** A grey card on the white ground; rows inside run edge to edge. */
  card: { marginHorizontal: space.lg, borderRadius: 22, borderCurve: 'continuous', backgroundColor: systemGround.card, overflow: 'hidden' },
});

const styles = StyleSheet.create({
  round: { width: ROUND, height: ROUND, borderRadius: ROUND / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.fill },
  roundDark: { backgroundColor: immersive.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: immersive.rim },
  backNudge: { marginLeft: -2 },
  bar: { height: ROUND, paddingHorizontal: space.lg, marginTop: space.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // No clip: a card may have something peeking over its edge (the check-in's mascot).
  hero: { marginHorizontal: space.lg, borderRadius: 26, borderCurve: 'continuous' },
  capsule: { minWidth: 64, height: 32, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  capsuleText: { fontSize: 15, fontWeight: '700' },
  off: { opacity: 0.5 },
});
