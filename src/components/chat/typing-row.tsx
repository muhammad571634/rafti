import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Anim, CharacterAvatar, Txt } from '@/components/ui';
import { colors, space } from '@/theme';
import type { Character } from '@/types';

const AVATAR = 28;

/**
 * Left-side grey bubble with bouncing dots while the model composes a reply, with the avatar
 * beside it like a run's last bubble. In a group, `label` ("Theo is typing") says which member.
 */
export function TypingRow({ character, label }: { character: Character; label?: string }) {
  const bubble = (
    <View style={styles.bubble}>
      <Anim name="typing" size={34} tint={colors.textSecondary} />
    </View>
  );
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.row}>
      <CharacterAvatar character={character} size={AVATAR} />
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
    marginBottom: space.sm + 2,
  },
  named: { alignItems: 'flex-start', gap: 3 },
  label: { paddingLeft: space.xs },
  bubble: {
    paddingHorizontal: space.md,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderBottomLeftRadius: 6,
    backgroundColor: colors.bubbleOther,
  },
});
