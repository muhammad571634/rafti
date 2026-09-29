import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Anim, CharacterAvatar } from '@/components/ui';
import { colors, radius, shadows, space } from '@/theme';
import type { Character } from '@/types';

/** Left-side bubble with bouncing dots while the model composes a reply. */
export function TypingRow({ character }: { character: Character }) {
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.row}>
      <CharacterAvatar character={character} size={34} />
      <View style={[styles.bubble, shadows.card]}>
        <Anim name="typing" size={34} tint={colors.textFaint} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    marginBottom: space.sm,
  },
  bubble: {
    paddingHorizontal: space.lg,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.bubble,
    borderBottomLeftRadius: radius.xs,
    backgroundColor: colors.bubbleOther,
  },
});
