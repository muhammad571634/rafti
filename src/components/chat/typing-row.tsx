import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useOnPhoto } from '@/components/chat/chat-ground';
import { CharacterAvatar, Txt } from '@/components/ui';
import { colors, space } from '@/theme';
import { ink, inkPeachGlass } from '@/theme/ink';
import type { Character } from '@/types';

import { ThinkingSphere } from './thinking-sphere';

const AVATAR = 28;
/** Faces shown at most; a fourth typer is still named in the label. */
const MAX_FACES = 3;
const SMALL = 22;

/**
 * Left-side dark glass pill with the rotating 3D dot-matrix ThinkingSphere while replies are composed,
 * paired with the avatar beside it like a run's last bubble. In a group several members can type at
 * once: one pill, their faces overlapping (up to three) and `label` naming them.
 */
export function TypingRow({ characters, label, accentColor }: { characters: Character[]; label?: string; accentColor?: string }) {
  const { t } = useTranslation();
  const onPhoto = useOnPhoto();
  if (characters.length === 0) return null;
  const faces = characters.slice(0, MAX_FACES);
  const sphereColor = accentColor ?? ink.accent;
  const thinkingText = t('common.thinking');
  const bubble = (
    <View style={[styles.bubble, onPhoto && styles.photoBubble]}>
      <ThinkingSphere size={22} color={sphereColor} />
      <Txt variant="smallStrong" color={accentColor ?? inkPeachGlass.ctaText} style={styles.thinkingText} lines={1}>
        {thinkingText}
      </Txt>
    </View>
  );
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      style={styles.row}
      accessibilityLiveRegion="polite"
      accessibilityLabel={label ?? thinkingText}>
      {faces.length === 1 ? (
        accentColor ? (
          <View style={[styles.avatarRing, { borderColor: accentColor }]}>
            <CharacterAvatar character={faces[0]} size={AVATAR - 4} />
          </View>
        ) : (
          <CharacterAvatar character={faces[0]} size={AVATAR} />
        )
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
          <Txt variant="caption" color={accentColor ?? (onPhoto ? colors.onMediaSoft : colors.textSecondary)} style={[styles.label, accentColor && styles.labelAccented]} lines={1}>
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
  avatarRing: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
  labelAccented: { fontWeight: '600' },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: space.md,
    height: 38,
    borderRadius: 19,
    borderBottomLeftRadius: 6,
    backgroundColor: colors.bubbleOther,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bubbleOtherRim,
  },
  photoBubble: { backgroundColor: colors.onMediaBubble, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.onMediaHairline },
  thinkingText: { fontSize: 13, letterSpacing: -0.1 },
});
