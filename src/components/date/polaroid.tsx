import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { HEROES } from '@/assets/heroes/registry';
import { characterImage, Txt } from '@/components/ui';
import { colors, fonts, palette, shadows } from '@/theme';
import type { Character } from '@/types';

/** The scene photo for a character: their wide hero render, or the portrait when there is none. */
export const sceneImage = (character: Character) => HEROES[character.id] ?? characterImage(character);

/**
 * A date's keepsake: the photo on white card stock with a handwritten caption,
 * slightly tilted as if it was just dropped on a table.
 */
export function Polaroid({
  character,
  caption,
  date,
  width,
  tilt = -3,
  style,
}: {
  character: Character;
  caption: string;
  date: string;
  width: number;
  tilt?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const pad = Math.round(width * 0.055);
  const small = width < 200;
  return (
    <View style={[styles.card, { width, padding: pad, paddingBottom: pad * 1.4, transform: [{ rotate: `${tilt}deg` }] }, shadows.modal, style]}>
      <Image source={sceneImage(character)} style={[styles.photo, { height: width - pad * 2 }]} contentFit="cover" />
      <Txt style={[styles.caption, { fontSize: small ? 18 : 26 }]} center lines={1}>
        {caption}
      </Txt>
      <Txt style={[styles.date, { fontSize: small ? 14 : 18 }]} center>
        {date}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 6 },
  photo: { width: '100%', borderRadius: 2, backgroundColor: colors.surfaceAlt },
  caption: { fontFamily: fonts.hand, color: palette.gray800, marginTop: 10, lineHeight: 30 },
  date: { fontFamily: fonts.hand, color: colors.textMuted, lineHeight: 20 },
});
