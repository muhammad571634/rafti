import { Ionicons } from '@expo/vector-icons';
import { type AnimationSpec, SymbolView } from 'expo-symbols';
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
}: {
  ios: SFSymbol;
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color: string;
  animation?: AnimationSpec;
}) {
  const fallback = <Ionicons name={icon} size={size} color={color} />;
  if (Platform.OS !== 'ios') return fallback;
  return (
    <SymbolView
      name={ios}
      size={size}
      tintColor={color}
      animationSpec={animation}
      fallback={fallback}
      style={{ width: size, height: size }}
    />
  );
}
