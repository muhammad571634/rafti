import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  CharacterAvatar,
  Chip,
  ClayIcon,
  EmptyState,
  ListRow,
  PressableScale,
  Screen,
  SectionLabel,
  Txt,
  UserAvatar,
  type ClayIconName,
} from '@/components/ui';
import { PlanCalendar } from '@/components/us/plan-calendar';
import { PlanSheet, type NewPlan } from '@/components/us/plan-sheet';
import { PublishSheet, type PublishKind } from '@/components/us/publish-sheet';
import { useDayKey } from '@/hooks/use-day-key';
import { daysBetween, relativeStamp } from '@/lib/format';
import { reminderAt } from '@/lib/schedule';
import { dateFromKey, levelForIntimacy } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, radius, space, TAB_BAR_HEIGHT } from '@/theme';
import type { MomentKind } from '@/types';

const MOMENT_PAGE = 20;
const ROW_ICON = 40;

/** One clay icon per moment kind (docs/icons-3d.md); the same art as where it happened. */
const MOMENT_ICON: Record<MomentKind, ClayIconName> = {
  met: 'sparkles',
  levelUp: 'levelUp',
  call: 'calls',
  diary: 'diary',
  secretNote: 'secretNote',
  dating: 'date',
  photo: 'camera',
  plan: 'calendar',
  board: 'board',
  quiz: 'quiz',
};

/** Moment filters; a chip shows only when the bond has moments of that kind. */
const FILTERS = {
  plans: ['plan'],
  dates: ['dating', 'photo'],
  calls: ['call'],
  notes: ['secretNote', 'board'],
  diary: ['diary'],
  games: ['quiz'],
} satisfies Record<string, MomentKind[]>;
type FilterKey = keyof typeof FILTERS | 'all';

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
  const addSchedule = useAppStore((s) => s.addSchedule);

  const today = useDayKey();
  const [day, setDay] = useState(today);
  const [publishOpen, setPublishOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

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

  const allMoments = useMemo(
    () =>
      moments
        .filter((m) => m.characterId === selected?.character.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [moments, selected],
  );
  const filters = (Object.keys(FILTERS) as (keyof typeof FILTERS)[]).filter((key) =>
    allMoments.some((m) => (FILTERS[key] as MomentKind[]).includes(m.kind)),
  );
  const activeFilter: FilterKey = filter !== 'all' && filters.includes(filter) ? filter : 'all';
  const timeline =
    activeFilter === 'all'
      ? allMoments
      : allMoments.filter((m) => (FILTERS[activeFilter] as MomentKind[]).includes(m.kind));

  const plans = useMemo(
    () => schedules.filter((x) => x.characterId === selected?.character.id),
    [schedules, selected],
  );
  const planDays = useMemo(() => new Set(plans.map((x) => x.date)), [plans]);
  const dayPlans = useMemo(
    () => plans.filter((x) => x.date === day).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    [plans, day],
  );

  const pickPublish = (kind: PublishKind) => {
    setPublishOpen(false);
    if (kind === 'plan') setPlanOpen(true);
    else if (kind === 'diary') router.push('/diary/write');
    else if (selected) router.push({ pathname: '/board/write', params: { characterId: selected.character.id } });
  };

  const submitPlan = (plan: NewPlan) => {
    if (!selected) return;
    addSchedule({ characterId: selected.character.id, ...plan });
    setPlanOpen(false);
    setDay(plan.date);
  };

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

        {/* The bond at a glance, straight on the canvas; it opens the chat. */}
        <PressableScale
          scaleTo={0.99}
          style={styles.hero}
          disabled={!conversation}
          onPress={() => conversation && router.push(`/chat/${conversation.id}`)}>
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
            <Stat value={String(relationship.streakDays)} label={t('us.statStreak')} />
            <Stat
              value={new Date(relationship.anniversary).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
              label={t('us.statMet')}
            />
          </View>
        </PressableScale>

        <PlanCalendar value={day} onChange={setDay} today={today} marked={planDays} onAdd={() => setPublishOpen(true)} />

        <SectionLabel tone="title" title={day === today ? t('common.today') : dayTitle(day, i18n.language)} />
        {dayPlans.length === 0 ? (
          <ListRow
            size="large"
            title={t('us.nothingPlanned')}
            left={<ClayIcon name="calendar" size={ROW_ICON} tile={false} />}
            onPress={() => setPlanOpen(true)}
          />
        ) : (
          dayPlans.map((item) => {
            const pending = !item.reminded && reminderAt(item).getTime() > Date.now();
            return (
              <View key={item.id}>
                <ListRow
                  size="large"
                  title={item.title}
                  left={<TimeTile time={item.time} />}
                  right={
                    <View style={styles.planRight}>
                      {pending ? (
                        <View style={styles.remind}>
                          <Ionicons name="notifications-outline" size={13} color={colors.textMuted} />
                          <Txt variant="caption" color={colors.textMuted}>
                            {clock(reminderAt(item))}
                          </Txt>
                        </View>
                      ) : item.followedUp ? (
                        <Ionicons name="checkmark-circle" size={18} color={colors.textFaint} />
                      ) : null}
                      <PressableScale
                        hitSlop={hitSlop}
                        scaleTo={0.85}
                        accessibilityLabel={t('a11y.removePlan')}
                        onPress={() => removeSchedule(item.id)}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.textFaint} />
                      </PressableScale>
                    </View>
                  }
                />
              </View>
            );
          })
        )}

        <SectionLabel tone="title" title={t('us.moments')} />
        {filters.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {(['all', ...filters] as FilterKey[]).map((key) => (
              <Chip key={key} label={t(`us.filter.${key}`)} active={activeFilter === key} onPress={() => setFilter(key)} />
            ))}
          </ScrollView>
        ) : null}
        {timeline.length === 0 ? (
          <Txt variant="small" color={colors.textMuted} style={styles.hint}>
            {t('us.noMoments')}
          </Txt>
        ) : (
          shownMoments.map((moment) => (
            <ListRow
              key={moment.id}
              size="large"
              title={t(`us.momentText.${moment.kind}`, moment.params ?? {})}
              meta={relativeStamp(moment.createdAt)}
              left={<ClayIcon name={MOMENT_ICON[moment.kind]} size={ROW_ICON} tile={false} />}
            />
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

      <PublishSheet visible={publishOpen} onClose={() => setPublishOpen(false)} onPick={pickPublish} />
      <PlanSheet
        visible={planOpen}
        onClose={() => setPlanOpen(false)}
        day={day}
        character={selected?.character}
        onSubmit={submitPlan}
      />
    </Screen>
  );
}

const clock = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function dayTitle(key: string, locale: string) {
  return dateFromKey(key).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** A plan's time in bold beside the title; a calendar glyph when it has none. */
function TimeTile({ time }: { time?: string }) {
  if (!time) return <ClayIcon name="calendar" size={ROW_ICON} tile={false} />;
  return (
    <View style={styles.timeTile}>
      <Txt variant="title" style={styles.tabular}>
        {time}
      </Txt>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
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
  hero: { paddingHorizontal: space.lg, paddingTop: space.xl },
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
  timeTile: { minWidth: ROW_ICON + 14, height: ROW_ICON, justifyContent: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  planRight: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  remind: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  filters: { gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  hint: { paddingHorizontal: space.lg, paddingTop: space.xs },
  showMore: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: space.lg },
});
