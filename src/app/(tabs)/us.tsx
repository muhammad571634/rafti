import { Ionicons } from '@expo/vector-icons';
import { LinearGradient as Gradient } from 'expo-linear-gradient';
import { type Href, useRouter, useScrollToTop } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, type ScrollViewInstance, StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { CharacterAvatar, EmptyState, moduleTile, PressableScale, Screen, SFIcon, ShellIcon, Txt, UserAvatar } from '@/components/ui';
import { BoothPicture, fitWidth } from '@/components/photo-booth/booth-picture';
import { BondShareSheet } from '@/components/us/bond-share-sheet';
import { PlanCalendar } from '@/components/us/plan-calendar';
import { PlanSheet, type NewPlan } from '@/components/us/plan-sheet';
import { PublishSheet, type PublishKind } from '@/components/us/publish-sheet';
import { useDayKey } from '@/hooks/use-day-key';
import { useInboxUnread } from '@/hooks/use-inbox-unread';
import { phrase } from '@/i18n';
import { localCharacter } from '@/i18n/content';
import { daysBetween, relativeStamp, shortName } from '@/lib/format';
import { groupMoments, momentTarget } from '@/lib/moment-groups';
import { reminderAt } from '@/lib/schedule';
import { dateFromKey, levelForIntimacy } from '@/mock';
import { displayName, shareReward, useAppStore } from '@/store/use-app-store';
import { colors, fonts, friendColor, hitSlop, isDark, playful, space, systemColors, TAB_BAR_HEIGHT } from '@/theme';
import type { MomentKind } from '@/types';

const MOMENT_PAGE = 20;
/** The friend picker's faces, and the ring of their own hue round the chosen one. */
const STORY = 56;
const STORY_RING = 3;
const STORY_GAP = 2;
/** The picture at the end of a photo moment. */
const PHOTO_THUMB = 40;
/** A moment's round icon; the timeline's thread runs through their centres. */
const MOMENT_ICON = 40;
/** The level ring on the bond card: its size, stroke and circumference. */
const RING = 92;
const RING_STROKE = 10;
const RING_R = (RING - RING_STROKE) / 2 - 1;
const RING_C = 2 * Math.PI * RING_R;
const PAIR = 32;
const WHITE = '#FFFFFF';

/**
 * The bond card's mint (the bond's own colour, design-style §10): a soft gradient with ink on it,
 * deep in dark mode with white. The ring and the figures' tiles are drawn to read on it.
 */
const BOND = isDark
  ? {
      fill: ['#1D5A47', '#163F3A'] as const,
      ink: WHITE,
      track: 'rgba(255,255,255,0.16)',
      arc: '#5FE0C4',
      tile: 'rgba(255,255,255,0.10)',
      flame: systemColors.orange,
    }
  : {
      fill: ['#C9F3E1', '#A8E9CF'] as const,
      ink: '#1F1A17',
      track: 'rgba(255,255,255,0.6)',
      arc: '#1E9E78',
      tile: 'rgba(255,255,255,0.7)',
      flame: '#E8730C',
    };

/**
 * Each moment kind as an iOS-style icon: a system-colour circle with a white SF Symbol (an
 * Ionicon off iPhone). Modules wear their own colour and glyph (`moduleTile`), the same as on
 * Today; a level-up is the bond's mint.
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
  arc: { ios: 'key.fill', icon: 'key', fill: systemColors.pink },
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

/**
 * [Us]: one bond at a time — how long, how close, what's next and what you've shared. The playful
 * skin (design-style §10, the approved four-tab prototype): cream ground, friends ringed in their
 * own hue, the bond as a mint card with its level ring, the week as chips, moments on a thread.
 */
export default function UsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  // The tab bar grows by the phone's bottom inset (home indicator, navigation bar).
  const insets = useSafeAreaInsets();
  // Tapping this tab again while it is open scrolls back to the top, as on iOS (the tab bar emits
  // tabPress on the current tab too).
  const scrollRef = useRef<ScrollViewInstance>(null);
  useScrollToTop(scrollRef);

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
  const reward = useAppStore((s) => shareReward(s.daily));
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
  // A day's run of secret notes (or board notes, diary replies) reads as one row with a count.
  const timeline = useMemo(
    () =>
      groupMoments(
        activeFilter === 'all' ? allMoments : allMoments.filter((m) => (FILTERS[activeFilter] as MomentKind[]).includes(m.kind)),
      ),
    [allMoments, activeFilter],
  );

  // One lookup per photo moment instead of a scan of every photo for each row.
  const photoById = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);

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
    // From a friend's page the diary page is for them: they read it, write back and remember it.
    else if (kind === 'diary' && selected) router.push({ pathname: '/diary/write', params: { characterId: selected.character.id } });
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
      onPress={() => router.push('/notifications')}
      style={[styles.round, styles.roundSoft]}>
      <Ionicons name="notifications-outline" size={21} color={playful.ink} />
      {unread > 0 ? (
        <View style={styles.badge} pointerEvents="none">
          <Txt style={styles.badgeText} maxFontSizeMultiplier={1.2}>
            {unread > 99 ? '99+' : unread}
          </Txt>
        </View>
      ) : null}
    </PressableScale>
  );

  const addButton = (
    <PressableScale
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={t('us.add')}
      onPress={() => setPublishOpen(true)}
      style={[styles.round, styles.roundAccent]}>
      <Ionicons name="add" size={24} color={colors.textOnPrimary} />
    </PressableScale>
  );

  if (!selected) {
    return (
      <Screen background={playful.ground}>
        <View style={styles.head}>
          <Txt style={[styles.title, styles.grow]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
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
    <Screen background={playful.ground}>
      <View style={styles.head}>
        <Txt style={[styles.title, styles.grow]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {t('us.title')}
        </Txt>
        {bell}
        {addButton}
      </View>

      <ScrollView
        ref={scrollRef}
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
                {/* The chosen bond wears a ring of the friend's own hue, the same as on Chats. */}
                <View style={[styles.storyRing, active && { borderColor: friendColor(c.id).fill }]}>
                  <CharacterAvatar character={c} size={STORY} />
                </View>
                <Txt style={[styles.pickName, active && styles.pickActive]} lines={1} maxFontSizeMultiplier={1.3}>
                  {shortName(displayName(c, r))}
                </Txt>
              </PressableScale>
            );
          })}
        </ScrollView>

        {/* The bond at a glance: the level ring, days and title, then three figures; it opens the chat. */}
        <Gradient colors={BOND.fill} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.bond}>
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
                  <Txt style={styles.days} maxFontSizeMultiplier={1.2}>
                    {days}
                  </Txt>
                  <Txt style={styles.daysLabel} maxFontSizeMultiplier={1.3}>
                    {t('us.daysShort', { count: days })}
                  </Txt>
                </View>
                <Txt style={styles.levelText} lines={2} maxFontSizeMultiplier={1.3}>
                  {phrase(relationship.levelTitle)}
                </Txt>
                <Txt style={styles.levelMeta} lines={1} maxFontSizeMultiplier={1.3}>
                  {t('us.toLevel', {
                    count: Math.max(0, relationship.nextLevelAt - relationship.intimacy),
                    level: relationship.level + 1,
                  })}
                </Txt>
              </View>
            </View>
            <View style={styles.pair} pointerEvents="none">
              <UserAvatar user={user} size={PAIR} style={styles.pairFace} />
              <CharacterAvatar character={character} size={PAIR} style={[styles.pairFace, styles.overlap]} />
            </View>

            <View style={styles.stats}>
              <Stat value={String(relationship.intimacy)} label={t('us.statIntimacy')} />
              <Stat value={String(relationship.streakDays)} label={t('us.statStreak')} flame />
              <Stat
                value={new Date(relationship.anniversary).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                label={t('us.statMet')}
              />
            </View>
          </PressableScale>

          {/* Share opens the bond's card (HIG Activity views): a sibling of the chat button above so
              VoiceOver reaches it on its own; what a share pays today rides on it. */}
          <PressableScale
            style={styles.share}
            scaleTo={0.97}
            haptic
            accessibilityRole="button"
            accessibilityLabel={`${t('common.share')}, ${days} ${t('us.daysLabel', { count: days })}${reward ? `, +${reward} ${t('common.shells')}` : ''}`}
            onPress={() => setSharing(true)}>
            <SFIcon ios="square.and.arrow.up" icon="share-outline" size={18} color={playful.chipOnText} />
            <Txt style={styles.shareText} maxFontSizeMultiplier={1.3}>
              {t('common.share')}
            </Txt>
            {reward ? (
              <View style={styles.reward}>
                <Txt style={styles.rewardText} maxFontSizeMultiplier={1.2}>{`+${reward}`}</Txt>
                <ShellIcon size={14} />
              </View>
            ) : null}
          </PressableScale>
        </Gradient>

        <PlanCalendar value={day} onChange={setDay} today={today} marked={planDays} />

        <Txt style={styles.section} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {day === today ? t('common.today') : dayTitle(day, i18n.language)}
        </Txt>
        <View style={styles.card}>
          {dayPlans.length === 0 ? (
            // The day is free: one quiet line, and one tap plans something.
            <View style={styles.free}>
              <Txt style={[styles.freeText, styles.grow]}>{t('us.nothingPlanned')}</Txt>
              <PressableScale style={styles.planPill} scaleTo={0.94} accessibilityRole="button" onPress={() => setPlanOpen(true)}>
                <Ionicons name="add" size={16} color={colors.brandText} />
                <Txt style={styles.planPillText} maxFontSizeMultiplier={1.3}>
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
        </View>

        <Txt style={styles.sectionBig} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {t('us.moments')}
        </Txt>
        {filters.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills} accessibilityRole="tablist">
            {filterKeys.map((key) => {
              const on = activeFilter === key;
              return (
                <PressableScale
                  key={key}
                  scaleTo={0.95}
                  dimOnPress={false}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => setFilter(key)}
                  style={[styles.pill, on && styles.pillOn]}>
                  <Txt style={[styles.pillText, on && styles.pillTextOn]} maxFontSizeMultiplier={1.3}>
                    {t(`us.filter.${key}`)}
                  </Txt>
                </PressableScale>
              );
            })}
          </ScrollView>
        ) : null}
        {timeline.length === 0 ? (
          <Txt style={styles.hint}>{t('us.noMoments')}</Txt>
        ) : (
          <View style={styles.moments}>
            {shownMoments.map(({ moment, count }, i) => {
              const photo = moment.photoId ? photoById.get(moment.photoId) : undefined;
              const target = momentTarget(moment);
              const last = i === shownMoments.length - 1;
              return (
                <MomentRow
                  key={moment.id}
                  kind={moment.kind}
                  count={count}
                  text={t(
                    `us.momentText.${moment.kind}`,
                    {
                      ...moment.params,
                      ...(moment.params?.title
                        ? {
                            // An arc beat's title is the character's own text, in the screen language.
                            title:
                              (moment.kind === 'arc' ? localCharacter(selected.character).arc?.beats.find((b) => b.atLevel === moment.params?.level)?.title : undefined) ??
                              phrase(String(moment.params.title)),
                          }
                        : {}),
                    },
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
                  // Every moment but a plan opens the place it happened (`momentTarget`).
                  onPress={target ? () => router.push(target as Href) : undefined}
                />
              );
            })}
            {timeline.length > visibleMoments ? (
              <PressableScale
                style={styles.showMore}
                scaleTo={0.95}
                accessibilityRole="button"
                onPress={() => setMomentLimit({ id: selected.character.id, count: visibleMoments + MOMENT_PAGE })}>
                <Txt style={styles.showMoreText} maxFontSizeMultiplier={1.3}>
                  {t('us.showMore', { count: Math.min(MOMENT_PAGE, timeline.length - visibleMoments) })}
                </Txt>
              </PressableScale>
            ) : null}
          </View>
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
      <View style={[styles.planIcon, { backgroundColor: MOMENT_STYLE.plan.fill }]}>
        <SFIcon ios="calendar" icon="calendar" size={16} color={colors.white} />
      </View>
    );
  }
  return (
    <View style={styles.timeTile}>
      <Txt style={styles.time} maxFontSizeMultiplier={1.3}>
        {time}
      </Txt>
    </View>
  );
}

/** One moment on the thread: its kind's coloured circle, the line, when (and the photo, if any). */
function MomentRow({
  kind,
  count,
  text,
  when,
  thumb,
  last,
  onPress,
}: {
  kind: MomentKind;
  /** How many moments of one day this row stands for; shown as "×N" past one. */
  count: number;
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
      accessibilityLabel={count > 1 ? `${text}, ×${count}, ${when}` : `${text}, ${when}`}
      onPress={onPress}>
      {/* The thread to the next moment, from under this circle. */}
      {last ? null : <View style={styles.thread} pointerEvents="none" />}
      <View style={[styles.momentIcon, { backgroundColor: look.fill }]}>
        <SFIcon ios={look.ios} icon={look.icon} size={19} color={colors.white} />
      </View>
      <View style={[styles.grow, styles.momentLine]}>
        <Txt style={[styles.momentText, styles.momentTextShrink]} lines={2}>
          {text}
        </Txt>
        {count > 1 ? (
          <View style={styles.times}>
            <Txt style={styles.timesText} maxFontSizeMultiplier={1.2}>{`×${count}`}</Txt>
          </View>
        ) : null}
      </View>
      <View style={styles.momentEnd}>
        {thumb ? <View style={styles.thumb}>{thumb}</View> : null}
        <Txt style={styles.when}>{when}</Txt>
        {onPress ? <Ionicons name="chevron-forward" size={14} color={colors.textFaint} /> : null}
      </View>
    </Pressable>
  );
}

/** Closeness as a ring: the bond's deep mint over a light track, the level big in the middle. */
function LevelRing({ progress, level, label }: { progress: number; level: number; label: string }) {
  const shown = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.levelRing}>
      <Svg width={RING} height={RING} style={styles.ringSvg}>
        <Circle cx={RING / 2} cy={RING / 2} r={RING_R} fill="none" stroke={BOND.track} strokeWidth={RING_STROKE} />
        {shown > 0 ? (
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={RING_R}
            fill="none"
            stroke={BOND.arc}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${RING_C * shown} ${RING_C}`}
          />
        ) : null}
      </Svg>
      <View style={styles.ringLabel}>
        <Txt style={styles.ringCaption} lines={1} maxFontSizeMultiplier={1.2}>
          {label}
        </Txt>
        <Txt style={styles.ringLevel} maxFontSizeMultiplier={1.2}>
          {level}
        </Txt>
      </View>
    </View>
  );
}

/** One figure on the bond card, in its own light tile; the streak carries a flame. */
function Stat({ value, label, flame }: { value: string; label: string; flame?: boolean }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statLine}>
        {flame ? <Ionicons name="flame" size={15} color={BOND.flame} /> : null}
        <Txt style={styles.statValue} lines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.2}>
          {value}
        </Txt>
      </View>
      <Txt style={styles.statLabel} lines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.2}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  title: { fontFamily: fonts.playful, fontSize: 36, lineHeight: 44, letterSpacing: -0.4, color: playful.ink },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  roundSoft: { backgroundColor: playful.round },
  // The screen's one apricot action (design-style §10).
  roundAccent: { backgroundColor: colors.primaryFill },
  // The red count on the bell, ringed in the ground colour so it reads as cut out of it.
  badge: {
    position: 'absolute',
    top: -4,
    right: -5,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: playful.red,
    borderWidth: 2,
    borderColor: playful.ground,
  },
  badgeText: { fontSize: 11, lineHeight: 13, fontWeight: '800', color: WHITE },
  picker: { gap: 12, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs },
  pick: { alignItems: 'center', gap: 5, width: STORY + (STORY_RING + STORY_GAP) * 2 },
  // A ring with a gap of ground round the face; only the chosen bond's is coloured.
  storyRing: {
    padding: STORY_GAP,
    borderWidth: STORY_RING,
    borderRadius: STORY / 2 + STORY_RING + STORY_GAP,
    borderColor: 'transparent',
  },
  pickName: { fontFamily: fonts.playfulBold, fontSize: 12, color: colors.textSecondary },
  pickActive: { fontFamily: fonts.playful, color: playful.ink },
  // No elevation: the bond card is flat colour, like the folders and bubbles.
  bond: { marginHorizontal: 14, marginTop: 14, padding: space.lg, borderRadius: 30 },
  together: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: PAIR * 2 - 10 },
  levelRing: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  // The arc starts at twelve o'clock.
  ringSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  ringLabel: { alignItems: 'center', maxWidth: RING - RING_STROKE * 2 - 4 },
  ringCaption: { fontFamily: fonts.playfulBold, fontSize: 11, lineHeight: 14, color: BOND.ink },
  ringLevel: { fontFamily: fonts.playful, fontSize: 34, lineHeight: 38, color: BOND.ink, fontVariant: ['tabular-nums'] },
  pair: { position: 'absolute', top: 0, right: 0, flexDirection: 'row' },
  pairFace: { borderWidth: 2.5, borderColor: WHITE, borderRadius: PAIR / 2 + 2.5 },
  overlap: { marginLeft: -10 },
  daysLine: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  days: { fontFamily: fonts.playful, fontSize: 30, lineHeight: 36, color: BOND.ink, fontVariant: ['tabular-nums'] },
  daysLabel: { fontFamily: fonts.playfulBold, fontSize: 15, color: BOND.ink },
  levelText: { marginTop: 2, fontFamily: fonts.playful, fontSize: 16, lineHeight: 20, color: BOND.ink },
  levelMeta: { marginTop: 2, fontSize: 12.5, color: BOND.ink, fontVariant: ['tabular-nums'] },
  stats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  stat: { flex: 1, alignItems: 'center', gap: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 18, backgroundColor: BOND.tile },
  statLine: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '100%' },
  statValue: { fontFamily: fonts.playful, fontSize: 19, lineHeight: 24, color: BOND.ink, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 11, lineHeight: 14, color: BOND.ink },
  // The share action: an ink pill the card's width, today's reward on a light chip.
  share: {
    marginTop: 12,
    minHeight: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: playful.chipOn,
  },
  shareText: { fontFamily: fonts.playful, fontSize: 15.5, color: playful.chipOnText },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.18)',
  },
  rewardText: { fontFamily: fonts.playfulBold, fontSize: 12.5, color: playful.chipOnText },
  section: {
    marginTop: 20,
    marginBottom: 8,
    marginHorizontal: 18,
    fontFamily: fonts.playful,
    fontSize: 17,
    lineHeight: 22,
    color: playful.ink,
  },
  sectionBig: {
    marginTop: 24,
    marginBottom: 10,
    marginHorizontal: 18,
    fontFamily: fonts.playful,
    fontSize: 21,
    lineHeight: 26,
    color: playful.ink,
  },
  card: { marginHorizontal: 14, borderRadius: 22, backgroundColor: playful.card, overflow: 'hidden' },
  rowText: { fontSize: 16, letterSpacing: -0.3, color: playful.ink },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { opacity: 0.6 },
  free: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.lg, paddingRight: 10 },
  freeText: { fontSize: 15, color: colors.textSecondary },
  planPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 36,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
  },
  planPillText: { fontFamily: fonts.playful, fontSize: 14, color: colors.brandText },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  planBody: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingRight: space.lg },
  planIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  timeTile: { minWidth: 48, justifyContent: 'center' },
  time: { fontFamily: fonts.playful, fontSize: 17, color: playful.ink, fontVariant: ['tabular-nums'] },
  remind: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  remindText: { fontSize: 13, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  pills: { gap: 8, paddingHorizontal: space.lg, paddingBottom: 4 },
  pill: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: playful.chip,
  },
  pillOn: { backgroundColor: playful.chipOn },
  pillText: { fontFamily: fonts.playfulBold, fontSize: 13.5, color: playful.ink },
  pillTextOn: { color: playful.chipOnText },
  hint: { marginTop: space.sm, marginHorizontal: 18, fontSize: 15, color: colors.textSecondary },
  // Moments on a thread, straight on the cream (the prototype's timeline).
  moments: { paddingHorizontal: 14, paddingTop: 6 },
  moment: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: MOMENT_ICON + 18, paddingVertical: 9 },
  thread: {
    position: 'absolute',
    left: MOMENT_ICON / 2 - 1,
    top: 9 + MOMENT_ICON,
    bottom: -9,
    width: 2,
    borderRadius: 1,
    backgroundColor: playful.dash,
  },
  momentIcon: { width: MOMENT_ICON, height: MOMENT_ICON, borderRadius: MOMENT_ICON / 2, alignItems: 'center', justifyContent: 'center' },
  momentLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  momentText: { fontSize: 14.5, lineHeight: 19, color: playful.ink },
  momentTextShrink: { flexShrink: 1 },
  times: { height: 20, paddingHorizontal: 7, borderRadius: 10, justifyContent: 'center', backgroundColor: playful.chipOn },
  timesText: { fontSize: 11, lineHeight: 14, fontWeight: '800', color: playful.chipOnText },
  momentEnd: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  when: { fontSize: 12, color: colors.textSecondary },
  thumb: { width: PHOTO_THUMB, height: PHOTO_THUMB, alignItems: 'center', justifyContent: 'center' },
  showMore: { alignSelf: 'center', minHeight: 44, paddingHorizontal: space.lg, justifyContent: 'center' },
  showMoreText: { fontFamily: fonts.playful, fontSize: 14, color: colors.brandText },
});
