import { Image, type ImageContentPosition, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useContext } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { coverFocus, PORTRAIT_ASPECT, portraitFace, portraitStretch, stretchLeft } from '@/lib/portrait-focus';
import { colors, gradients, gradientStops } from '@/theme';
import type { Character } from '@/types';

export { PORTRAIT_BG } from '@/mock';

/** The soft edge where the conversation slides under the header on a picture. */
export const PICTURE_EDGE = 56;

/** Wide scenes are 16:9. */
const SCENE_ASPECT = 16 / 9;
/** Scenes put the face up and right of centre (`today-hero.tsx`); where each one sits, 0 left to 1 right. */
// Filled per character as the Cast 2.0 art comes in (docs/nano-banana-cast-2.md); the first cast's went with it.
const SCENE_FACE: Record<string, number> = {};

export interface Picture {
  source: ImageSource | number;
  position?: ImageContentPosition;
  /**
   * How many frame widths wide to draw it so the face lands where it was asked (`stretchLeft`); 1 or
   * none for a picture that fills the frame as it is (a wide scene slides instead).
   */
  stretch?: number;
  /** Where their face sits across the picture (0..1), for `stretchLeft`; the middle when not given. */
  faceX?: number;
}

/** Where a friend's face sits on a card with words on it: the trailing side (owner, 2026-11-08, every character). */
export const FACE_AT = 0.68;

/**
 * Their picture for a frame `aspect` (width / height) wide, with their face at `at` of its width (the
 * middle by default, `FACE_AT` on a card with words on it): the tall portrait, else the wide scene
 * slid to `at`, else the photo a creator gave them. A tall or square picture cannot slide, so it is
 * drawn `stretch` frames wide instead. Undefined when there is none: the caller falls back.
 */
export function portraitOf(character: Character, aspect: number, at = 0.5): Picture | undefined {
  const stretch = 2 * Math.max(at, 1 - at);
  const tall = PORTRAITS[character.id];
  if (tall != null) {
    // Each painting has its face somewhere else: draw it only as wide as its face needs, then slide.
    const face = portraitFace(character.id);
    const wide = portraitStretch(face, aspect, at, stretch);
    return { source: tall, position: asPosition(coverFocus(face, PORTRAIT_ASPECT, aspect * wide, at)), stretch: wide, faceX: face.x };
  }
  const scene = HEROES[character.id];
  if (scene != null) return { source: scene, position: sceneFocus(character.id, aspect, at), stretch: 1 };
  if (character.avatarUri) return { source: { uri: character.avatarUri }, position: 'center', stretch };
  return undefined;
}

/**
 * Where a tall portrait sits in a cover-fit frame `aspect` (width / height) wide so their face lands
 * at `at` across and in the upper third; undefined for any other picture (the caller keeps its own).
 */
export function portraitPosition(characterId: string, aspect: number, at = 0.5): ImageContentPosition | undefined {
  if (PORTRAITS[characterId] == null || !(aspect > 0)) return undefined;
  return asPosition(coverFocus(portraitFace(characterId), PORTRAIT_ASPECT, aspect, at));
}

const asPosition = (p: { left: number; top: number }): ImageContentPosition => ({ left: `${Math.round(p.left * 100)}%`, top: `${Math.round(p.top * 100)}%` });

export { stretchLeft };

/**
 * Where a wide scene sits in a frame `aspect` (width / height) wide, so their face lands at `at` of
 * the frame's width (0 leading, 1 trailing; mid-frame by default), as near as the picture allows.
 */
export function sceneFocus(characterId: string, aspect: number, at = 0.5): ImageContentPosition {
  const face = SCENE_FACE[characterId] ?? 0.62;
  // Cover fills the height and crops the sides; an object-position of `left` slides `face` to `at`.
  const left = aspect > 0 && aspect < SCENE_ASPECT ? (face * SCENE_ASPECT - at * aspect) / (SCENE_ASPECT - aspect) : 0.5;
  return { top: '30%', left: `${Math.round(Math.min(1, Math.max(0, left)) * 100)}%` };
}

const OnPhoto = createContext(false);

/**
 * Wraps a chat whose ground is a picture (their portrait, the default, or an Art wallpaper) or a
 * dark wallpaper: its bubbles, notes, header and composer take their on-picture look. Every chat
 * since appearance B (owner 2026-11-11: always dark), so the light branches are for other screens.
 */
export const ChatGroundProvider = OnPhoto.Provider;

/** True inside a chat on a picture: their bubbles turn to dark glass, notes and times to white. */
export const useOnPhoto = () => useContext(OnPhoto);

/** White words straight on the picture: a soft shadow keeps them clear over a bright patch. */
export const onPhotoText = { color: colors.onMediaMuted, textShadowColor: colors.onMediaShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 } as const;

/** The picture filling the screen, shaded dark under the header and under the conversation. */
export function PictureGround({ picture }: { picture: Picture }) {
  return (
    <View pointerEvents="none" style={styles.fill}>
      <Image source={picture.source} contentFit="cover" contentPosition={picture.position} style={StyleSheet.absoluteFill} accessible={false} />
      <LinearGradient colors={gradients.pictureScrim} locations={gradientStops.pictureScrim} style={StyleSheet.absoluteFill} />
    </View>
  );
}

/**
 * Where the conversation starts on a picture: right under the header (`headerRoom`, with any bar
 * under it). The owner (2026-11-08): the whole screen is the conversation, never cut at its middle;
 * the picture shows behind the lines. Hooks: call it before any early return.
 */
export function usePictureListTop(onPicture: boolean, headerRoom: number) {
  return onPicture ? headerRoom : 0;
}

/** iOS has no fading edge on a list: a soft dark valley where the conversation ends instead. */
export function PictureEdge({ top }: { top: number }) {
  if (Platform.OS === 'android') return null;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={gradients.pictureEdge}
      locations={gradientStops.pictureEdge}
      style={[styles.edge, { top: top - PICTURE_EDGE / 2 }]}
    />
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, backgroundColor: colors.black },
  edge: { position: 'absolute', left: 0, right: 0, height: PICTURE_EDGE * 1.5 },
});
