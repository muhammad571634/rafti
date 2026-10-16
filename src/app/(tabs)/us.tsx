import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CharacterAvatar,
  EmptyState,
  GlassButton,
  InsetGroup,
  PressableScale,
  Screen,
  SFIcon,
  Txt,
  UserAvatar,
} from '@/components/ui';
import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { PlanCalendar } from '@/components/us/plan-calendar';
import { PlanSheet, type NewPlan } from '@/components/us/plan-sheet';
import { PublishSheet, type PublishKind } from '@/components/us/publish-sheet';
import { useDayKey } from '@/hooks/use-day-key';
import { daysBetween, relativeStamp, shortName } from '@/lib/format';
import { reminderAt } from '@/lib/schedule';
import { dateFromKey, levelForIntimacy } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, radius, space, TAB_BAR_HEIGHT } from '@/theme';
import type { MomentKind } from '@/types';

const MOMENT_PAGE = 20;
/** Story-row avatar and the moment art: the top is generous, the timeline light. */
const STORY = 58;
/** The picture at the end of a photo moment. */
const PHOTO_THUMB = 40;

/**
 * Each moment kind as an iOS-style icon: a system-colour circle with a white SF Symbol (an
 * Ionicon off iPhone). The 3D clay art is gone from Us (owner, 2026-10-17).
 */
const MOMENT_STYLE: Record<MomentKind, { ios: SFSymbol; icon: keyof typeof Ionicons.glyphMap; fill: string }> = {
  met: { ios: 'sparkles', icon: 'sparkles', fill: '#AF52DE' },
  levelUp: { ios: 'crown.fill', icon: 'trophy', fill: '#FF9500' },
  call: { ios: 'phone.fill', icon: 'call', fill: '#34C759' },
  diary: { ios: 'book.fill', icon: 'book', fill: '#A2845E' },
  secretNote: { ios: 'envelope.fill', icon: 'mail', fill: '#5856D6' },
  dating: { ios: 'heart.fill', icon: 'heart', fill: '#FF2D55' },
  photo: { ios: 'camera.fill', icon: 'camera', fill: '#007AFF' },
  plan: { ios: 'calendar', icon: 'calendar', fill: '#FF3B30' },
  board: { ios: 'pin.fill', icon: 'pin', fill: '#00C7BE' },
  quiz: { ios: 'questionmark', icon: 'help', fill: '#32ADE6' },
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
  // The tab bar grows by the phone's bottom inset (home indicator, navigation bar).
  const insets = useSafeAreaInsets();

  const user = useAppStore((s) => s.user);
  const relationships = useAppStore((s) => s.relationships);
  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const moments = useAppStore((s) => s.moments);
  const photos = useAppStore((s) => s.photos);
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

  const addButton = (
    <GlassButton icon="add" accessibilityLabel={t('us.add')} onPress={() => setPublishOpen(true)} />
  );

  if (!selected) {
    return (
      <Screen background={colors.bg}>
        <View style={styles.head}>
          <Txt style={styles.title} accessibilityRole="header">
            {t('us.title')}
          </Txt>
        </View>
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
  const filterKeys = ['all', ...filters] as FilterKey[];

  return (
    // iOS look (approved prototype `Us.dc.html`): grey ground, white cards, like Fitness' Summary.
    <Screen background={colors.bg}>
      <View style={styles.head}>
        <Txt style={styles.title} accessibilityRole="header">
          {t('us.title')}
        </Txt>
        {addButton}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xxl }}>
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
                {/* A story-style ring with air around the face marks the bond on screen. */}
                <View style={[styles.ring, active && styles.ringOn]}>
                  <CharacterAvatar character={c} size={STORY} />
                </View>
                <Txt style={[styles.pickName, active && styles.pickActive]} lines={1}>
                  {shortName(displayName(c, r))}
                </Txt>
              </PressableScale>
            );
          })}
        </ScrollView>

        {/* The bond at a glance in one white card; it opens the chat. */}
        <PressableScale
          scaleTo={0.99}
          style={styles.hero}
          disabled={!conversation}
          accessibilityRole="button"
          accessibilityLabel={`${displayName(character, relationship)}, ${t('us.daysLabel', { count: days })} ${days}`}
          onPress={() => conversation && router.push(`/chat/${conversation.id}`)}>
          <View style={styles.together}>
            <View style={styles.pair}>
              <UserAvatar user={user} size={44} />
              <CharacterAvatar character={character} size={44} ring ringColor={colors.surface} style={styles.overlap} />
            </View>
            <View style={styles.daysLine}>
              <Txt style={styles.days}>{days}</Txt>
              <Txt style={styles.daysLabel}>{t('us.daysLabel', { count: days })}</Txt>
            </View>
            {conversation ? <Ionicons name="chevron-forward" size={15} color={colors.textFaint} /> : null}
          </View>

          <View style={styles.levelRow}>
            <Txt style={styles.levelText} lines={1}>
              {t('characterProfile.levelLine', { level: relationship.level, title: relationship.levelTitle })}
            </Txt>
            <Txt style={styles.levelMeta}>
              {t('characterProfile.progress', { current: relationship.intimacy, next: relationship.nextLevelAt })}
            </Txt>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.round(progress * 100))}%` }]} />
          </View>

          <View style={styles.stats}>
            <Stat value={String(relationship.intimacy)} label={t('us.statIntimacy')} />
            <Stat value={String(relationship.streakDays)} label={t('us.statStreak')} accent divided />
            <Stat
              value={new Date(relationship.anniversary).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
              label={t('us.statMet')}
            />
          </View>
        </PressableScale>

        <PlanCalendar value={day} onChange={setDay} today={today} marked={planDays} />

        <Txt style={styles.sectionLabel}>{day === today ? t('common.today') : dayTitle(day, i18n.language)}</Txt>
        <InsetGroup>
          {dayPlans.length === 0 ? (
            // The day is free: one quiet line, and one tap plans something.
            <View style={styles.free}>
              <Txt style={[styles.rowText, styles.grow]} color={colors.textSecondary}>
                {t('us.nothingPlanned')}
              </Txt>
              <PressableScale style={styles.planPill} scaleTo={0.94} accessibilityRole="button" onPress={() => setPlanOpen(true)}>
                <Ionicons name="add" size={15} color={colors.brandText} />
                <Txt style={styles.planPillText} color={colors.brandText}>
                  {t('us.plan')}
                </Txt>
              </PressableScale>
            </View>
          ) : (
            dayPlans.map((item, i) => {
              const pending = !item.reminded && reminderAt(item).getTime() > Date.now();
              return (
                <View key={item.id} style={styles.planRow}>
                  <TimeTile time={item.time} />
                  <View style={[styles.planBody, i < dayPlans.length - 1 && styles.line]}>
                    <Txt style={[styles.rowText, styles.grow]} lines={2}>
                      {item.title}
                    </Txt>
                    {pending ? (
                      <View style={styles.remind}>
                        <Ionicons name="notifications" size={12} color={colors.textSecondary} />
                        <Txt style={styles.remindText}>{clock(reminderAt(item))}</Txt>
                      </View>
                    ) : item.followedUp ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    ) : null}
                    <PressableScale
                      hitSlop={hitSlop}
                      scaleTo={0.85}
                      accessibilityLabel={t('a11y.removePlan')}
                      onPress={() => removeSchedule(item.id)}>
                      <Ionicons name="close-circle" size={20} color={colors.textFaint} />
                    </PressableScale>
                  </View>
                </View>
              );
            })
          )}
        </InsetGroup>

        <Txt style={styles.sectionLabel}>{t('us.moments')}</Txt>
        {filters.length > 1 ? (
          // iOS segmented control; it scrolls sideways when every kind has moments.
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.segmentScroll}
            contentContainerStyle={styles.segment}>
            {filterKeys.map((key) => {
              const on = activeFilter === key;
              return (
                <PressableScale
                  key={key}
                  scaleTo={0.96}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => setFilter(key)}
                  style={[styles.segmentItem, filterKeys.length <= 4 && styles.segmentFill, on && styles.segmentOn]}>
                  <Txt style={[styles.segmentText, on && styles.segmentTextOn]}>{t(`us.filter.${key}`)}</Txt>
                </PressableScale>
              );
            })}
          </ScrollView>
        ) : null}
        {timeline.length === 0 ? (
          <Txt style={styles.hint}>{t('us.noMoments')}</Txt>
        ) : (
          <InsetGroup>
            {shownMoments.map((moment, i) => {
              const photo = moment.photoId ? photos.find((p) => p.id === moment.photoId) : undefined;
              const last = i === shownMoments.length - 1 && timeline.length <= visibleMoments;
              return (
                <MomentRow
                  key={moment.id}
                  kind={moment.kind}
                  text={t(`us.momentText.${moment.kind}`, moment.params ?? {})}
                  when={relativeStamp(moment.createdAt)}
                  last={last}
                  // A photo moment shows the picture and opens it.
                  thumb={
                    photo ? (
                      <BoothPicture
                        photo={photo}
                        character={selected.character}
                        width={fitWidth(photo.style, { width: PHOTO_THUMB, height: PHOTO_THUMB })}
                      />
                    ) : undefined
                  }
                  onPress={photo ? () => router.push({ pathname: '/photo/[id]', params: { id: photo.id } }) : undefined}
                />
              );
            })}
            {timeline.length > visibleMoments ? (
              <Pressable
                style={({ pressed }) => [styles.showMore, pressed && styles.pressed]}
                accessibilityRole="button"
                onPress={() => setMomentLimit({ id: selected.character.id, count: visibleMoments + MOMENT_PAGE })}>
                <Txt style={styles.rowText} color={colors.primary}>
                  {t('us.showMore', { count: Math.min(MOMENT_PAGE, timeline.length - visibleMoments) })}
                </Txt>
              </Pressable>
            ) : null}
          </InsetGroup>
        )}
      </ScrollView>

      <PublishSheet
        visible={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPick={pickPublish}
        name={selected ? shortName(displayName(selected.character, selected.relationship)) : ''}
      />
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

/** A plan's time in bold beside the title; the iOS Calendar glyph when it has none. */
function TimeTile({ time }: { time?: string }) {
  if (!time) {
    return (
      <View style={[styles.momentIcon, { backgroundColor: MOMENT_STYLE.plan.fill }]}>
        <SFIcon ios="calendar" icon="calendar" size={16} color={colors.white} />
      </View>
    );
  }
  return (
    <View style={styles.timeTile}>
      <Txt style={styles.time}>{time}</Txt>
    </View>
  );
}

/** One moment: a system-colour icon (no 3D art here, owner 2026-10-17), the line, when. */
function MomentRow({
  kind,
  text,
  when,
  thumb,
  last,
  onPress,
}: {
  kind: MomentKind;
  text: string;
  when: string;
  thumb?: React.ReactNode;
  last?: boolean;
  onPress?: () => void;
}) {
  const look = MOMENT_STYLE[kind];
  return (
    <Pressable
      style={({ pressed }) => [styles.moment, pressed && onPress ? styles.pressed : null]}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${text}, ${when}`}
      onPress={onPress}>
      <View style={[styles.momentIcon, { backgroundColor: look.fill }]}>
        <SFIcon ios={look.ios} icon={look.icon} size={16} color={colors.white} />
      </View>
      <View style={[styles.momentBody, !last && styles.line]}>
        <Txt style={[styles.momentText, styles.grow]} lines={2}>
          {text}
        </Txt>
        <Txt style={styles.when}>{when}</Txt>
        {thumb ? <View style={styles.thumb}>{thumb}</View> : null}
      </View>
    </Pressable>
  );
}

function Stat({ value, label, accent, divided }: { value: string; label: string; accent?: boolean; divided?: boolean }) {
  return (
    <View style={[styles.stat, divided && styles.statDivided]}>
      <Txt style={styles.statValue} color={accent ? colors.primary : colors.text}>
        {value}
      </Txt>
      <Txt style={styles.statLabel}>{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  title: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.4 },
  picker: { gap: space.sm + 2, paddingHorizontal: space.lg, paddingVertical: space.md },
  pick: { alignItems: 'center', gap: 7, width: STORY + 6 },
  ring: { padding: 2.5, borderRadius: radius.pill, borderWidth: 2.5, borderColor: 'transparent' },
  ringOn: { borderColor: colors.primary },
  pickName: { fontSize: 12, color: colors.textSecondary },
  pickActive: { fontWeight: '600', color: colors.text },
  hero: { marginHorizontal: space.lg, marginTop: space.xs, padding: space.lg, borderRadius: 16, backgroundColor: colors.surface },
  together: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pair: { flexDirection: 'row' },
  overlap: { marginLeft: -space.lg },
  daysLine: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  days: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  daysLabel: { fontSize: 15, color: colors.textSecondary },
  levelRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: 14 },
  levelText: { flex: 1, fontSize: 15, fontWeight: '600' },
  levelMeta: { fontSize: 13, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginTop: space.sm },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.bond },
  // Three figures under a hairline, split by hairlines (Health's summary rows).
  stats: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivided: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  statValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, color: colors.textSecondary },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: space.lg * 2,
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  rowText: { fontSize: 17, letterSpacing: -0.4 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfaceAlt },
  free: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingLeft: space.lg, paddingRight: space.sm },
  planPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 34,
    paddingLeft: space.sm + 2,
    paddingRight: space.md + 2,
    borderRadius: 17,
    backgroundColor: colors.primarySofter,
  },
  planPillText: { fontSize: 15, fontWeight: '600' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  planBody: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingRight: space.lg },
  timeTile: { minWidth: 48, justifyContent: 'center' },
  time: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  remind: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  remindText: { fontSize: 13, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  segmentScroll: { marginHorizontal: space.lg, marginBottom: space.sm + 2, flexGrow: 0 },
  segment: { flexGrow: 1, height: 32, padding: 2, borderRadius: 16, backgroundColor: colors.surfaceAlt },
  segmentItem: { paddingHorizontal: space.md, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segmentFill: { flex: 1 },
  segmentOn: { backgroundColor: colors.surface },
  segmentText: { fontSize: 13, color: colors.text },
  segmentTextOn: { fontWeight: '600' },
  hint: { marginHorizontal: space.lg * 2, fontSize: 15, color: colors.textSecondary },
  moment: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  momentIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  momentBody: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.lg },
  momentText: { fontSize: 15, lineHeight: 20, letterSpacing: -0.2 },
  when: { fontSize: 13, color: colors.textSecondary },
  thumb: { width: PHOTO_THUMB, height: PHOTO_THUMB, alignItems: 'center', justifyContent: 'center' },
  showMore: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.lg },
});
