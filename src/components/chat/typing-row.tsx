import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Anim, CharacterAvatar, Txt } from '@/components/ui';
import { colors, space } from '@/theme';
import type { Character } from '@/types';

const AVATAR = 28;
/** Faces shown at most; a fourth typer is still named in the label. */
const MAX_FACES = 3;
const SMALL = 22;

/**
 * Left-side grey bubble with bouncing dots while replies are composed, with the avatar beside
 * it like a run's last bubble. In a group several members can type at once: one bubble, their
 * faces overlapping (up to three) and `label` naming them ("Kai and Elio are typing").
 */
export function TypingRow({ characters, label }: { characters: Character[]; label?: string }) {
  if (characters.length === 0) return null;
  const faces = characters.slice(0, MAX_FACES);
  const bubble = (
    <View style={styles.bubble}>
      <Anim name="typing" size={34} tint={colors.textSecondary} />
    </View>
  );
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      style={styles.row}
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}>
      {faces.length === 1 ? (
        <CharacterAvatar character={faces[0]} size={AVATAR} />
      ) : (
        <View style={[styles.faces, { width: SMALL + (faces.length - 1) * (SMALL - 8) }]}>
          {faces.map((c, i) => (
            <View key={c.id} style={[styles.face, { left: i * (SMALL - 8), zIndex: faces.length - i }]}>
              <CharacterAvatar character={c} size={SMALL} />
            </View>
          ))}
        </View>
      )}
      {label ? (
        <View style={styles.named}>
          <Txt variant="caption" color={colors.textSecondary} style={styles.label} lines={1}>
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
  // Overlapping faces, each with a ring of the ground so they read as separate people.
  faces: { height: SMALL, marginBottom: 3 },
  face: {
    position: 'absolute',
    top: 0,
    borderRadius: SMALL / 2 + 2,
    borderWidth: 2,
    borderColor: colors.bgPlain,
    margin: -2,
  },
  named: { flexShrink: 1, alignItems: 'flex-start', gap: 3 },
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
