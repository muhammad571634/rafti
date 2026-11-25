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
import { colors, friendAccent, friendColor } from '@/theme';
import { ink, inkPeachGlass, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

const FOOT_H = 42;
const CALL_BADGE_PAD = 48;

export interface CinemaFeatureCardProps {
  character: Character;
  width: number;
  height: number;
  isNew: boolean;
  inChats?: boolean;
  onOpen: () => void;
  onSayHi: () => void;
  onCall?: () => void;
}

/** Formats a character's opening line as a clean editorial whisper, keeping existing quotes intact. */
function formatHook(text?: string): string | undefined {
  const clean = text?.replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  if (/^[“"«「]/.test(clean)) return clean;
  return `“${clean}”`;
}

/**
 * Spotlight Cinema Card for Find's top showcase: full-bleed character portrait with dark multi-stop
 * scrim, relation badge in friend's accent, sibling clear-glass Voice Call button, translucent
 * incoming DM hook bubble, and Tier-1 peach "Reply →" (or clear-glass "Continue →" if already in Chats).
 */
export const CinemaFeatureCard = memo(function CinemaFeatureCard({
  character,
  width,
  height,
  isNew,
  inChats = false,
  onOpen,
  onSayHi,
  onCall,
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
  const accent = friendAccent(character.id);
  const canCall = Boolean(character.voiceReady && onCall);

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
          colors={ink.photoScrim}
          locations={ink.photoScrimStops}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {badge || isNew ? (
          <View style={[styles.badges, canCall && styles.badgesClearCall]}>
            {badge ? (
              <View style={styles.relationBadge}>
                <InkText variant="caption" color={accent.strong} lines={1}>
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
            <View style={styles.hookBubble}>
              <InkText variant="quote" color={ink.photoLine} lines={3}>
                {hook}
              </InkText>
            </View>
          ) : null}
        </View>
      </PressableScale>

      {canCall && onCall ? (
        <View pointerEvents="box-none" style={styles.topCallWrap}>
          <PhotoGlassPill
            ios="phone.fill"
            icon="call"
            iconSize={15}
            accessibilityLabel={`${t('characterProfile.call')}, ${character.name}`}
            onPress={onCall}
            style={styles.callCircle}
          />
        </View>
      ) : null}

      {/* Sibling overlay so interactive CTAs are never nested inside the card button (a11y + web). */}
      <View pointerEvents="box-none" style={styles.footRow}>
        <View pointerEvents="none" style={styles.seriesWrap}>
          {character.series ? (
            <InkText variant="footnote" color={ink.photoMuted} lines={1}>
              {phrase(character.series)}
            </InkText>
          ) : null}
        </View>
        {inChats ? (
          <PhotoGlassPill
            label={t('find.continueChat')}
            trailing={<Ionicons name="arrow-forward" size={14} color={ink.text} />}
            accessibilityLabel={`${t('find.continueChat')}, ${character.name}`}
            onPress={onSayHi}
            style={styles.actionPill}
          />
        ) : (
          <PressableScale
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityLabel={`${t('find.reply')}, ${character.name}`}
            onPress={onSayHi}
            style={styles.replyPill}>
            <LinearGradient colors={inkPeachGlass.ctaFill} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <InkText variant="subStrong" color={inkPeachGlass.ctaText} lines={1}>
              {t('find.reply')}
            </InkText>
            <Ionicons name="arrow-forward" size={14} color={inkPeachGlass.ctaText} />
          </PressableScale>
        )}
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
  badgesClearCall: { right: 14 + CALL_BADGE_PAD },
  relationBadge: {
    maxWidth: '100%',
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
    backgroundColor: ink.photoBadge,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.tintRim,
  },
  topCallWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  callCircle: {
    minHeight: 36,
    width: 36,
    paddingHorizontal: 0,
  },
  copy: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14 + FOOT_H + 10,
    gap: 6,
  },
  hookBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: inkRadius.chip,
    borderCurve: 'continuous',
    backgroundColor: ink.photoBubble,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoBadgeRim,
  },
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
  actionPill: { minHeight: 38, paddingHorizontal: 15 },
  replyPill: {
    minHeight: 38,
    paddingHorizontal: 15,
    borderRadius: inkRadius.pill,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: inkPeachGlass.ctaRim,
  },
});
