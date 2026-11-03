import { Image, type ImageContentPosition } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useContext } from 'react';
import { StyleSheet, View } from 'react-native';

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { colors, gradients, gradientStops } from '@/theme';
import type { Character } from '@/types';

export { PORTRAIT_BG } from '@/mock';

/** Wide scenes are 16:9. */
const SCENE_ASPECT = 16 / 9;
/** Scenes put the face up and right of centre (`today-hero.tsx`); these sit elsewhere, 0 left to 1 right. */
const SCENE_FACE: Record<string, number> = {
  c_adrian: 0.63, c_ari: 0.56, c_aurelian: 0.64, c_cass: 0.76, c_castor: 0.6, c_cole: 0.8, c_corvin: 0.74,
  c_dex: 0.67, c_elio: 0.62, c_ezra: 0.61, c_felix: 0.75, c_gideon: 0.68, c_hana: 0.66, c_haze: 0.74,
  c_hugo: 0.4, c_iris: 0.65, c_ivy: 0.76, c_jun: 0.6, c_juno: 0.7, c_kael: 0.74, c_kai: 0.6, c_kiro: 0.56,
  c_lucas: 0.62, c_lyra: 0.8, c_marco: 0.76, c_minu: 0.45, c_nadia: 0.68, c_noah: 0.62, c_orin: 0.76,
  c_ren: 0.8, c_rhys: 0.76, c_rio: 0.8, c_rowan: 0.66, c_seraphine: 0.58, c_seren: 0.76, c_sol: 0.6,
  c_tessa: 0.74, c_theo: 0.66, c_vesper: 0.76, c_zarek: 0.72,
};

export interface Portrait {
  source: number | { uri: string };
  position: ImageContentPosition;
}

/**
 * Their picture as a ground for a frame `aspect` (width / height) wide: the tall portrait, else
 * the wide scene slid so their face sits in the middle, else the picture a creator gave them.
 * Undefined when there is none: the chat falls back to the plain ground.
 */
export function portraitOf(character: Character, aspect: number): Portrait | undefined {
  const tall = PORTRAITS[character.id];
  if (tall != null) return { source: tall, position: { top: 0, left: '50%' } };
  const scene = HEROES[character.id];
  if (scene != null) {
    const face = SCENE_FACE[character.id] ?? 0.62;
    // Cover fills the height and crops the sides; an object-position of `left` puts `face` mid-frame.
    const left = aspect < SCENE_ASPECT ? (face * SCENE_ASPECT - aspect / 2) / (SCENE_ASPECT - aspect) : 0.5;
    return { source: scene, position: { top: '30%', left: `${Math.round(Math.min(1, Math.max(0, left)) * 100)}%` } };
  }
  if (character.avatarUri) return { source: { uri: character.avatarUri }, position: 'center' };
  return undefined;
}

const OnPhoto = createContext(false);

/** Wraps a chat whose ground is a picture, so its bubbles and notes take their on-photo look. */
export const ChatGroundProvider = OnPhoto.Provider;

/** True inside a chat on a picture: their bubbles turn to dark glass, notes and times to white. */
export const useOnPhoto = () => useContext(OnPhoto);

/** The picture filling the screen, shaded dark under the header and under the conversation. */
export function PortraitGround({ portrait }: { portrait: Portrait }) {
  return (
    <View pointerEvents="none" style={styles.fill}>
      <Image source={portrait.source} contentFit="cover" contentPosition={portrait.position} style={StyleSheet.absoluteFill} accessible={false} />
      <LinearGradient colors={gradients.portraitScrim} locations={gradientStops.portraitScrim} style={StyleSheet.absoluteFill} />
    </View>
  );
}

/** White words straight on the picture: a soft shadow keeps them clear over a bright patch. */
export const onPhotoText = { color: colors.onMediaMuted, textShadowColor: colors.onMediaShadow, textShadowRadius: 4 } as const;

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, backgroundColor: colors.black },
});
