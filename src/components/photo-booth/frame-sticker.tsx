import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { SFIcon } from '@/components/ui';

/**
 * A frame's sticker in Apple's manner (owner, 2026-11-11: the 3D clay stickers go): an SF Symbol in
 * its own iOS system colour, the closest Ionicon elsewhere (Ionicons has no cake, so Android draws
 * Material's). The same hues in both themes: a sticker sits on paper.
 */
const LOOK: Record<string, { ios: SFSymbol; icon: keyof typeof Ionicons.glyphMap; android?: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  sparkles: { ios: 'sparkles', icon: 'sparkles', color: '#FFB800' },
  sun: { ios: 'sun.max.fill', icon: 'sunny', color: '#FF9500' },
  music: { ios: 'music.note', icon: 'musical-note', color: '#FF2D55' },
  cake: { ios: 'birthday.cake.fill', icon: 'gift', android: 'cake-variant', color: '#AF52DE' },
  fish: { ios: 'fish.fill', icon: 'fish', color: '#32ADE6' },
  camera: { ios: 'camera.fill', icon: 'camera', color: '#34C759' },
};

/** The glyph alone, `size` tall: in the picker's tiles. */
export function StickerGlyph({ name, size }: { name: string; size: number }) {
  const look = LOOK[name] ?? LOOK.sparkles;
  if (Platform.OS !== 'ios' && look.android) return <MaterialCommunityIcons name={look.android} size={size} color={look.color} />;
  return <SFIcon ios={look.ios} icon={look.icon} size={size} color={look.color} />;
}

/** On a frame: the glyph on a white die-cut disc `size` wide with a soft drop, as a sticker reads on any paper. */
export function FrameSticker({ name, size }: { name: string; size: number }) {
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}>
      <StickerGlyph name={name} size={Math.round(size * 0.58)} />
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      default: { elevation: 3 },
    }),
  },
});
