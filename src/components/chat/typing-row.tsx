import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Anim, CharacterAvatar, Txt } from '@/components/ui';
import { colors, radius, shadows, space } from '@/theme';
import type { Character } from '@/types';

/**
 * Left-side bubble with bouncing dots while the model composes a reply. In a group,
 * `label` ("Theo is typing") says which member it is.
 */
export function TypingRow({ character, label }: { character: Character; label?: string }) {
  const bubble = (
    <View style={[styles.bubble, shadows.card]}>
      <Anim name="typing" size={34} tint={colors.textFaint} />
    </View>
  );
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.row}>
      <CharacterAvatar character={character} size={34} />
      {label ? (
        <View style={styles.named}>
          <Txt variant="caption" color={colors.textSecondary} style={styles.label}>
            {label}
          </Txt>
          {bubble}
        </View>
      ) : (
        bubble
      )}
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
  named: { alignItems: 'flex-start', gap: 3 },
  label: { paddingLeft: space.xs },
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
