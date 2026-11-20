import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { FACE_AT, portraitOf, stretchLeft } from '@/components/chat/chat-ground';
import { InkText, PhotoGlassPill } from '@/components/ink';
import { CharacterAvatar, characterImage, PressableScale } from '@/components/ui';
import { localCharacter } from '@/i18n/content';
import { colors, friendAccent, friendColor } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

/** Wide cinema-aligned aspect ratio: about 196 pt tall on a 390 pt phone. */
const ASPECT = 350 / 196;
const CARD_SCRIM = ['rgba(9,9,13,0.24)', 'rgba(9,9,13,0)', 'rgba(9,9,13,0.44)', 'rgba(9,9,13,0.94)'] as const;
const CARD_SCRIM_STOPS = [0, 0.28, 0.58, 1] as const;
const SIDE_SCRIM = ['rgba(9,9,13,0.78)', 'rgba(9,9,13,0.38)', 'rgba(9,9,13,0)'] as const;
const SIDE_SCRIM_STOPS = [0, 0.48, 0.78] as const;
const NEW_FILL = 'rgba(235,173,132,0.22)';
const NEW_RIM = 'rgba(235,173,132,0.45)';

/** Formats a character's opening line as a clean editorial whisper, keeping existing quotes intact. */
function formatHook(text?: string): string | undefined {
  const clean = text?.replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  if (/^[“"«「]/.test(clean)) return clean;
  return `“${clean}”`;
}

/**
 * One person in a circle of Find (approved Ink Night+ prototype): wide cinema-aligned photo card
 * with their face on the trailing side (`FACE_AT`), top-left dark-glass relation badge + calm peach
 * "New" pill, serif name + whispered opening hook on the leading side, and an un-nested sibling
 * `PhotoGlassPill` ("Say hi →" or "Message") at bottom-right (zero live blur for 60 fps on A51).
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
  const [broken, setBroken] = useState(false);

  const width = screen - inkGutter * 2;
  const height = Math.round(width / ASPECT);
  const shown = localCharacter(character);
  const role = shown.relation ?? shown.worldRole;
  const hook = formatHook(shown.greeting);

  const picture = portraitOf(character, width / height, FACE_AT);
  const rawSource = picture?.source ?? characterImage(character);
  const source = broken ? undefined : rawSource;
  const stretch = picture?.stretch ?? 1;
  const left = stretchLeft(width, stretch, FACE_AT, picture?.faceX);
  const action = friend ? t('characterProfile.chat') : t('find.sayHi');
  const accent = friendAccent(character.id).strong;
  const fallbackHue = friendColor(character.id).fill;

  return (
    <View style={[styles.card, { height }]}>
      <PressableScale
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={[character.name, role, shown.greeting].filter(Boolean).join(', ')}
        onPress={onOpen}
        style={StyleSheet.absoluteFill}>
        {source != null ? (
          <Image
            source={typeof source === 'string' ? { uri: source } : source}
            style={stretch > 1 ? [styles.wide, { width: width * stretch, left }] : StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={picture?.position}
            transition={150}
            onError={() => setBroken(true)}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallback, { backgroundColor: fallbackHue }]}>
            <CharacterAvatar character={character} size={84} />
          </View>
        )}

        {/* Vertical and leading-side scrims keep serif copy legible while the trailing portrait shines. */}
        <LinearGradient
          colors={CARD_SCRIM}
          locations={CARD_SCRIM_STOPS}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={SIDE_SCRIM}
          locations={SIDE_SCRIM_STOPS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />

        {role || fresh ? (
          <View style={styles.badges}>
            {role ? (
              <View style={styles.relationBadge}>
                <View style={[styles.relationDot, { backgroundColor: accent }]} />
                <InkText variant="caption" color={ink.text} lines={1} style={styles.badgeLabel}>
                  {role}
                </InkText>
              </View>
            ) : null}
            {fresh ? (
              <View style={styles.newBadge}>
                <InkText variant="caption" color={ink.accent} lines={1}>
                  {t('find.newBadge')}
                </InkText>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.words}>
          <View style={styles.nameRow}>
            <InkText variant="card" color={colors.onMedia} lines={1} adjustsFontSizeToFit minimumFontScale={0.76} style={styles.name}>
              {character.name}
            </InkText>
            {character.voiceReady ? (
              <Ionicons name="call" size={13} color="rgba(255,255,255,0.76)" accessibilityLabel={t('find.canCall')} />
            ) : null}
          </View>
          {hook ? (
            <InkText variant="quote" color="rgba(255,255,255,0.80)" lines={2} style={styles.hook}>
              {hook}
            </InkText>
          ) : null}
        </View>
      </PressableScale>

      {/* Sibling glass pill — never nested inside the card Pressable (a11y + web). */}
      <PhotoGlassPill
        label={action}
        ios={friend ? 'bubble.left.fill' : undefined}
        icon={friend ? 'chatbubble' : undefined}
        iconSize={13}
        trailing={!friend ? <Ionicons name="arrow-forward" size={14} color={ink.text} /> : undefined}
        accessibilityLabel={`${action}, ${character.name}`}
        onPress={onAct}
        style={styles.button}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  wide: { position: 'absolute', top: 0, bottom: 0 },
  fallback: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: 28 },
  badges: {
    position: 'absolute',
    top: 12,
    left: 13,
    right: 13,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  relationBadge: {
    maxWidth: '76%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.photoBadge,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoBadgeRim,
  },
  relationDot: { width: 6, height: 6, borderRadius: 3 },
  badgeLabel: { flexShrink: 1 },
  newBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: inkRadius.pill,
    backgroundColor: NEW_FILL,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NEW_RIM,
  },
  words: {
    position: 'absolute',
    left: 16,
    right: '45%',
    bottom: 14,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1 },
  hook: { marginTop: 3, fontSize: 13.5, lineHeight: 19 },
  button: {
    position: 'absolute',
    right: 13,
    bottom: 13,
    maxWidth: '44%',
    minHeight: 36,
    paddingHorizontal: 13,
  },
});
