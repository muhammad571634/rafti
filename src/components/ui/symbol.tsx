import { Ionicons } from '@expo/vector-icons';
import { type AnimationSpec, SymbolView, type SymbolWeight } from 'expo-symbols';
import { Platform } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

/**
 * An SF Symbol on iPhone (drawn by the system, as Apple's licence allows), the matching
 * Ionicon everywhere else. `animation` plays SF Symbols' own effects (bounce, pulse) on iOS.
 */
export function SFIcon({
  ios,
  icon,
  size = 22,
  color,
  animation,
  weight,
}: {
  ios: SFSymbol;
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color: string;
  animation?: AnimationSpec;
  /** The SF Symbol's stroke (iOS only), e.g. `light` for the thin line icons. */
  weight?: SymbolWeight;
}) {
  const fallback = <Ionicons name={icon} size={size} color={color} />;
  if (Platform.OS !== 'ios') return fallback;
  return (
    <SymbolView
      name={ios}
      size={size}
      tintColor={color}
      animationSpec={animation}
      weight={weight}
      fallback={fallback}
      style={{ width: size, height: size }}
    />
  );
}
