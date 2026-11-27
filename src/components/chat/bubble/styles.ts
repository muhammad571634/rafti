import { StyleSheet } from 'react-native';

import { colors, space } from '@/theme';

/** Their face beside a run's last bubble. */
export const AVATAR = 28;
/** iOS bubble corners; the tail corner of a run's last bubble is tighter. */
export const CORNER = 19;
export const TAIL = 6;

/** The bubble shapes and receipt text that the text, voice and row parts share. */
export const bubbleStyles = StyleSheet.create({
  bubble: {
    maxWidth: '72%',
    paddingHorizontal: 13,
    paddingVertical: space.sm,
    borderRadius: CORNER,
    // iOS squircle corners; Android ignores it.
    borderCurve: 'continuous',
  },
  bubbleMine: { backgroundColor: colors.bubbleSelf, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(235,173,132,0.34)' },
  // White on the cream with a faint rim, so it holds on a white or light wallpaper too.
  bubbleTheirs: { backgroundColor: colors.bubbleOther, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bubbleOtherRim },
  // A run's last bubble points down at its sender's side.
  tailMine: { borderBottomRightRadius: TAIL },
  tailTheirs: { borderBottomLeftRadius: TAIL },
  // Their bubble on a picture (an Art wallpaper): dark glass with a hairline rim (`useOnPhoto`).
  photoBubble: { backgroundColor: colors.onMediaBubble, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.onMediaHairline },
  wide: { maxWidth: '100%' },
  receipt: { fontSize: 11, lineHeight: 14, color: colors.textSecondary, paddingTop: 3, paddingRight: space.xs },
  receiptStrong: { fontWeight: '600', paddingTop: 0, paddingRight: 0 },
  photoShadow: { textShadowColor: colors.onMediaShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
});
