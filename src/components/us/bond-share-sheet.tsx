import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ShareCardSheet, ShareLevelPill } from '@/components/share-card-sheet';
import { CharacterAvatar, SFIcon, Txt, UserAvatar } from '@/components/ui';
import { phrase } from '@/i18n';
import { shortName } from '@/lib/format';
import { displayName, useAppStore } from '@/store/use-app-store';
import { aurora, colors, radius, space } from '@/theme';
import type { Character, Relationship } from '@/types';

const FACE = 64;
const HEART = 26;

/**
 * Share on Us (owner's streak-card prototype, 2026-10-30, as direction): you and them face to
 * face with a mint heart between, how many days together in the Today hero's big figure, the
 * level, and the three figures the Us card shows (intimacy, day streak, first met) on a white
 * panel. Only what the app really counts: no rank or "top %", no reward for sharing.
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
  const about = [character.series ? phrase(character.series) : null, t('chat.aiCharacter')].filter(Boolean).join(' · ');
  const together = `${days} ${t('us.daysLabel', { count: days })}`;
  const level = `${t('closeness.level', { level: relationship.level })} · ${phrase(relationship.levelTitle)}`;
  const met = new Date(relationship.anniversary).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });

  return (
    <ShareCardSheet
      visible={visible}
      onClose={onClose}
      hint={t('us.shareHint', { name })}
      fallback={[`${pair}: ${together}`, level, t('app.name')].join('\n\n')}>
      <View style={styles.head}>
        <View style={styles.faces}>
          <UserAvatar user={user} size={FACE} />
          <CharacterAvatar character={character} size={FACE} style={styles.overlap} />
          <View style={styles.heart}>
            <SFIcon ios="heart.fill" icon="heart" size={13} color={colors.bond} />
          </View>
        </View>
        <Txt variant="title" center lines={1}>
          {pair}
        </Txt>
        <Txt variant="caption" color={aurora.textMuted} center lines={1}>
          {about}
        </Txt>
        <View style={styles.daysLine}>
          <Txt variant="heroFigure" style={styles.figure}>
            {days}
          </Txt>
          <Txt variant="heroUnit">{t('us.daysLabel', { count: days })}</Txt>
        </View>
        <ShareLevelPill level={relationship.level} title={relationship.levelTitle} />
      </View>

      {/* Content on the aurora stays solid (design-style §1): the Us card's three figures. */}
      <View style={styles.panel}>
        <Stat value={String(relationship.intimacy)} label={t('us.statIntimacy')} />
        <Stat value={String(relationship.streakDays)} label={t('us.statStreak')} divided />
        <Stat value={met} label={t('us.statMet')} />
      </View>
    </ShareCardSheet>
  );
}

function Stat({ value, label, divided }: { value: string; label: string; divided?: boolean }) {
  return (
    <View style={[styles.stat, divided && styles.statDivided]}>
      <Txt style={styles.statValue}>{value}</Txt>
      <Txt variant="caption" color={colors.textSecondary} lines={1}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 3, paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.lg },
  faces: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  overlap: { marginLeft: -space.md },
  // A white coin on the seam between the two faces.
  heart: {
    position: 'absolute',
    left: FACE - space.md / 2 - HEART / 2,
    bottom: -space.xxs,
    width: HEART,
    height: HEART,
    borderRadius: HEART / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  daysLine: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.sm, marginBottom: space.xs },
  figure: { fontVariant: ['tabular-nums'] },
  panel: {
    flexDirection: 'row',
    marginHorizontal: space.md,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: space.xs },
  statDivided: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: aurora.separator,
  },
  statValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'], color: colors.text },
});
