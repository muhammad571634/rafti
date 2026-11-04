import type { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { aurora, colors, moduleColors, moduleFills } from '@/theme';

import { SFIcon } from './symbol';

export type ModuleKey =
  | 'calls'
  | 'diary'
  | 'date'
  | 'sleep'
  | 'store'
  | 'photo'
  | 'contacts'
  | 'gifts'
  | 'radio'
  | 'board'
  | 'bond'
  | 'note';

/**
 * Each module's glyph: an SF Symbol on iPhone, the matching Ionicon elsewhere. With its colour
 * (`moduleColors`, `moduleFills`) this is how a module looks wherever it shows: Today's tiles and
 * widgets, the chat "+" menu, Us moments, notifications and Shell history.
 */
export const MODULE_GLYPH: Record<ModuleKey, { ios: SFSymbol; icon: keyof typeof Ionicons.glyphMap }> = {
  calls: { ios: 'phone.fill', icon: 'call' },
  diary: { ios: 'book.fill', icon: 'book' },
  date: { ios: 'heart.fill', icon: 'heart' },
  sleep: { ios: 'moon.fill', icon: 'moon' },
  store: { ios: 'bag.fill', icon: 'bag-handle' },
  photo: { ios: 'camera.fill', icon: 'camera' },
  contacts: { ios: 'person.2.fill', icon: 'people' },
  gifts: { ios: 'gift.fill', icon: 'gift' },
  radio: { ios: 'dot.radiowaves.left.and.right', icon: 'radio' },
  board: { ios: 'list.clipboard.fill', icon: 'clipboard' },
  bond: { ios: 'trophy.fill', icon: 'trophy' },
  note: { ios: 'envelope.fill', icon: 'mail' },
};

/**
 * Each module's glyph as a thin line (owner, 2026-11-04: black line icons on milky tiles, as in
 * iOS widgets): the outline SF Symbol drawn `light` on iPhone, the outline Ionicon elsewhere.
 */
export const MODULE_LINE: Record<ModuleKey, { ios: SFSymbol; icon: keyof typeof Ionicons.glyphMap }> = {
  calls: { ios: 'phone', icon: 'call-outline' },
  diary: { ios: 'book', icon: 'book-outline' },
  date: { ios: 'heart', icon: 'heart-outline' },
  sleep: { ios: 'moon', icon: 'moon-outline' },
  store: { ios: 'bag', icon: 'bag-handle-outline' },
  photo: { ios: 'camera', icon: 'camera-outline' },
  contacts: { ios: 'person.2', icon: 'people-outline' },
  gifts: { ios: 'gift', icon: 'gift-outline' },
  radio: { ios: 'dot.radiowaves.left.and.right', icon: 'radio-outline' },
  board: { ios: 'list.clipboard', icon: 'clipboard-outline' },
  bond: { ios: 'trophy', icon: 'trophy-outline' },
  note: { ios: 'envelope', icon: 'mail-outline' },
};

/** A module's thin line glyph in ink (`MODULE_LINE`). */
export function ModuleLine({ name, size, color = colors.text }: { name: ModuleKey; size: number; color?: string }) {
  const glyph = MODULE_LINE[name];
  return <SFIcon ios={glyph.ios} icon={glyph.icon} size={size} color={color} weight="light" />;
}

/**
 * A module as a milky tile, the same frost as Today's widgets: its thin line glyph in ink on a
 * squircle the aurora shows through faintly (~25% corners, like an app icon).
 */
export function FrostIcon({ name, size }: { name: ModuleKey; size: number }) {
  return (
    <View style={[styles.icon, styles.frost, { width: size, height: size, borderRadius: Math.round(size / 4) }]}>
      <ModuleLine name={name} size={Math.round(size * 0.5)} />
    </View>
  );
}

/** A module as a Settings-style row tile: its flat iOS colour and its glyph. */
export const moduleTile = (key: ModuleKey) => ({ fill: moduleFills[key], ...MODULE_GLYPH[key] });

/** A module as an iOS app icon: its glyph in white on its gradient squircle (~25% corners). */
export function ModuleIcon({ name, size }: { name: ModuleKey; size: number }) {
  const glyph = MODULE_GLYPH[name];
  return (
    <LinearGradient
      colors={moduleColors[name]}
      style={[styles.icon, { width: size, height: size, borderRadius: Math.round(size / 4) }]}>
      <SFIcon ios={glyph.ios} icon={glyph.icon} size={Math.round(size * 0.54)} color={colors.white} />
    </LinearGradient>
  );
}

/** A flat Settings-style tile: a white glyph on one iOS colour (`moduleTile` gives a module's). */
export function SymbolTile({
  fill,
  ios,
  icon,
  size = 30,
}: {
  fill: string;
  ios: SFSymbol;
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
}) {
  return (
    <View style={[styles.icon, { width: size, height: size, borderRadius: Math.round(size * 0.24), backgroundColor: fill }]}>
      <SFIcon ios={ios} icon={icon} size={Math.round(size * 0.56)} color={colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center' },
  frost: {
    backgroundColor: aurora.frost,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: aurora.glassEdge,
    borderTopColor: aurora.frostRim,
  },
});
