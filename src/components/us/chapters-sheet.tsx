import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { FACE_AT, portraitPosition, sceneFocus } from '@/components/chat/chat-ground';
import { InkText } from '@/components/ink';
import { CharacterAvatar, characterImage, PressableScale, SFIcon, Sheet } from '@/components/ui';
import { phrase } from '@/i18n';
import { localCharacter } from '@/i18n/content';
import { shortName } from '@/lib/format';
import { displayName } from '@/store/use-app-store';
import { friendAccent, friendColor } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';
import type { Character, Relationship } from '@/types';

const BANNER_ASPECT = 1.45;

export interface ChaptersSheetProps {
  visible: boolean;
  onClose: () => void;
  character: Character;
  relationship: Relationship;
  days: number;
  onOpenProfile?: () => void;
}

/**
 * Rich Ink Night+ Chapters & Closeness sheet opened from the Living Bond Hero's level pill:
 * shows a portrait banner lit by the friend's accent, exact intimacy/streak figures, and all
 * relationship story chapters (unlocked titles in the friend's hue, future chapters sealed by level).
 */
export function ChaptersSheet({
  visible,
  onClose,
  character,
  relationship,
  days,
  onOpenProfile,
}: ChaptersSheetProps) {
  const { t } = useTranslation();
  const accent = friendAccent(character.id);
  const shown = localCharacter(character);
  const full = displayName(character, relationship);
  const first = shortName(full);
  const relation = shown.relation ?? shown.worldRole ?? (character.series ? phrase(character.series) : undefined);
  const toNext = Math.max(0, relationship.nextLevelAt - relationship.intimacy);
  const beats = shown.arc?.beats ?? [];

  const tall = PORTRAITS[character.id];
  const wide = HEROES[character.id];
  const fallback = characterImage(character);

  return (
    <Sheet visible={visible} onClose={onClose} title={t('us.chaptersWith', { name: first })} scroll>
      <View style={styles.banner}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {tall != null ? (
            <View style={styles.bannerArt}>
              <Image
                source={tall}
                contentFit="cover"
                contentPosition={portraitPosition(character.id, BANNER_ASPECT, 0.5) ?? { left: '50%', top: '18%' }}
                style={styles.artImage}
                accessible={false}
              />
            </View>
          ) : wide != null ? (
            <Image
              source={wide}
              contentFit="cover"
              contentPosition={sceneFocus(character.id, 2.2, FACE_AT)}
              style={styles.artImage}
              accessible={false}
            />
          ) : fallback != null ? (
            <View style={styles.bannerArt}>
              <Image
                source={typeof fallback === 'string' ? { uri: fallback } : fallback}
                contentFit="cover"
                contentPosition={{ left: '50%', top: '20%' }}
                style={styles.artImage}
                accessible={false}
              />
            </View>
          ) : (
            <View style={[styles.bannerArt, styles.noArt]}>
              <LinearGradient
                colors={[`${friendColor(character.id).fill}88`, `${friendColor(character.id).fill}00`]}
                start={{ x: 1, y: 0.2 }}
                end={{ x: 0, y: 0.9 }}
                style={StyleSheet.absoluteFill}
              />
              <CharacterAvatar character={character} size={64} />
            </View>
          )}
          <LinearGradient colors={ink.bannerScrim} locations={ink.bannerScrimStops} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[`${accent.strong}38`, `${accent.strong}00`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.72, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.bannerBody}>
          {relation ? (
            <InkText variant="caption" color={accent.strong} lines={1}>
              {relation}
            </InkText>
          ) : null}
          <InkText variant="cardSmall" lines={1}>
            {`${t('us.level', { level: relationship.level })} · ${phrase(relationship.levelTitle)}`}
          </InkText>
          <InkText variant="footnote" color={ink.photoLine} style={styles.tabular}>
            {`${days} ${t('us.daysLabel', { count: days })} · ${t('us.intimacy', { count: relationship.intimacy })}`}
          </InkText>
          <InkText variant="caption" color={ink.photoMuted} style={styles.tabular}>
            {t('us.toLevel', { count: toNext, level: relationship.level + 1 })}
          </InkText>
        </View>
      </View>

      {beats.length > 0 ? (
        <View style={styles.list}>
          {beats.map((beat) => {
            const open = relationship.level >= beat.atLevel;
            return (
              <View
                key={beat.atLevel}
                style={[styles.chapterCard, open && { borderColor: accent.soft }]}>
                <View style={[styles.iconBox, { backgroundColor: open ? accent.soft : ink.raised }]}>
                  <SFIcon
                    ios={open ? 'key.fill' : 'lock.fill'}
                    icon={open ? 'key' : 'lock-closed'}
                    size={16}
                    color={open ? accent.strong : ink.text3}
                  />
                </View>
                <View style={styles.chapterText}>
                  <InkText variant={open ? 'subStrong' : 'sub'} color={open ? ink.text : ink.text2} lines={2}>
                    {open ? beat.title : t('world.level', { level: beat.atLevel })}
                  </InkText>
                  <InkText variant="footnote" color={open ? accent.strong : ink.text3}>
                    {open ? t('us.chapterOpen') : t('us.chapterLocked', { level: beat.atLevel })}
                  </InkText>
                </View>
                <View style={[styles.lvPill, { backgroundColor: open ? accent.soft : ink.raised }]}>
                  <InkText variant="caption" color={open ? accent.strong : ink.text3} style={styles.tabular}>
                    {`Lv ${beat.atLevel}`}
                  </InkText>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {onOpenProfile ? (
        <PressableScale
          scaleTo={0.98}
          onPress={() => {
            onClose();
            onOpenProfile();
          }}
          accessibilityRole="button"
          style={styles.profileRow}>
          <CharacterAvatar character={character} size={32} />
          <InkText variant="subStrong" style={styles.grow}>
            {full}
          </InkText>
          <Ionicons name="chevron-forward" size={16} color={ink.text3} />
        </PressableScale>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  tabular: { fontVariant: ['tabular-nums'] },
  banner: {
    minHeight: 118,
    borderRadius: inkRadius.field,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    justifyContent: 'center',
  },
  bannerArt: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '56%',
  },
  artImage: { ...StyleSheet.absoluteFill, opacity: 0.94 },
  noArt: { alignItems: 'center', justifyContent: 'center' },
  bannerBody: {
    padding: 16,
    maxWidth: '68%',
    gap: 3,
  },
  list: { marginTop: 12, gap: 10 },
  chapterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: inkRadius.field,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterText: { flex: 1, minWidth: 0, gap: 2 },
  lvPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: inkRadius.pill,
  },
  profileRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: inkRadius.field,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
});
