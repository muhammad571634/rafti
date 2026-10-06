import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Card,
  CharacterAvatar,
  Divider,
  EmptyState,
  IconTile,
  ListRow,
  PressableScale,
  Screen,
  SectionLabel,
  Txt,
  UserAvatar,
} from '@/components/ui';
import { daysBetween, relativeStamp } from '@/lib/format';
import { dateFromKey, levelForIntimacy, todayKey } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, radius, space, TAB_BAR_HEIGHT } from '@/theme';
import type { MomentKind } from '@/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const MOMENT_PAGE = 20;
const ROW_ICON = 38;
const ROW_INSET = space.lg + ROW_ICON + space.md;

const MOMENT_ICON: Record<MomentKind, IoniconName> = {
  met: 'sparkles-outline',
  levelUp: 'heart-outline',
  call: 'call-outline',
  diary: 'book-outline',
  secretNote: 'mail-outline',
  dating: 'cafe-outline',
  photo: 'camera-outline',
};

/** [Us]: one bond at a time — how long, how close, what's next and what you've shared. */
export default function UsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const user = useAppStore((s) => s.user);
  const relationships = useAppStore((s) => s.relationships);
  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const moments = useAppStore((s) => s.moments);
  const schedules = useAppStore((s) => s.schedules);
  const removeSchedule = useAppStore((s) => s.removeSchedule);

  const bonds = useMemo(
    () =>
      characters
        .filter((c) => relationships[c.id] && conversations.some((conv) => conv.characterId === c.id))
        .map((character) => ({ character, relationship: relationships[character.id] }))
        .sort((a, b) => b.relationship.intimacy - a.relationship.intimacy),
    [characters, relationships, conversations],
  );

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const selected = bonds.find((b) => b.character.id === selectedId) ?? bonds[0];
  // Moments pile up for as long as a bond lasts; render them a page at a time.
  const [momentLimit, setMomentLimit] = useState({ id: selected?.character.id, count: MOMENT_PAGE });
  const visibleMoments = momentLimit.id === selected?.character.id ? momentLimit.count : MOMENT_PAGE;

  const timeline = useMemo(
    () =>
      moments
        .filter((m) => m.characterId === selected?.character.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [moments, selected],
  );

  const today = todayKey();
  const upcoming = useMemo(
    () =>
      schedules
        .filter((x) => x.characterId === selected?.character.id && x.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [schedules, selected, today],
  );

  if (!selected) {
    return (
      <Screen background={colors.bgPlain}>
        <Txt variant="h1" style={styles.head}>
          {t('us.title')}
        </Txt>
        <EmptyState
          title={t('us.noRelationships')}
          hint={t('us.noRelationshipsHint')}
          actionLabel={t('find.title')}
          onAction={() => router.push('/(tabs)/find')}
        />
      </Screen>
    );
  }

  const { character, relationship } = selected;
  const { progress } = levelForIntimacy(relationship.intimacy);
  const conversation = conversations.find((c) => c.characterId === character.id);
  const days = daysBetween(relationship.anniversary) + 1;
  const shownMoments = timeline.slice(0, visibleMoments);

  return (
    <Screen background={colors.bgPlain}>
      <Txt variant="h1" style={styles.head}>
        {t('us.title')}
      </Txt>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + space.xxl }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
          {bonds.map(({ character: c, relationship: r }) => {
            const active = c.id === character.id;
            return (
              <PressableScale
                key={c.id}
                style={styles.pick}
                scaleTo={0.94}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setSelectedId(c.id)}>
                <CharacterAvatar character={c} size={50} ring={active} ringColor={colors.text} />
                <Txt
                  variant="tiny"
                  lines={1}
                  color={active ? colors.text : colors.textMuted}
                  style={active && styles.pickActive}>
                  {displayName(c, r)}
                </Txt>
              </PressableScale>
            );
          })}
        </ScrollView>

        <Card
          variant="outlined"
          style={styles.hero}
          onPress={conversation ? () => router.push(`/chat/${conversation.id}`) : undefined}>
          <View style={styles.together}>
            <View style={styles.pair}>
              <UserAvatar user={user} size={40} />
              <CharacterAvatar character={character} size={40} ring ringColor={colors.surface} style={styles.overlap} />
            </View>
            <Txt variant="display">{days}</Txt>
            <Txt variant="small" color={colors.textMuted}>
              {t('us.daysLabel', { count: days })}
            </Txt>
          </View>

          <View style={styles.levelRow}>
            <Txt variant="smallStrong" style={styles.grow}>
              {t('characterProfile.levelLine', { level: relationship.level, title: relationship.levelTitle })}
            </Txt>
            <Txt variant="caption" color={colors.textMuted}>
              {t('characterProfile.progress', { current: relationship.intimacy, next: relationship.nextLevelAt })}
            </Txt>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.round(progress * 100))}%` }]} />
          </View>

          <View style={styles.stats}>
            <Stat value={String(relationship.intimacy)} label={t('us.statIntimacy')} />
            <Stat value={String(relationship.streakDays)} label={t('us.statStreak')} divided />
            <Stat
              value={new Date(relationship.anniversary).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
              label={t('us.statMet')}
            />
          </View>
        </Card>

        <SectionLabel title={t('us.upcoming')} />
        {upcoming.length === 0 ? (
          <ListRow
            title={t('us.nothingPlanned')}
            subtitle={t('us.upcomingHint')}
            left={<IconTile icon="calendar-outline" size={ROW_ICON} />}
          />
        ) : (
          upcoming.map((item, i) => (
            <View key={item.id}>
              {i > 0 ? <Divider inset={ROW_INSET} /> : null}
              <ListRow
                title={item.title}
                subtitle={item.date === today ? t('common.today') : relativeDay(item.date, t, i18n.language)}
                left={<DateTile dateKey={item.date} locale={i18n.language} />}
                right={
                  <PressableScale
                    hitSlop={hitSlop}
                    scaleTo={0.85}
                    accessibilityLabel={t('a11y.removePlan')}
                    onPress={() => removeSchedule(item.id)}>
                    <Ionicons name="close-circle-outline" size={20} color={colors.textFaint} />
                  </PressableScale>
                }
              />
            </View>
          ))
        )}

        <SectionLabel title={t('us.moments')} />
        {timeline.length === 0 ? (
          <Txt variant="small" color={colors.textMuted} style={styles.hint}>
            {t('us.noMoments')}
          </Txt>
        ) : (
          shownMoments.map((moment, i) => (
            <View key={moment.id}>
              {i > 0 ? <Divider inset={ROW_INSET} /> : null}
              <ListRow
                title={t(`us.momentText.${moment.kind}`, moment.params ?? {})}
                meta={relativeStamp(moment.createdAt)}
                left={<IconTile icon={MOMENT_ICON[moment.kind]} size={ROW_ICON} />}
              />
            </View>
          ))
        )}
        {timeline.length > visibleMoments ? (
          <PressableScale
            style={styles.showMore}
            scaleTo={1}
            onPress={() => setMomentLimit({ id: selected.character.id, count: visibleMoments + MOMENT_PAGE })}>
            <Txt variant="smallStrong" color={colors.textSecondary}>
              {t('us.showMore', { count: Math.min(MOMENT_PAGE, timeline.length - visibleMoments) })}
            </Txt>
          </PressableScale>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function relativeDay(key: string, t: (k: string) => string, locale: string) {
  const days = Math.round((dateFromKey(key).getTime() - dateFromKey(todayKey()).getTime()) / 86_400_000);
  if (days === 1) return t('common.tomorrow');
  return dateFromKey(key).toLocaleDateString(locale, { weekday: 'long' });
}

/** A plan's date as a small calendar leaf, the same size as an IconTile. */
function DateTile({ dateKey, locale }: { dateKey: string; locale: string }) {
  const date = dateFromKey(dateKey);
  return (
    <View style={styles.dateTile}>
      <Txt variant="tiny" color={colors.textMuted}>
        {date.toLocaleDateString(locale, { month: 'short' })}
      </Txt>
      <Txt variant="title">{date.getDate()}</Txt>
    </View>
  );
}

function Stat({ value, label, divided }: { value: string; label: string; divided?: boolean }) {
  return (
    <View style={[styles.stat, divided && styles.statDivided]}>
      <Txt variant="bodyStrong">{value}</Txt>
      <Txt variant="caption" color={colors.textMuted}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  head: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.sm },
  picker: { gap: space.lg, paddingHorizontal: space.lg, paddingVertical: space.xs },
  pick: { alignItems: 'center', gap: space.xs, width: 56 },
  pickActive: { fontWeight: '600' },
  hero: { marginHorizontal: space.lg, marginTop: space.md },
  together: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pair: { flexDirection: 'row', marginRight: space.xs },
  overlap: { marginLeft: -space.md },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg },
  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: space.md,
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.bond },
  stats: { flexDirection: 'row', marginTop: space.lg },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivided: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  dateTile: {
    width: ROW_ICON,
    height: ROW_ICON,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { paddingHorizontal: space.lg, paddingTop: space.xs },
  showMore: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: space.lg },
});
