import { LinearGradient } from 'expo-linear-gradient';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { ink, inkRadius } from '@/theme/ink';

export interface GlowCardProps {
  /** The hue that lights the card from the left (a friend's, a kind's). */
  hue: string;
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Inner layout (padding, gap). */
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * A record as a card lit from one side by its hue (design-ink §1.5): moments, streams, notes. The
 * light is a gradient, never a blur (the A51 cannot afford one).
 */
export function GlowCard({ hue, children, onPress, onLongPress, accessibilityLabel, style, contentStyle }: GlowCardProps) {
  const body = (
    <>
      <LinearGradient colors={[`${hue}52`, `${hue}00`]} start={{ x: 0, y: 0.3 }} end={{ x: 0.8, y: 0.7 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </>
  );
  if (!onPress && !onLongPress) return <View style={[styles.card, style]}>{body}</View>;
  return (
    <PressableScale scaleTo={0.98} onPress={onPress} onLongPress={onLongPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={[styles.card, style]}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  content: { padding: 18, gap: 14 },
});
