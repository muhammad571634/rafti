import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { CharacterAvatar } from '@/components/ui';
import { colors } from '@/theme';
import type { Character } from '@/types';

/**
 * A group's face: its 2 or 3 members stacked in one square (the approved group chat
 * prototype). Each face sits in a ring of the surface colour so the overlaps read.
 */
export function GroupAvatar({
  members,
  size = 56,
  ringColor = colors.bgPlain,
  style,
}: {
  members: Character[];
  size?: number;
  /** The colour behind the avatar, so each face looks cut out of it. */
  ringColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const shown = members.slice(0, 3);
  const three = shown.length >= 3;
  const face = Math.round(size * (three ? 0.58 : 0.66));
  const ring = Math.max(1.5, Math.round(size / 28));
  const far = size - face;
  const spots = three
    ? [
        { left: 0, top: 0 },
        { left: far, top: 0 },
        { left: far / 2, top: far },
      ]
    : [
        { left: 0, top: 0 },
        { left: far, top: far },
      ];

  return (
    <View style={[{ width: size, height: size }, style]} accessible={false}>
      {shown.map((member, i) => (
        <View
          key={member.id}
          style={[
            styles.face,
            spots[i],
            { width: face, height: face, borderRadius: face / 2, padding: ring, backgroundColor: ringColor },
          ]}>
          <CharacterAvatar character={member} size={face - ring * 2} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  face: { position: 'absolute' },
});
