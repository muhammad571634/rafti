import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';

import type { ClayIconName } from '@/assets/brand/registry';
import { ClayIcon } from '@/components/ui';
import type { PhotoFrame } from '@/types';

/**
 * A Photo Booth frame (F29) drawn under and over a picture's card: the color and pattern
 * fill the card, a neon frame adds its double outline, and up to two stickers sit on the
 * top-left and bottom-right corners. Used by `BoothPicture` and the frame pickers.
 */
export function FrameBackdrop({ look, radius = 4 }: { look: PhotoFrame; radius?: number }) {
  const raw = useId();
  const id = `fp${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: look.bg, borderRadius: radius, overflow: 'hidden' }]}>
      {look.pattern !== 'none' ? (
        <Svg width="100%" height="100%">
          <Defs>
            <PatternTile id={id} look={look} />
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      ) : null}
      {look.outline ? (
        <View style={[StyleSheet.absoluteFill, styles.outer, { borderColor: look.outline[0], borderRadius: radius }]}>
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.inner,
              { borderColor: look.outline[1], borderRadius: Math.max(0, radius - 2) },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

function PatternTile({ id, look }: { id: string; look: PhotoFrame }) {
  const c = look.patternColor;
  switch (look.pattern) {
    case 'dots':
      return (
        <Pattern id={id} width={14} height={14} patternUnits="userSpaceOnUse">
          <Circle cx={7} cy={7} r={2.2} fill={c} />
        </Pattern>
      );
    case 'stripes':
      return (
        <Pattern id={id} width={14} height={14} patternUnits="userSpaceOnUse">
          <Rect x={0} y={0} width={6} height={14} fill={c} />
        </Pattern>
      );
    case 'check':
      return (
        <Pattern id={id} width={14} height={14} patternUnits="userSpaceOnUse">
          <Rect x={0} y={0} width={7} height={7} fill={c} />
          <Rect x={7} y={7} width={7} height={7} fill={c} />
        </Pattern>
      );
    case 'stars':
      return (
        <Pattern id={id} width={24} height={24} patternUnits="userSpaceOnUse">
          <Path d="M6 2 L7 5 L10 6 L7 7 L6 10 L5 7 L2 6 L5 5 Z" fill={c} />
          <Circle cx={18} cy={17} r={1.2} fill={c} />
        </Pattern>
      );
    case 'waves':
      return (
        <Pattern id={id} width={24} height={12} patternUnits="userSpaceOnUse">
          <Path d="M0 8 Q 6 3 12 8 T 24 8" stroke={c} strokeWidth={2} fill="none" />
        </Pattern>
      );
    default:
      return null;
  }
}

/** The stickers, on the card's top-left and bottom-right corners, a little outside it. */
export function FrameStickers({ look, width }: { look: PhotoFrame; width: number }) {
  if (!look.stickers.length) return null;
  const size = Math.round(width * 0.22);
  const spots: ViewStyle[] = [
    { left: -size * 0.3, top: -size * 0.3, transform: [{ rotate: '-10deg' }] },
    { right: -size * 0.3, bottom: -size * 0.25, transform: [{ rotate: '8deg' }] },
  ];
  return (
    <>
      {look.stickers.slice(0, 2).map((name, i) => (
        <View key={`${name}${i}`} pointerEvents="none" style={[styles.sticker, spots[i]]}>
          <ClayIcon name={name as ClayIconName} size={size} tile={false} />
        </View>
      ))}
    </>
  );
}

/** A small framed card with a blank photo: the thumbnail in frame pickers. */
export function FrameSwatch({ look, width, style }: { look: PhotoFrame; width: number; style?: StyleProp<ViewStyle> }) {
  const pad = width * 0.1;
  return (
    <View style={[{ width, height: width * 1.2, padding: pad, paddingBottom: pad * 2.2 }, style]}>
      <FrameBackdrop look={look} radius={6} />
      <View style={[styles.blank, { borderRadius: 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { borderWidth: 2 },
  inner: { margin: 3, borderWidth: 2 },
  sticker: { position: 'absolute' },
  blank: { flex: 1, backgroundColor: 'rgba(216,220,230,0.95)' },
});
