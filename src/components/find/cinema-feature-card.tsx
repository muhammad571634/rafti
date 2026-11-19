import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { portraitPosition } from '@/components/chat/chat-ground';
import { InkText, PhotoGlassPill } from '@/components/ink';
import { CharacterAvatar, characterImage, PressableScale } from '@/components/ui';
import { phrase } from '@/i18n';
import { localCharacter } from '@/i18n/content';
import { colors, friendColor } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

const CARD_SCRIM = ['rgba(9,9,13,0.28)', 'rgba(9,9,13,0)', 'rgba(9,9,13,0.34)', 'rgba(9,9,13,0.92)'] as const;
const CARD_SCRIM_STOPS = [0, 0.24, 0.56, 1] as const;
const NEW_FILL = 'rgba(235,173,132,0.22)';
const NEW_RIM = 'rgba(235,173,132,0.44)';
const FOOT_H = 42;

export interface CinemaFeatureCardProps {
  character: Character;
  width: number;
  height: number;
  isNew: boolean;
  onOpen: () => void;
  onSayHi: () => void;
}

/** Formats a character's opening line as a clean editorial whisper, keeping existing quotes intact. */
function formatHook(text?: string): string | undefined {
  const clean = text?.replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  if (/^[“"«「]/.test(clean)) return clean;
  return `“${clean}”`;
}

/**
 * Cinema Story Card for Find's featured carousel (approved Ink+ prototype): full-bleed character
 * art with a multi-stop scrim, relation & "New" badges on top, serif name + whispered Cast 2.0
 * opening line at the bottom, and a reusable clear-glass "Say hi →" pill as a sibling button.
 */
export const CinemaFeatureCard = memo(function CinemaFeatureCard({
  character,
  width,
  height,
  isNew,
  onOpen,
  onSayHi,
}: CinemaFeatureCardProps) {
  const { t } = useTranslation();
  const [broken, setBroken] = useState(false);

  const shown = localCharacter(character);
  const badge = shown.relation ?? shown.worldRole;
  const hook = formatHook(shown.greeting);
  const hero = HEROES[character.id];
  const rawSource = hero ?? PORTRAITS[character.id] ?? characterImage(character);
  const source = broken ? undefined : rawSource;
  const hue = friendColor(character.id);

  return (
    <View style={[styles.card, { width, height }]}>
      <PressableScale
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={[character.name, badge, shown.greeting].filter(Boolean).join(', ')}
        onPress={onOpen}
        style={StyleSheet.absoluteFill}>
        {source != null ? (
          <Image
            source={typeof source === 'string' ? { uri: source } : source}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={hero ? undefined : (portraitPosition(character.id, width / height) ?? { left: '50%', top: '18%' })}
            transition={150}
            onError={() => setBroken(true)}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallback, { backgroundColor: hue.fill }]}>
            <CharacterAvatar character={character} size={108} />
          </View>
        )}

        <LinearGradient
          colors={CARD_SCRIM}
          locations={CARD_SCRIM_STOPS}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {badge || isNew ? (
          <View style={styles.badges}>
            {badge ? (
              <View style={styles.relationBadge}>
                <InkText variant="caption" color={ink.text} lines={1}>
                  {badge}
                </InkText>
              </View>
            ) : null}
            {isNew ? (
              <View style={styles.newBadge}>
                <InkText variant="caption" color={ink.accent} lines={1}>
                  {t('find.newBadge')}
                </InkText>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.copy}>
          <InkText variant="title" color={colors.onMedia} lines={1} adjustsFontSizeToFit minimumFontScale={0.74}>
            {character.name}
          </InkText>
          {hook ? (
            <InkText variant="quote" color="rgba(255,255,255,0.84)" lines={2} style={styles.hook}>
              {hook}
            </InkText>
          ) : null}
        </View>
      </PressableScale>

      {/* Sibling overlay so the Say hi button is never nested inside the card button (a11y + web). */}
      <View pointerEvents="box-none" style={styles.footRow}>
        <View pointerEvents="none" style={styles.seriesWrap}>
          {character.series ? (
            <InkText variant="footnote" color="rgba(255,255,255,0.60)" lines={1}>
              {phrase(character.series)}
            </InkText>
          ) : null}
        </View>
        <PhotoGlassPill
          label={t('find.sayHi')}
          trailing={<Ionicons name="arrow-forward" size={14} color={ink.text} />}
          accessibilityLabel={`${t('find.sayHi')}, ${character.name}`}
          onPress={onSayHi}
          style={styles.sayHi}
        />
      </View>
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
  fallback: { alignItems: 'center', justifyContent: 'center', paddingBottom: 72 },
  badges: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  relationBadge: {
    maxWidth: '78%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.photoBadge,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoBadgeRim,
  },
  newBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: inkRadius.pill,
    backgroundColor: NEW_FILL,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NEW_RIM,
  },
  copy: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14 + FOOT_H + 10,
  },
  hook: { marginTop: 4 },
  footRow: {
    position: 'absolute',
    left: 16,
    right: 14,
    bottom: 14,
    minHeight: FOOT_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  seriesWrap: { flex: 1, minWidth: 0 },
  sayHi: { minHeight: 38, paddingHorizontal: 15 },
});
