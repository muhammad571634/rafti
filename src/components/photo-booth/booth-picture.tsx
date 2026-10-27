import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Image as RNImage, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { HEROES } from '@/assets/heroes/registry';
import { CharacterAvatar, characterImage, Txt } from '@/components/ui';
import { useFriendName } from '@/hooks/use-friend-name';
import { colors, fonts, palette, shadows } from '@/theme';
import type { BoothPhoto, BoothStyle, Character } from '@/types';

import { FrameBackdrop, FrameStickers } from './frame-card';

const GRAIN = require('../../../assets/images/film-grain.png');

/** Height over width of each look, from the layouts below (card, frames, caption). */
const RATIO: Record<BoothStyle, number> = {
  polaroid: 0.07 + 0.86 + 0.2,
  film: 0.07 + 4 * 0.86 * 0.75 + 3 * 0.07 * 0.7 + 0.24,
  studio: 0.07 + 0.86 * 1.18 + 0.17,
  street: 2 / 3,
};

/** The width that lets a picture of this style fit inside a box. */
export const fitWidth = (style: BoothStyle, box: { width: number; height: number }) =>
  Math.floor(Math.min(box.width, box.height / RATIO[style]));

type Picture = Pick<BoothPhoto, 'style' | 'seed' | 'createdAt' | 'frame'>;

/**
 * A Photo Booth picture, drawn on the phone from the friend's own art: Polaroid (portrait on white
 * card stock), Film (a four-frame strip), Studio (black-and-white portrait), Street (a disposable
 * camera shot with its date stamp). The same record draws the same picture in the booth, the
 * album, the chat and Us. `develop` fades it in from white, as a fresh print does.
 */
export function BoothPicture({
  photo,
  character,
  width,
  develop,
  style,
}: {
  photo: Picture;
  character: Character;
  width: number;
  develop?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const friendName = useFriendName();
  const { t } = useTranslation();
  const date = new Date(photo.createdAt);
  const portrait = characterImage(character);
  const scene: Art | undefined = HEROES[character.id]
    ? { source: HEROES[character.id], aspect: 16 / 9 }
    : portrait != null
      ? { source: portrait, aspect: 1 }
      : undefined;
  const face: Art | undefined = portrait != null ? { source: portrait, aspect: 1 } : scene;
  const name = friendName(character, true);
  // A frame (F29) dresses the card styles; Street is a bare photo and keeps its look.
  const look = photo.style === 'street' ? undefined : photo.frame;

  if (photo.style === 'film') {
    const pad = width * 0.07;
    const frameW = width - pad * 2;
    const frameH = frameW * 0.75;
    // Five shots of one sitting; the seed picks which four, so two strips differ.
    const shots: Shot[] = [
      { art: scene, zoom: 1, x: 0.5, y: 0.45 },
      { art: face, zoom: 1, x: 0.5, y: 0.35 },
      { art: face, zoom: 1.7, x: 0.5, y: 0.38 },
      { art: scene, zoom: 1.6, x: 0.55, y: 0.35 },
      { art: face, zoom: 1.3, x: 0.42, y: 0.45 },
    ];
    const first = photo.seed % shots.length;
    return (
      <View style={[styles.strip, { width, padding: pad, paddingBottom: 0, gap: pad * 0.7 }, shadows.card, style]}>
        {look ? <FrameBackdrop look={look} radius={3} /> : null}
        {[0, 1, 2, 3].map((i) => (
          <Frame key={i} shot={shots[(first + i) % shots.length]} width={frameW} height={frameH} character={character} develop={develop}>
            <View style={[StyleSheet.absoluteFill, styles.warm, { mixBlendMode: 'soft-light' }]} />
          </Frame>
        ))}
        <Txt style={[styles.stripLabel, { fontSize: Math.max(7, width * 0.075), lineHeight: width * 0.24 }, look && { color: look.ink }]} center>
          {`RAFTI · ${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`}
        </Txt>
        {look ? <FrameStickers look={look} width={width} /> : null}
      </View>
    );
  }

  if (photo.style === 'studio') {
    const pad = width * 0.07;
    const photoW = width - pad * 2;
    return (
      <View style={[styles.mat, { width, padding: pad, paddingBottom: 0 }, shadows.card, style]}>
        {look ? <FrameBackdrop look={look} radius={3} /> : null}
        <Frame shot={{ art: face, zoom: 1.12, x: 0.5, y: 0.4 }} width={photoW} height={photoW * 1.18} character={character} develop={develop}>
          {/* Saturation from a grey layer leaves only light and shade: black and white on both platforms. */}
          <View style={[StyleSheet.absoluteFill, styles.mono, { mixBlendMode: 'saturation' }]} />
          <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.28)']} style={StyleSheet.absoluteFill} />
        </Frame>
        <Txt
          style={[
            styles.studioLabel,
            { fontSize: Math.max(6, width * 0.055), lineHeight: width * 0.17, letterSpacing: width * 0.02 },
            look && { color: look.ink },
          ]}
          center
          lines={1}>
          {name.toUpperCase()}
        </Txt>
        {look ? <FrameStickers look={look} width={width} /> : null}
      </View>
    );
  }

  if (photo.style === 'street') {
    return (
      <Frame
        shot={{ art: scene, zoom: 1, x: 0.5, y: 0.45 }}
        width={width}
        height={width * RATIO.street}
        character={character}
        develop={develop}
        style={[shadows.card, style]}>
        <View style={[StyleSheet.absoluteFill, styles.sun, { mixBlendMode: 'soft-light' }]} />
        <LinearGradient
          colors={['rgba(255,140,60,0.7)', 'rgba(255,140,60,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.55, y: 0.6 }}
          style={[StyleSheet.absoluteFill, { mixBlendMode: 'screen' }]}
        />
        <View style={[StyleSheet.absoluteFill, styles.grain, { mixBlendMode: 'overlay' }]}>
          <RNImage source={GRAIN} resizeMode="repeat" style={styles.fill} />
        </View>
        <Txt
          style={[
            styles.stamp,
            { fontSize: Math.max(6, width * 0.05), right: width * 0.05, bottom: width * 0.04 },
          ]}>
          {`'${String(date.getFullYear()).slice(2)} ${pad2(date.getMonth() + 1)} ${pad2(date.getDate())}`}
        </Txt>
      </Frame>
    );
  }

  // Polaroid
  const pad = width * 0.07;
  const photoW = width - pad * 2;
  const small = width < 120;
  return (
    <View style={[styles.polaroid, { width, padding: pad, paddingBottom: 0 }, shadows.card, style]}>
      {look ? <FrameBackdrop look={look} /> : null}
      <Frame shot={{ art: face, zoom: 1, x: 0.5, y: 0.4 }} width={photoW} height={photoW} character={character} develop={develop} />
      <View style={[styles.polaroidFoot, { height: width * 0.2 }]}>
        {small ? null : (
          <>
            <Txt style={[styles.hand, { fontSize: width * 0.085 }, look && { color: look.ink }]} lines={1}>
              {look?.caption ?? t('photoBooth.together', { name })}
            </Txt>
            <Txt style={[styles.hand, styles.handDate, { fontSize: width * 0.075 }, look && { color: look.ink, opacity: 0.8 }]} lines={1}>
              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase()}
            </Txt>
          </>
        )}
      </View>
      {look ? <FrameStickers look={look} width={width} /> : null}
    </View>
  );
}

type Art = { source: ImageSource | string | number; aspect: number };
type Shot = { art: Art | undefined; zoom: number; x: number; y: number };

/**
 * One photo inside a picture: the art cropped round a point (`x`, `y` as fractions of the image)
 * and zoomed, then the look's layers on top. Without art, the friend's monogram.
 */
function Frame({
  shot,
  width,
  height,
  character,
  develop,
  style,
  children,
}: {
  shot: Shot;
  width: number;
  height: number;
  character: Character;
  develop?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const { art } = shot;
  let image: React.ReactNode = <CharacterAvatar character={character} size={Math.min(width, height) * 0.6} />;
  if (art) {
    // Cover the frame first, then zoom, then centre the point and keep the frame filled.
    const cover = art.aspect > width / height ? { w: height * art.aspect, h: height } : { w: width, h: width / art.aspect };
    const w = cover.w * shot.zoom;
    const h = cover.h * shot.zoom;
    const left = Math.min(0, Math.max(width - w, width / 2 - shot.x * w));
    const top = Math.min(0, Math.max(height - h, height / 2 - shot.y * h));
    image = <Image source={art.source} style={{ position: 'absolute', left, top, width: w, height: h }} contentFit="cover" />;
  }
  return (
    <View style={[styles.frame, { width, height }, style]}>
      {image}
      {children}
      {develop ? <Developer /> : null}
    </View>
  );
}

/** A white layer that fades out, as a print develops. */
function Developer() {
  const fog = useSharedValue(1);
  useEffect(() => {
    fog.value = withTiming(0, { duration: 2400 });
  }, [fog]);
  const fade = useAnimatedStyle(() => ({ opacity: fog.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fog, fade]} />;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

const styles = StyleSheet.create({
  // Its own stacking context, so the look's blend layers mix only with this photo.
  frame: { overflow: 'hidden', isolation: 'isolate', backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  fog: { backgroundColor: palette.white },
  polaroid: { backgroundColor: colors.surface, borderRadius: 4 },
  polaroidFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  hand: { fontFamily: fonts.hand, color: palette.gray800, flexShrink: 1 },
  handDate: { color: colors.textMuted, flexShrink: 0 },
  strip: { backgroundColor: '#1D1A18', borderRadius: 3 },
  stripLabel: { color: '#F2E6D4', fontWeight: '800', letterSpacing: 2 },
  warm: { backgroundColor: '#D08A4A', opacity: 0.35 },
  mat: { backgroundColor: '#F4F2EF', borderRadius: 3 },
  mono: { backgroundColor: palette.gray600 },
  studioLabel: { color: colors.textSecondary, fontWeight: '800' },
  sun: { backgroundColor: '#C27A3C', opacity: 0.75 },
  grain: { opacity: 0.3 },
  fill: { width: '100%', height: '100%' },
  stamp: {
    position: 'absolute',
    color: '#FF8C3A',
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    textShadowColor: 'rgba(255,120,40,0.9)',
    textShadowRadius: 4,
  },
});
