import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import {
  AuroraGlass,
  CharacterAvatar,
  EmptyState,
  InsetGroup,
  moduleTile,
  PressableScale,
  Screen,
  SFIcon,
  Txt,
  UserAvatar,
} from '@/components/ui';
import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { BondShareSheet } from '@/components/us/bond-share-sheet';
import { PlanCalendar } from '@/components/us/plan-calendar';
import { PlanSheet, type NewPlan } from '@/components/us/plan-sheet';
import { PublishSheet, type PublishKind } from '@/components/us/publish-sheet';
import { useDayKey } from '@/hooks/use-day-key';
import { useInboxUnread } from '@/hooks/use-inbox-unread';
import { phrase } from '@/i18n';
import { daysBetween, relativeStamp, shortName } from '@/lib/format';
import { reminderAt } from '@/lib/schedule';
import { dateFromKey, levelForIntimacy } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { aurora, colors, hitSlop, isDark, radius, space, systemColors, TAB_BAR_HEIGHT } from '@/theme';
import type { MomentKind } from '@/types';

const MOMENT_PAGE = 20;
/** Story-row avatar and the moment art: the top is generous, the timeline light. */
const STORY = 58;
/** The picture at the end of a photo moment. */
const PHOTO_THUMB = 40;
/** The level ring (Fitness-style, canvas "Us 2" variant B): its size, stroke and circumference. */
const RING = 104;
const RING_STROKE = 12;
const RING_R = (RING - RING_STROKE) / 2 - 2;
const RING_C = 2 * Math.PI * RING_R;
const PAIR = 34;
/** Mint from light to deep, brighter in dark mode. */
const RING_FILL = isDark ? ['#7CF0D8', '#3CCFB4'] : ['#3CCFB4', '#1FA88F'];
const RING_TRACK = isDark ? 'rgba(95,224,196,0.18)' : 'rgba(31,168,143,0.16)';

/**
 * Each moment kind as an iOS-style icon: a system-colour circle with a white SF Symbol (an
 * Ionicon off iPhone). The 3D clay art is gone from Us (owner, 2026-10-17). Modules wear their
 * own colour and glyph (`moduleTile`), the same as on Today; a level-up is the bond's mint.
 */
const MOMENT_STYLE: Record<MomentKind, { ios: SFSymbol; icon: keyof typeof Ionicons.glyphMap; fill: string }> = {
  met: { ios: 'sparkles', icon: 'sparkles', fill: systemColors.purple },
  levelUp: moduleTile('bond'),
  call: moduleTile('calls'),
  diary: moduleTile('diary'),
  secretNote: moduleTile('note'),
  dating: moduleTile('date'),
  photo: moduleTile('photo'),
  plan: { ios: 'calendar', icon: 'calendar', fill: systemColors.red },
  board: moduleTile('board'),
  quiz: { ios: 'questionmark', icon: 'help', fill: systemColors.indigo },
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
  const [sharing, setSharing] = useState(false);
  const unread = useInboxUnread();

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

  // Notifications live here, as a bell beside "+" (BIMOBIMO keeps them on Us too).
  const bell = (
    <PressableScale
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? t('us.notificationsNew', { count: unread }) : t('notifications.title')}
      onPress={() => router.push('/notifications')}>
      <AuroraGlass style={styles.add}>
        <Ionicons name="notifications-outline" size={21} color={colors.text} />
      </AuroraGlass>
      {unread > 0 ? (
        <View style={styles.badge} pointerEvents="none">
          <Txt style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Txt>
        </View>
      ) : null}
    </PressableScale>
  );

  const addButton = (
    <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('us.add')} onPress={() => setPublishOpen(true)}>
      <AuroraGlass prominent style={styles.add}>
        <Ionicons name="add" size={24} color={colors.textOnPrimary} />
      </AuroraGlass>
    </PressableScale>
  );

  if (!selected) {
    return (
      <Screen background="aurora">
        <View style={styles.head}>
          <Txt style={[styles.title, styles.grow]} accessibilityRole="header">
            {t('us.title')}
          </Txt>
          {bell}
        </View>
        <EmptyState
          title={t('us.noRelationships')}
          hint={t('us.noRelationshipsHint')}
          actionLabel={t('common.findSomeone')}
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
    // On the aurora (canvas "Us 2", variant B): glass controls, solid cards, a Fitness-style level ring.
    <Screen background="aurora">
      <View style={styles.head}>
        <Txt style={[styles.title, styles.grow]} accessibilityRole="header">
          {t('us.title')}
        </Txt>
        {bell}
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
                <View style={[styles.ring, active ? styles.ringOn : styles.ringOff]}>
                  <CharacterAvatar character={c} size={STORY} />
                </View>
                <Txt style={[styles.pickName, active && styles.pickActive]} lines={1}>
                  {shortName(displayName(c, r))}
                </Txt>
              </PressableScale>
            );
          })}
        </ScrollView>

        {/* The bond at a glance: the level ring, days and title, then three figures; it opens the chat. */}
        <View style={styles.hero}>
          <PressableScale
            scaleTo={0.99}
            disabled={!conversation}
            accessibilityRole="button"
            accessibilityLabel={`${displayName(character, relationship)}, ${t('us.level', { level: relationship.level })}, ${days} ${t('us.daysLabel', { count: days })}`}
            onPress={() => conversation && router.push(`/chat/${conversation.id}`)}>
            <View style={styles.together}>
              <LevelRing progress={progress} level={relationship.level} label={t('us.ringLevel')} />
              <View style={styles.grow}>
                <View style={styles.daysLine}>
                  <Txt style={styles.days}>{days}</Txt>
                  <Txt style={styles.daysLabel}>{t('us.daysShort', { count: days })}</Txt>
                </View>
                <Txt style={styles.levelText} lines={1}>
                  {phrase(relationship.levelTitle)}
                </Txt>
                <Txt style={styles.levelMeta} lines={1}>
                  {t('us.toLevel', {
                    count: Math.max(0, relationship.nextLevelAt - relationship.intimacy),
                    level: relationship.level + 1,
                  })}
                </Txt>
              </View>
              <View style={styles.pair}>
                <UserAvatar user={user} size={PAIR} />
                <CharacterAvatar character={character} size={PAIR} ring ringColor={aurora.card} style={styles.overlap} />
              </View>
            </View>

            <View style={styles.stats}>
              <Stat value={String(relationship.intimacy)} label={t('us.statIntimacy')} />
              <Stat value={String(relationship.streakDays)} label={t('us.statStreak')} divided />
              <Stat
                value={new Date(relationship.anniversary).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                label={t('us.statMet')}
              />
            </View>
          </PressableScale>

          {/* The system Share symbol opens the bond's card (HIG Activity views): one quiet control, a
              sibling of the chat button above so VoiceOver reaches it on its own. */}
          <PressableScale
            style={styles.share}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel={`${t('common.share')}, ${days} ${t('us.daysLabel', { count: days })}`}
            onPress={() => setSharing(true)}>
            <SFIcon ios="square.and.arrow.up" icon="share-outline" size={16} color={colors.brandText} />
            <Txt style={styles.planPillText} color={colors.brandText}>
              {t('common.share')}
            </Txt>
          </PressableScale>
        </View>

        <PlanCalendar value={day} onChange={setDay} today={today} marked={planDays} style={styles.card} />

        <Txt style={styles.sectionLabel}>{day === today ? t('common.today') : dayTitle(day, i18n.language)}</Txt>
        <InsetGroup style={styles.group}>
          {dayPlans.length === 0 ? (
            // The day is free: one quiet line, and one tap plans something.
            <View style={styles.free}>
              <Txt style={[styles.rowText, styles.grow]} color={aurora.textMuted}>
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
          // A glass segmented control on the aurora; it scrolls sideways when every kind has moments.
          <AuroraGlass style={styles.segmentGlass}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
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
          </AuroraGlass>
        ) : null}
        {timeline.length === 0 ? (
          <Txt style={styles.hint}>{t('us.noMoments')}</Txt>
        ) : (
          <InsetGroup style={styles.group}>
            {shownMoments.map((moment, i) => {
              const photo = moment.photoId ? photos.find((p) => p.id === moment.photoId) : undefined;
              const last = i === shownMoments.length - 1 && timeline.length <= visibleMoments;
              return (
                <MomentRow
                  key={moment.id}
                  kind={moment.kind}
                  text={t(
                    `us.momentText.${moment.kind}`,
                    { ...moment.params, ...(moment.params?.title ? { title: phrase(String(moment.params.title)) } : {}) },
                  )}
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
                <Txt style={styles.rowText} color={colors.brandText}>
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
      <BondShareSheet
        visible={sharing}
        onClose={() => setSharing(false)}
        character={character}
        relationship={relationship}
        days={days}
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

/** Closeness as a Fitness-style ring: a mint arc over a faint track, the level in the middle. */
function LevelRing({ progress, level, label }: { progress: number; level: number; label: string }) {
  const shown = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.levelRing}>
      <Svg width={RING} height={RING} style={styles.ringSvg}>
        <Defs>
          <LinearGradient id="levelRing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={RING_FILL[0]} />
            <Stop offset="1" stopColor={RING_FILL[1]} />
          </LinearGradient>
        </Defs>
        <Circle cx={RING / 2} cy={RING / 2} r={RING_R} fill="none" stroke={RING_TRACK} strokeWidth={RING_STROKE} />
        {shown > 0 ? (
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={RING_R}
            fill="none"
            stroke="url(#levelRing)"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${RING_C * shown} ${RING_C}`}
          />
        ) : null}
      </Svg>
      <View style={styles.ringLabel}>
        <Txt style={styles.ringCaption}>{label}</Txt>
        <Txt style={styles.ringLevel}>{level}</Txt>
      </View>
    </View>
  );
}

function Stat({ value, label, divided }: { value: string; label: string; divided?: boolean }) {
  return (
    <View style={[styles.stat, divided && styles.statDivided]}>
      <Txt style={styles.statValue} color={colors.text}>
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
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  title: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.4 },
  add: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  // The red count on the bell, ringed in the ground colour so it reads as cut out of the glass.
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: systemColors.red,
    borderWidth: 2,
    borderColor: aurora.base,
  },
  badgeText: { fontSize: 11, lineHeight: 13, fontWeight: '700', color: colors.white },
  picker: { gap: space.sm + 2, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xs },
  pick: { alignItems: 'center', gap: 7, width: STORY + 6 },
  // The chosen bond: a tint ring with the aurora showing between it and the face; the rest a faint light ring.
  ring: { padding: 2.5, borderRadius: radius.pill, borderWidth: 2.5, borderColor: 'transparent' },
  ringOn: { borderColor: aurora.tint },
  ringOff: { padding: 0, margin: 2.5, borderWidth: 2.5, borderColor: aurora.ring },
  pickName: { fontSize: 12, color: aurora.textMuted },
  pickActive: { fontWeight: '600', color: colors.text },
  // Solid cards on the aurora, with a soft shadow on iPhone.
  card: {
    borderRadius: 22,
    backgroundColor: aurora.card,
    shadowColor: aurora.shadow,
    shadowOpacity: isDark ? 0.35 : 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  group: {
    borderRadius: 18,
    backgroundColor: aurora.card,
    shadowColor: aurora.shadow,
    shadowOpacity: isDark ? 0.35 : 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  hero: {
    marginHorizontal: space.lg,
    marginTop: 18,
    padding: space.lg,
    borderRadius: 22,
    backgroundColor: aurora.card,
    shadowColor: aurora.shadow,
    shadowOpacity: isDark ? 0.35 : 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  together: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  levelRing: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  // The arc starts at twelve o'clock.
  ringSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  ringLabel: { alignItems: 'center' },
  ringCaption: { fontSize: 12, fontWeight: '600', color: aurora.textMuted },
  ringLevel: { fontSize: 30, lineHeight: 32, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  pair: { flexDirection: 'row', alignSelf: 'flex-start' },
  overlap: { marginLeft: -12 },
  daysLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  days: { fontSize: 34, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  daysLabel: { fontSize: 15, color: aurora.textMuted },
  levelText: { marginTop: 3, fontSize: 15, fontWeight: '600' },
  levelMeta: { marginTop: 3, fontSize: 13, color: aurora.textMuted, fontVariant: ['tabular-nums'] },
  // Three figures under a hairline, split by hairlines (Health's summary rows).
  stats: {
    flexDirection: 'row',
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: aurora.separator,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivided: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: aurora.separator,
  },
  statValue: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, color: aurora.textMuted },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: space.lg * 2,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: aurora.textMuted,
    textTransform: 'uppercase',
  },
  rowText: { fontSize: 17, letterSpacing: -0.4 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: aurora.separator },
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
  // The plan pill's tint, the card's width, under the three figures.
  share: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs + 2,
    height: 40,
    marginTop: space.md,
    borderRadius: 20,
    backgroundColor: colors.primarySofter,
  },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  planBody: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingRight: space.lg },
  timeTile: { minWidth: 48, justifyContent: 'center' },
  time: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  remind: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  remindText: { fontSize: 13, color: aurora.textMuted, fontVariant: ['tabular-nums'] },
  segmentGlass: { height: 36, marginHorizontal: space.lg, marginBottom: space.sm + 2, borderRadius: 18, padding: 3 },
  segment: { flexGrow: 1 },
  segmentItem: { paddingHorizontal: space.md, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  segmentFill: { flex: 1 },
  segmentOn: {
    backgroundColor: aurora.glassOn,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  segmentText: { fontSize: 13, fontWeight: '500', color: colors.text },
  segmentTextOn: { fontWeight: '700' },
  hint: { marginHorizontal: space.lg * 2, fontSize: 15, color: aurora.textMuted },
  moment: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  momentIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  momentBody: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.lg },
  momentText: { fontSize: 15, lineHeight: 20, letterSpacing: -0.2 },
  when: { fontSize: 13, color: aurora.textMuted },
  thumb: { width: PHOTO_THUMB, height: PHOTO_THUMB, alignItems: 'center', justifyContent: 'center' },
  showMore: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.lg },
});
