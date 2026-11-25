import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { FACE_AT, portraitPosition, sceneFocus } from '@/components/chat/chat-ground';
import { InkEm, InkText, PhotoGlassPill } from '@/components/ink';
import { CharacterAvatar, characterImage, PressableScale, SFIcon, ShellIcon } from '@/components/ui';
import { phrase } from '@/i18n';
import { localCharacter } from '@/i18n/content';
import { shortName } from '@/lib/format';
import { displayName } from '@/store/use-app-store';
import { friendAccent, friendColor, hitSlop } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';
import type { Character, Relationship } from '@/types';

const SIDE_SCRIM = ['#13131A', 'rgba(19,19,26,0.90)', 'rgba(19,19,26,0.28)', 'rgba(19,19,26,0.10)'] as const;
const SIDE_STOPS = [0, 0.4, 0.72, 1] as const;
const FOOT_SCRIM = ['rgba(9,9,13,0)', 'rgba(9,9,13,0.88)'] as const;
const FOOT_STOPS = [0.48, 1] as const;
/** Aspect ratio of the right-side portrait box (~62% card width over ~222 pt height). */
const ART_ASPECT = 0.97;
/** A friend without a picture: the size of their initial on the card's right. */
const NO_ART_FACE = 72;

export interface LivingBondHeroProps {
  character: Character;
  relationship: Relationship;
  days: number;
  /** Fraction toward the next level (0..1). */
  progress: number;
  /** Today's shell reward for sharing this bond card (0 if already claimed). */
  reward: number;
  canChat: boolean;
  onOpenChat: () => void;
  onOpenChapters?: () => void;
  onCall?: () => void;
  onShare: () => void;
}

/**
 * The Living Bond Hero on Us (Us v3): the friend stands clear on the trailing right side with a
 * directional obsidian scrim and a quiet wash of their own accent, tappable level/chapters pill on
 * top, emotional serif days headline on the left, a hairline closeness bar, and clear dark-glass
 * Message + Call + Share actions below.
 */
export function LivingBondHero({
  character,
  relationship,
  days,
  progress,
  reward,
  canChat,
  onOpenChat,
  onOpenChapters,
  onCall,
  onShare,
}: LivingBondHeroProps) {
  const { t, i18n } = useTranslation();
  const accent = friendAccent(character.id);
  const full = displayName(character, relationship);
  const first = shortName(full);
  const met = new Date(relationship.anniversary).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
  const toNext = Math.max(0, relationship.nextLevelAt - relationship.intimacy);

  const shown = localCharacter(character);
  const beats = shown.arc?.beats ?? [];
  const openBeats = beats.filter((b) => relationship.level >= b.atLevel).length;

  const clamped = Math.max(0, Math.min(1, progress));
  const still = useReducedMotion();
  const [trackW, setTrackW] = useState(0);
  const fill = useSharedValue(clamped);
  useEffect(() => {
    fill.value = still ? clamped : withTiming(clamped, { duration: 280 });
  }, [clamped, still, fill]);
  const fillStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: -(1 - Math.max(0, Math.min(1, fill.value))) * trackW }],
    }),
    [trackW],
  );

  const tall = PORTRAITS[character.id];
  const wide = HEROES[character.id];
  const fallback = characterImage(character);
  const levelPill = `${t('home.hero.level', { level: relationship.level })} · ${phrase(relationship.levelTitle)}`;
  const shareA11y = `${t('common.share')}, ${days} ${t('us.daysLabel', { count: days })}${reward > 0 ? `, +${reward} ${t('common.shells')}` : ''}`;

  const levelPillContent = (
    <>
      <InkText variant="caption" color={ink.text} lines={1} style={[styles.levelText, styles.tabular]}>
        {levelPill}
      </InkText>
      {beats.length > 0 ? (
        <InkText variant="caption" color={accent.strong} lines={1} style={styles.tabular}>
          {`· ${openBeats}/${beats.length}`}
        </InkText>
      ) : null}
      {onOpenChapters ? <Ionicons name="chevron-forward" size={12} color={accent.strong} /> : null}
    </>
  );

  return (
    <View style={styles.card}>
      {/* Friend portrait on the trailing right side (standing rule: character right, copy left). */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {tall != null ? (
          <View style={styles.artRight}>
            <Image
              source={tall}
              contentFit="cover"
              contentPosition={portraitPosition(character.id, ART_ASPECT, 0.5) ?? { left: '50%', top: '18%' }}
              style={styles.artImage}
              accessible={false}
            />
          </View>
        ) : wide != null ? (
          <Image
            source={wide}
            contentFit="cover"
            contentPosition={sceneFocus(character.id, 1.6, FACE_AT)}
            style={styles.artImage}
            accessible={false}
          />
        ) : fallback != null ? (
          <View style={styles.artRight}>
            <Image
              source={typeof fallback === 'string' ? { uri: fallback } : fallback}
              contentFit="cover"
              contentPosition={{ left: '50%', top: '20%' }}
              style={styles.artImage}
              accessible={false}
            />
          </View>
        ) : (
          <View style={[styles.artRight, styles.noArt]}>
            <LinearGradient
              colors={[`${friendColor(character.id).fill}88`, `${friendColor(character.id).fill}00`]}
              start={{ x: 1, y: 0.2 }}
              end={{ x: 0, y: 0.9 }}
              style={StyleSheet.absoluteFill}
            />
            <CharacterAvatar character={character} size={NO_ART_FACE} />
          </View>
        )}

        {/* Layered scrims + quiet ambient wash of the friend's accent (no blur: 60 fps on A51). */}
        <LinearGradient colors={SIDE_SCRIM} locations={SIDE_STOPS} start={{ x: 0, y: 0.45 }} end={{ x: 1, y: 0.55 }} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[`${accent.strong}40`, `${accent.strong}14`, `${accent.strong}00`]}
          locations={[0, 0.38, 0.72]}
          start={{ x: 0.08, y: 0.05 }}
          end={{ x: 0.78, y: 0.75 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient colors={FOOT_SCRIM} locations={FOOT_STOPS} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>

      <View style={styles.body}>
        <View style={styles.topSection}>
          {/* Kept outside the chat PressableScale so VoiceOver and TalkBack never encounter nested buttons. */}
          <View style={styles.badges}>
            {onOpenChapters ? (
              <PressableScale
                scaleTo={0.95}
                hitSlop={hitSlop}
                haptic
                accessibilityRole="button"
                accessibilityLabel={
                  beats.length > 0
                    ? `${levelPill}, ${openBeats}/${beats.length}, ${t('us.chaptersTitle')}`
                    : `${levelPill}, ${t('us.chaptersTitle')}`
                }
                onPress={onOpenChapters}
                style={styles.levelBadge}>
                {levelPillContent}
              </PressableScale>
            ) : (
              <View style={styles.levelBadge}>{levelPillContent}</View>
            )}
            {relationship.streakDays > 0 ? (
              <View style={styles.streakBadge}>
                <SFIcon ios="flame.fill" icon="flame" size={12} color={ink.streakText} />
                <InkText variant="caption" color={ink.streakText} lines={1} style={styles.tabular}>
                  {relationship.streakDays}
                </InkText>
              </View>
            ) : null}
          </View>

          <PressableScale
            scaleTo={0.99}
            disabled={!canChat}
            accessibilityRole="button"
            accessibilityLabel={`${full}, ${t('us.level', { level: relationship.level })}, ${days} ${t('us.daysLabel', { count: days })}`}
            onPress={onOpenChat}>
            <View style={styles.headline}>
              <InkText variant="numeralSmall" lines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                {`${days} ${t('us.daysShort', { count: days })}`}
              </InkText>
              <InkText variant="cardSmall" lines={1} style={styles.withLine}>
                <InkEm color={accent.strong}>{t('us.withFriend', { name: first })}</InkEm>
              </InkText>

              <View style={styles.track} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
                {trackW > 0 ? (
                  <Animated.View style={[styles.fill, { width: trackW, backgroundColor: accent.strong }, fillStyle]} />
                ) : null}
              </View>

              <InkText variant="footnote" color={ink.photoLine} style={[styles.meta, styles.tabular]}>
                {`${t('us.toLevel', { count: toNext, level: relationship.level + 1 })} · ${t('us.metOn', { date: met })}`}
              </InkText>
            </View>
          </PressableScale>
        </View>

        <View style={styles.actions}>
          <PhotoGlassPill
            flex
            ios="bubble.left.fill"
            icon="chatbubble-outline"
            label={t('us.messageFriend', { name: first })}
            disabled={!canChat}
            onPress={onOpenChat}
          />
          {onCall ? (
            <PhotoGlassPill
              haptic
              ios="phone.fill"
              icon="call-outline"
              disabled={!character.voiceReady}
              accessibilityLabel={t('characterProfile.call')}
              onPress={onCall}
              style={styles.callPill}
            />
          ) : null}
          <PhotoGlassPill
            haptic
            ios="square.and.arrow.up"
            icon="share-outline"
            label={reward > 0 ? undefined : t('common.share')}
            trailing={
              reward > 0 ? (
                <View style={styles.reward}>
                  <InkText variant="caption" color={ink.accent} style={styles.tabular}>
                    {`+${reward}`}
                  </InkText>
                  <ShellIcon size={12} />
                </View>
              ) : undefined
            }
            accessibilityLabel={shareA11y}
            onPress={onShare}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: inkGutter,
    marginTop: 12,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    minHeight: 222,
  },
  artRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '62%',
  },
  artImage: { ...StyleSheet.absoluteFill, opacity: 0.92 },
  // No picture: their initial sits at the trailing edge, clear of the words and the bar on the left
  // (centred in the art box it covered the progress bar, A51 2026-11-25).
  noArt: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: 22 },
  body: {
    padding: 18,
    justifyContent: 'space-between',
    gap: 16,
  },
  topSection: { gap: 0 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    maxWidth: '78%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.photoBadge,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoBadgeRim,
  },
  levelText: { flexShrink: 1 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.streakFill,
  },
  headline: {
    marginTop: 14,
    maxWidth: '68%',
  },
  withLine: { marginTop: 1 },
  track: {
    height: 6,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.hairlineFill,
    overflow: 'hidden',
    marginTop: 12,
  },
  fill: {
    height: '100%',
    borderRadius: inkRadius.pill,
  },
  meta: { marginTop: 7 },
  tabular: { fontVariant: ['tabular-nums'] },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callPill: {
    width: 42,
    paddingHorizontal: 0,
  },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
