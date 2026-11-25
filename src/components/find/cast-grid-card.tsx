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
import { localCharacter } from '@/i18n/content';
import { shortName } from '@/lib/format';
import { colors, friendAccent, friendColor } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

export interface CastGridCardProps {
  character: Character;
  width: number;
  inChats?: boolean;
  onOpen: () => void;
  onCall?: () => void;
}

/**
 * 2-column cinema portrait card for Find's "Meet the cast" and "People" grid: full-bleed portrait,
 * top relation badge, sibling clear-glass Call button, serif name + 2-line greeting, and "✓ In Chats"
 * or "Say hi →" status cue at the foot.
 */
export const CastGridCard = memo(function CastGridCard({
  character,
  width,
  inChats = false,
  onOpen,
  onCall,
}: CastGridCardProps) {
  const { t } = useTranslation();
  const [broken, setBroken] = useState(false);

  const height = Math.round(width * 1.28);
  const shown = localCharacter(character);
  const badge = shown.relation ?? shown.worldRole;
  const hero = HEROES[character.id];
  const rawSource = hero ?? PORTRAITS[character.id] ?? characterImage(character);
  const source = broken ? undefined : rawSource;
  const hue = friendColor(character.id);
  const accent = friendAccent(character.id);
  const canCall = Boolean(character.voiceReady && onCall);

  return (
    <View style={[styles.card, { width, height }]}>
      <PressableScale
        scaleTo={0.97}
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
            <CharacterAvatar character={character} size={76} />
          </View>
        )}

        <LinearGradient
          colors={ink.photoScrim}
          locations={ink.photoScrimStops}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {badge ? (
          <View style={[styles.badgeWrap, canCall && styles.badgeClearCall]}>
            <View style={styles.badge}>
              <InkText variant="tag" color={accent.strong} lines={1}>
                {badge}
              </InkText>
            </View>
          </View>
        ) : null}

        <View style={styles.foot}>
          <InkText variant="cardSmall" color={colors.onMedia} lines={1}>
            {shortName(character.name)}
          </InkText>
          {shown.greeting ? (
            <InkText variant="footnote" color={ink.photoLine} lines={2}>
              {`“${shown.greeting}”`}
            </InkText>
          ) : null}
          <View style={styles.statusRow}>
            {inChats ? (
              <>
                <Ionicons name="checkmark" size={12} color={ink.accent} />
                <InkText variant="caption" color={ink.accent} lines={1}>
                  {t('find.inChats')}
                </InkText>
              </>
            ) : (
              <InkText variant="caption" color={ink.photoLine} lines={1}>
                {`${t('find.sayHi')} →`}
              </InkText>
            )}
          </View>
        </View>
      </PressableScale>

      {canCall && onCall ? (
        <View pointerEvents="box-none" style={styles.callWrap}>
          <PhotoGlassPill
            ios="phone.fill"
            icon="call"
            iconSize={13}
            accessibilityLabel={`${t('characterProfile.call')}, ${character.name}`}
            onPress={onCall}
            style={styles.callBtn}
          />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: inkRadius.row,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  fallback: { alignItems: 'center', justifyContent: 'center', paddingBottom: 48 },
  badgeWrap: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    alignItems: 'flex-start',
  },
  badgeClearCall: { right: 48 },
  badge: {
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.photoBadge,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoBadgeRim,
  },
  callWrap: { position: 'absolute', top: 9, right: 9 },
  callBtn: { minHeight: 30, width: 30, paddingHorizontal: 0 },
  foot: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    gap: 3,
  },
  statusRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
