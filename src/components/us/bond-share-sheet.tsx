import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { Ionicons } from '@expo/vector-icons';
import type { SFSymbol } from 'sf-symbols-typescript';

import { ShareCardSheet } from '@/components/share-card-sheet';
import { CharacterAvatar, SFIcon, Txt, UserAvatar } from '@/components/ui';
import { shortName } from '@/lib/format';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, radius, space, systemColors } from '@/theme';
import type { Character, Relationship } from '@/types';

const FACE = 72;
const RING = 3;
const HEART = 28;
const TILE = 34;

/**
 * Share on Us (owner's streak-card prototype, 2026-10-30, as direction): you and them face to face
 * with a mint heart between and your names, then how many days together, big, and the three figures
 * the Us card shows (intimacy, day streak, first met), each under its own colour glyph as Us draws
 * its moments, on a white panel. Owner: no big photo, no world, AI or level line; only what the app
 * really counts (no rank or "top %").
 */
export function BondShareSheet({
  visible,
  onClose,
  character,
  relationship,
  days,
}: {
  visible: boolean;
  onClose: () => void;
  character: Character;
  relationship: Relationship;
  days: number;
}) {
  const { t, i18n } = useTranslation();
  const user = useAppStore((s) => s.user);
  const name = shortName(displayName(character, relationship));
  // The title's "&" as it is, as groups write it: an English "and" reads wrong in other languages.
  const pair = user.displayName ? `${user.displayName} & ${name}` : name;
  const together = `${days} ${t('us.daysLabel', { count: days })}`;
  const met = new Date(relationship.anniversary).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });

  return (
    <ShareCardSheet
      visible={visible}
      onClose={onClose}
      hint={t('us.shareHint', { name })}
      fallback={[`${pair}: ${together}`, t('app.name')].join('\n\n')}>
      <View style={styles.head}>
        <View style={styles.faces}>
          <View style={styles.ring}>
            <UserAvatar user={user} size={FACE} />
          </View>
          <View style={[styles.ring, styles.overlap]}>
            <CharacterAvatar character={character} size={FACE} />
          </View>
          <View style={styles.heart}>
            <SFIcon ios="heart.fill" icon="heart" size={14} color={colors.bond} />
          </View>
        </View>
        <Txt variant="title" center lines={1}>
          {pair}
        </Txt>
        {/* The milestone itself, as big as the card allows. */}
        <Txt variant="heroFigure" style={styles.days}>
          {days}
        </Txt>
        <Txt variant="heroUnit" center>
          {t('us.daysLabel', { count: days })}
        </Txt>
      </View>

      {/* Content on the aurora stays solid (design-style §1): the Us card's three figures. */}
      <View style={styles.panel}>
        <Stat ios="heart.fill" icon="heart" fill={colors.bond} value={String(relationship.intimacy)} label={t('us.statIntimacy')} />
        <Stat ios="flame.fill" icon="flame" fill={systemColors.orange} value={String(relationship.streakDays)} label={t('us.statStreak')} />
        <Stat ios="sparkles" icon="sparkles" fill={systemColors.purple} value={met} label={t('us.statMet')} />
      </View>
    </ShareCardSheet>
  );
}

/** One figure under its glyph: a system-colour circle with a white symbol, as Us draws its moments. */
function Stat({
  ios,
  icon,
  fill,
  value,
  label,
}: {
  ios: SFSymbol;
  icon: keyof typeof Ionicons.glyphMap;
  fill: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={[styles.tile, { backgroundColor: fill }]}>
        <SFIcon ios={ios} icon={icon} size={16} color={colors.white} />
      </View>
      <Txt style={styles.statValue}>{value}</Txt>
      <Txt variant="caption" color={colors.textSecondary} lines={1}>
        {label}
      </Txt>
    </View>
  );
}

const SIZE = FACE + RING * 2;

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 3, paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.lg },
  faces: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  // A white ring lifts each face off the aurora.
  ring: { padding: RING, borderRadius: radius.pill, backgroundColor: colors.surface },
  overlap: { marginLeft: -space.lg },
  // A white coin on the seam between the two faces.
  heart: {
    position: 'absolute',
    left: SIZE - space.lg / 2 - HEART / 2,
    bottom: -space.xxs,
    width: HEART,
    height: HEART,
    borderRadius: HEART / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  // The Today hero's figure face, nearly twice its size.
  days: { marginTop: space.sm, fontSize: 80, lineHeight: 86, fontVariant: ['tabular-nums'] },
  panel: {
    flexDirection: 'row',
    marginHorizontal: space.md,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: space.xs },
  tile: { width: TILE, height: TILE, borderRadius: TILE / 2, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  statValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'], color: colors.text },
});
