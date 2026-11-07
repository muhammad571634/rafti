/**
 * What is written by hand on the letter, as React Native text over the canvas: their note on the card's back and the
 * user's name on the envelope's pocket. Native text writes any script (Caveat, and the system's face for any letter
 * Caveat does not have), where Skia could not even load the handwriting face on the A51.
 *
 * Each layer takes its pose from the same frame as the drawn card and envelope (`cardPoseOf`, `envPoseOf`), on the
 * UI thread, so the ink lands, turns over and drops away with the paper it is on.
 */
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { cardPoseOf, envPoseOf, frameOf } from './envelope-scene';
import { COLORS, FONTS, LAYOUT, type ScreenLayout } from './theme';
import type { EnvelopeValues } from './use-envelope';

const CW = LAYOUT.cardW;
const CH = LAYOUT.cardH;
const EW = LAYOUT.envW;
const EH = LAYOUT.envH;

type Props = { v: EnvelopeValues; width: number; reduced: boolean; lay: ScreenLayout; note: string; to: string };

export function EnvelopeWriting({ v, width, reduced, lay, note, to }: Props) {
  // The card's back: shown while the card is out and turned past edge-on, mirrored as the drawn back is.
  const noteStyle = useAnimatedStyle(() => {
    const f = frameOf(v, reduced);
    const pose = cardPoseOf(f, lay.envTop, lay.cardTop);
    const showing = pose.front && Math.cos(pose.flip) < 0;
    return {
      opacity: showing ? 1 - f.resetOut : 0,
      transform: [
        { perspective: 1100 },
        { translateY: pose.y - CH / 2 },
        { rotate: `${pose.rot}deg` },
        { scale: pose.s },
        { rotateY: `${pose.flip}rad` },
        { scaleX: -1 },
      ],
    };
  });
  // The pocket: rides with the envelope (its float, the settle, the drop) and fades with it.
  const nameStyle = useAnimatedStyle(() => {
    const e = envPoseOf(frameOf(v, reduced), reduced);
    return { opacity: 0.9 * e.opacity, transform: [{ translateY: lay.envTop + e.dy }, { scale: e.scale }] };
  });

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.card, { left: width / 2 - CW / 2 }, noteStyle]}>
        {/* The day and SIGMAZAM sit in the top right corner: the note keeps clear of them. */}
        <Text style={styles.note} numberOfLines={7} adjustsFontSizeToFit minimumFontScale={0.55}>
          {note}
        </Text>
      </Animated.View>
      {to ? (
        <Animated.View pointerEvents="none" style={[styles.envelope, { left: (width - EW) / 2 }, nameStyle]}>
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {to}
          </Text>
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', top: 0, width: CW, height: CH, paddingTop: 22, paddingLeft: 26, paddingRight: 26, paddingBottom: 16 },
  note: { marginRight: 70, color: COLORS.pen, fontFamily: FONTS.hand, fontSize: 25, lineHeight: 30, opacity: 0.92 },
  envelope: { position: 'absolute', top: 0, width: EW, height: EH, justifyContent: 'flex-end', alignItems: 'flex-end', paddingRight: 24, paddingBottom: 18, paddingLeft: EW / 2 },
  name: { color: COLORS.pen, fontFamily: FONTS.hand, fontSize: 30, lineHeight: 36 },
});
