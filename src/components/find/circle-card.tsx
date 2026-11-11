import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { FACE_AT, portraitOf, stretchLeft } from '@/components/chat/chat-ground';
import { characterImage, PressableScale, Txt } from '@/components/ui';
import { localCharacter } from '@/i18n/content';
import { colors, fonts, gradients, gradientStops, space } from '@/theme';
import type { Character } from '@/types';

/** The card's height for its width: a wide photo, about 196 pt on a 390 pt phone. */
const ASPECT = 358 / 196;
const BUTTON_H = 40;
const SLOP = { top: 2, bottom: 2, left: 4, right: 4 };
const SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)'] as const;

/**
 * One person in a circle of Find, as the canvas board "Find: doira ichi" draws them (owner,
 * 2026-11-11): their scene as a wide photo card, their face on the trailing side (`FACE_AT`, owner
 * 2026-11-08), name and how they stand to you on the leading side, and one clear glass button:
 * "Say hi" adds them, "Message" opens the chat once they are a friend. The card opens the profile;
 * the button is its sibling, never nested (a button in a button is invalid on web). "New" and a
 * phone for those who can call ride on the picture.
 */
export const CircleCard = memo(function CircleCard({
  character,
  friend,
  fresh,
  onOpen,
  onAct,
}: {
  character: Character;
  friend: boolean;
  fresh: boolean;
  onOpen: () => void;
  /** Say hi (adds them) or, for a friend, open the chat. */
  onAct: () => void;
}) {
  const { t } = useTranslation();
  const { width: screen } = useWindowDimensions();
  const width = screen - space.lg * 2;
  const height = Math.round(width / ASPECT);
  const shown = localCharacter(character);
  const role = shown.relation ?? shown.worldRole;

  const picture = portraitOf(character, width / height, FACE_AT);
  const source = picture?.source ?? characterImage(character);
  const stretch = picture?.stretch ?? 1;
  const left = stretchLeft(width, stretch, FACE_AT, picture?.faceX);
  const action = friend ? t('characterProfile.chat') : t('find.sayHi');

  return (
    <View style={[styles.card, { height }]}>
      <PressableScale scaleTo={0.98} accessibilityRole="button" accessibilityLabel={[character.name, role].filter(Boolean).join(', ')} onPress={onOpen} style={StyleSheet.absoluteFill}>
        {source != null ? (
          <Image
            source={source}
            style={stretch > 1 ? [styles.wide, { width: width * stretch, left }] : StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={picture?.position}
            transition={150}
          />
        ) : null}
        {/* Darker under the words: from the bottom, and from the leading side where the name sits. */}
        <LinearGradient colors={SCRIM} style={styles.scrim} />
        <LinearGradient
          colors={gradients.heroSideScrim}
          locations={gradientStops.heroSideScrim}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {fresh ? (
          <View style={styles.newSticker}>
            <Txt style={styles.newText} maxFontSizeMultiplier={1.2}>
              {t('find.newBadge')}
            </Txt>
          </View>
        ) : null}
        <View style={styles.words}>
          <View style={styles.nameRow}>
            <Txt style={styles.name} lines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.2}>
              {character.name}
            </Txt>
            {character.voiceReady ? <Ionicons name="call" size={14} color={colors.onMediaSoft} accessibilityLabel={t('find.canCall')} /> : null}
          </View>
          {role ? (
            <Txt style={styles.role} lines={1} maxFontSizeMultiplier={1.3}>
              {role}
            </Txt>
          ) : null}
        </View>
      </PressableScale>
      <PressableScale
        scaleTo={0.92}
        accessibilityRole="button"
        accessibilityLabel={`${action}, ${character.name}`}
        onPress={onAct}
        hitSlop={SLOP}
        style={styles.button}>
        {Platform.OS === 'ios' ? <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        <Ionicons name={friend ? 'chatbubble' : 'hand-left'} size={15} color={colors.onMedia} />
        <Txt style={styles.buttonText} maxFontSizeMultiplier={1.3}>
          {action}
        </Txt>
      </PressableScale>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 28, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  wide: { position: 'absolute', top: 0, bottom: 0 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' },
  newSticker: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#FFC93C',
    transform: [{ rotate: '-6deg' }],
  },
  newText: { fontFamily: fonts.playful, fontSize: 13, lineHeight: 17, color: '#1F1A17' },
  // The leading side: the name and the relation stop short of the face and the button.
  words: { position: 'absolute', left: space.lg, right: '50%', bottom: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontFamily: fonts.playful, fontSize: 22, lineHeight: 27, color: colors.onMedia },
  role: { marginTop: 2, fontSize: 14, lineHeight: 18, fontStyle: 'italic', fontWeight: '600', color: colors.onMediaSoft },
  // Clear glass on the photo (HIG Materials: the clear variant is for components over rich media).
  button: {
    position: 'absolute',
    right: space.md,
    bottom: 14,
    height: BUTTON_H,
    paddingHorizontal: 14,
    borderRadius: BUTTON_H / 2,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.onMediaGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
  },
  buttonText: { fontFamily: fonts.playful, fontSize: 15, color: colors.onMedia },
});
