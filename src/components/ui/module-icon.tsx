import type { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { colors, moduleColors, moduleFills } from '@/theme';

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

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center' },
});
