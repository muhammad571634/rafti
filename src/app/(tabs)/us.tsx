import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useScrollToTop } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, type ScrollViewInstance, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SFSymbol } from 'sf-symbols-typescript';

import { InkText } from '@/components/ink';
import { PaywallSheet } from '@/components/paywall-sheet';
import { CharacterAvatar, EmptyState, GlassButton, PressableScale, Screen, SFIcon, Sheet } from '@/components/ui';
import { BondShareSheet } from '@/components/us/bond-share-sheet';
import { ChaptersSheet } from '@/components/us/chapters-sheet';
import { LivingBondHero } from '@/components/us/living-bond-hero';
import { OurMoments } from '@/components/us/moments';
import { PlanCalendar } from '@/components/us/plan-calendar';
import { PlanSheet, type NewPlan } from '@/components/us/plan-sheet';
import { PublishSheet, type PublishKind } from '@/components/us/publish-sheet';
import { TALK_HUES, TalkedWith, talkHue, useTalkShares } from '@/components/us/talked-with';
import { TogetherSheet, type TogetherKind } from '@/components/us/together-sheet';
import { isActiveMemory } from '@/economy/memory-limit';
import { useDayKey } from '@/hooks/use-day-key';
import { useInboxUnread } from '@/hooks/use-inbox-unread';
import { nextAlarmAt, ringsOnDay } from '@/lib/alarms';
import { daysBetween, shortName } from '@/lib/format';
import { reminderAt } from '@/lib/schedule';
import { dateFromKey, dayKey, levelForIntimacy, shellCosts } from '@/mock';
import { DATE_PLACES } from '@/mock/dates';
import { displayName, shareReward, useAppStore } from '@/store/use-app-store';
import { colors, friendAccent, hitSlop, space, systemColors, TAB_BAR_HEIGHT } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';

/** The friend strip's portrait size and ring spacing. */
const STORY = 50;
const STORY_RING = 2;
const STORY_GAP = 2;

/**
 * [Us] v3: one bond at a time on a clean 20 pt Ink grid — compact Month Circle header capsule +
 * "+" Add to us, single Friend Strip, Living Bond Hero (tappable Story Chapters + Call + Share),
 * 2x2 direct doors to existing full screens (Memories, Dates, Heartbeat Diary, Together), unified
 * Week/Month & Plans card, and calm Our Moments below.
 */
export default function UsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollViewInstance>(null);
  useScrollToTop(scrollRef);

  const relationships = useAppStore((s) => s.relationships);
  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const schedules = useAppStore((s) => s.schedules);
  const memories = useAppStore((s) => s.memories);
  const dates = useAppStore((s) => s.dates);
  const characterDiary = useAppStore((s) => s.characterDiary);
  const myDiary = useAppStore((s) => s.diary);
  const removeSchedule = useAppStore((s) => s.removeSchedule);
  const addSchedule = useAppStore((s) => s.addSchedule);
  const spendShells = useAppStore((s) => s.spendShells);
  const wallet = useAppStore((s) => s.wallet);

  const [paywall, setPaywall] = useState<number | null>(null);
  const [togetherOpen, setTogetherOpen] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [circleOpen, setCircleOpen] = useState(false);

  const today = useDayKey();
  const [day, setDay] = useState(today);
  const [publishOpen, setPublishOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
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
  // Opened for one friend and day (a plan set from the chat, a plan in Notifications): the tab stays
  // mounted, so each open carries `at` and is applied once, while rendering (no effect, no flash).
  const opened = useLocalSearchParams<{ friend?: string; day?: string; at?: string }>();
  const [openedAt, setOpenedAt] = useState<string | undefined>(undefined);
  if (opened.at && opened.at !== openedAt) {
    setOpenedAt(opened.at);
    if (opened.friend) setSelectedId(opened.friend);
    if (opened.day && /^\d{4}-\d{2}-\d{2}$/.test(opened.day)) setDay(opened.day);
  }
  const selected = bonds.find((b) => b.character.id === selectedId) ?? bonds[0];
  const activeId = selected?.character.id;
  const reward = useAppStore((s) => shareReward(s.daily, activeId ? `bond:${activeId}` : undefined));

  // A plan in the moments opens its day in the calendar: the day is picked and the screen scrolls up to it.
  const calendarY = useRef(0);
  const toCalendar = () => scrollRef.current?.scrollTo({ y: Math.max(0, calendarY.current - space.md), animated: true });
  const openDay = (key: string) => {
    setDay(key);
    toCalendar();
  };
  useEffect(() => {
    if (openedAt && opened.day) toCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedAt]);

  const selectFromCircle = useCallback(
    (characterId: string) => {
      if (!bonds.some((b) => b.character.id === characterId)) return;
      setSelectedId(characterId);
      setCircleOpen(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    },
    [bonds],
  );

  const plans = useMemo(() => schedules.filter((x) => x.characterId === activeId), [schedules, activeId]);
  // The wake-ups this friend gives you sit on their day too; they stay alarms (a tap opens the alarm).
  const alarms = useAppStore((s) => s.alarms);
  const friendAlarms = useMemo(() => alarms.filter((a) => a.enabled && a.characterId === activeId), [alarms, activeId]);
  const dayAlarms = useMemo(
    () => friendAlarms.filter((a) => ringsOnDay(a, day, new Date())).sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)),
    [friendAlarms, day],
  );
  // A dot for a one-time wake-up's day; a repeating one would dot every week.
  const planDays = useMemo(() => {
    const days = new Set(plans.map((x) => x.date));
    for (const a of friendAlarms) if (!a.repeat.length) days.add(dayKey(nextAlarmAt(a, new Date())));
    return days;
  }, [plans, friendAlarms]);
  // Days you talked with this friend: a dot in their colour on the calendar.
  const friendChatId = useMemo(() => conversations.find((c) => c.characterId === activeId)?.id, [conversations, activeId]);
  const friendMessages = useAppStore((s) => (friendChatId ? s.messages[friendChatId] : undefined));
  const talkedDays = useMemo(() => {
    const days = new Set<string>();
    for (const m of friendMessages ?? []) {
      if ((m.kind === 'text' || m.kind === 'voice' || m.kind === 'image') && !m.failed && !m.pending) days.add(dayKey(m.createdAt));
    }
    return days;
  }, [friendMessages]);

  const shares = useTalkShares();
  const talkColor = talkHue(shares, activeId) ?? (activeId ? friendAccent(activeId).strong : undefined);
  const dayPlans = useMemo(
    () => plans.filter((x) => x.date === day).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    [plans, day],
  );

  const memoryCount = useMemo(
    () => (activeId ? memories.filter((m) => m.characterId === activeId && isActiveMemory(m)).length : 0),
    [memories, activeId],
  );
  const dateCount = useMemo(
    () => (activeId ? dates.filter((d) => d.characterId === activeId).length : 0),
    [dates, activeId],
  );
  const diaryCount = useMemo(
    () =>
      activeId
        ? characterDiary.filter((p) => p.characterId === activeId).length +
          myDiary.filter((d) => d.sharedWithCharacterId === activeId).length
        : 0,
    [characterDiary, myDiary, activeId],
  );

  const pickPublish = (kind: PublishKind) => {
    setPublishOpen(false);
    if (kind === 'plan') setPlanOpen(true);
    else if (kind === 'alarm' && selected) router.push({ pathname: '/alarms/edit', params: { characterId: selected.character.id } });
    else if (kind === 'diary' && selected) router.push({ pathname: '/diary/write', params: { characterId: selected.character.id } });
    else if (kind === 'diary') router.push('/diary/write');
    else if (selected) router.push({ pathname: '/board/write', params: { characterId: selected.character.id } });
  };

  const pickTogether = (kind: TogetherKind) => {
    setTogetherOpen(false);
    if (!selected) return;
    const cid = selected.character.id;
    switch (kind) {
      case 'photoBooth':
        return router.push({ pathname: '/photo-booth', params: { partner: cid } });
      case 'quiz':
        return router.push({ pathname: '/quiz/[characterId]', params: { characterId: cid } });
      case 'board':
        return router.push('/board');
      case 'scene':
        if (friendChatId) router.push({ pathname: '/scenes/[conversationId]', params: { conversationId: friendChatId } });
    }
  };

  const submitPlan = (plan: NewPlan) => {
    if (!selected) return;
    if (wallet.shells < shellCosts.planSetup) {
      setPlanOpen(false);
      setPaywall(shellCosts.planSetup);
      return;
    }
    if (addSchedule({ characterId: selected.character.id, ...plan })) spendShells(shellCosts.planSetup, 'setup', selected.character.id);
    setPlanOpen(false);
    setDay(plan.date);
  };

  const bell = (
    <View>
      <GlassButton
        icon="notifications-outline"
        accessibilityLabel={unread > 0 ? t('us.notificationsNew', { count: unread }) : t('notifications.title')}
        onPress={() => router.push('/notifications')}
      />
      {unread > 0 ? (
        <View style={styles.badge} pointerEvents="none">
          <InkText variant="caption" color={ink.onBadge}>
            {unread > 99 ? '99+' : unread}
          </InkText>
        </View>
      ) : null}
    </View>
  );

  const addButton = <GlassButton icon="add" accessibilityLabel={t('us.add')} onPress={() => setPublishOpen(true)} />;

  const now = new Date();
  const shortMonthRaw = new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(now);
  const shortMonth = shortMonthRaw.charAt(0).toLocaleUpperCase(i18n.language) + shortMonthRaw.slice(1);
  const longMonthRaw = new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(now);
  const longMonth = longMonthRaw.charAt(0).toLocaleUpperCase(i18n.language) + longMonthRaw.slice(1);
  const topShare = shares[0];
  const topPercent = topShare ? (topShare.percent > 0 ? `${topShare.percent}%` : '<1%') : '';

  const monthPill = topShare ? (
    <PressableScale
      scaleTo={0.94}
      haptic
      accessibilityRole="button"
      accessibilityLabel={t('us.monthCircle', { month: longMonth })}
      onPress={() => setCircleOpen(true)}
      style={styles.monthCapsule}>
      <View style={[styles.monthDot, { backgroundColor: TALK_HUES[0][0] }]} />
      <InkText variant="caption" color={ink.text} lines={1} style={styles.tabular}>
        {`${shortMonth} · ${topPercent}`}
      </InkText>
    </PressableScale>
  ) : null;

  if (!selected) {
    return (
      <Screen background={ink.ground}>
        <View style={styles.head}>
          <InkText variant="display" style={styles.grow}>
            {t('us.title')}
          </InkText>
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
  const first = shortName(displayName(character, relationship));

  const daySchedule = (
    <View style={styles.scheduleWrap}>
      {day !== today ? (
        <InkText variant="caption" color={ink.text3} style={styles.pickedDayLabel}>
          {dayTitle(day, i18n.language)}
        </InkText>
      ) : null}

      {dayAlarms.map((alarm, i) => (
        <PressableScale
          key={alarm.id}
          scaleTo={0.98}
          dimOnPress={false}
          accessibilityRole="button"
          accessibilityLabel={`${clock(new Date(2000, 0, 1, alarm.hour, alarm.minute))}, ${alarm.label || t('alarms.defaultLabel')}`}
          onPress={() => router.push({ pathname: '/alarms/edit', params: { id: alarm.id } })}
          style={styles.planRow}>
          <TimeTile time={clock(new Date(2000, 0, 1, alarm.hour, alarm.minute))} accent />
          <View style={[styles.planBody, (i < dayAlarms.length - 1 || dayPlans.length > 0) && styles.line]}>
            <InkText variant="sub" color={ink.text} lines={2} style={styles.grow}>
              {alarm.label || t('alarms.defaultLabel')}
            </InkText>
            <Ionicons name="alarm-outline" size={17} color={ink.text3} />
          </View>
        </PressableScale>
      ))}

      {dayPlans.length === 0 && dayAlarms.length === 0 ? (
        <View style={styles.free}>
          <InkText variant="sub" style={styles.grow}>
            {t('us.nothingPlanned')}
          </InkText>
          <PressableScale style={styles.planPill} scaleTo={0.94} accessibilityRole="button" onPress={() => setPlanOpen(true)}>
            <Ionicons name="add" size={15} color={ink.accent} />
            <InkText variant="footnoteStrong" color={ink.accent}>
              {t('us.plan')}
            </InkText>
          </PressableScale>
        </View>
      ) : (
        dayPlans.map((item, i) => {
          const pending = !item.reminded && reminderAt(item).getTime() > Date.now();
          return (
            <View key={item.id} style={styles.planRow}>
              <TimeTile time={item.time} />
              <View style={[styles.planBody, i < dayPlans.length - 1 && styles.line]}>
                <InkText variant="sub" color={ink.text} lines={2} style={styles.grow}>
                  {item.title}
                </InkText>
                {pending ? (
                  <View style={styles.remind}>
                    <Ionicons name="notifications-outline" size={12} color={ink.text3} />
                    <InkText variant="footnote" color={ink.text3} style={styles.tabular}>
                      {clock(reminderAt(item))}
                    </InkText>
                  </View>
                ) : item.followedUp ? (
                  <Ionicons name="checkmark-circle" size={17} color={colors.success} />
                ) : null}
                <PressableScale
                  hitSlop={hitSlop}
                  scaleTo={0.85}
                  accessibilityLabel={t('a11y.removePlan')}
                  onPress={() => removeSchedule(item.id)}>
                  <Ionicons name="close-circle" size={19} color={ink.text3} />
                </PressableScale>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <Screen background={ink.ground}>
      <View style={styles.head}>
        <InkText variant="display" style={styles.grow}>
          {t('us.title')}
        </InkText>
        {monthPill}
        {bell}
        {addButton}
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xxl }}>
        {/* 1. Single Quiet Friend Strip: active friend glows in their own accent, others recede calmly. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
          {bonds.map(({ character: c, relationship: r }) => {
            const active = c.id === character.id;
            const accent = friendAccent(c.id);
            return (
              <PressableScale
                key={c.id}
                style={styles.pick}
                scaleTo={0.94}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setSelectedId(c.id)}>
                <View
                  style={[
                    styles.storyRing,
                    active
                      ? { borderColor: accent.strong, backgroundColor: accent.soft }
                      : styles.storyRingIdle,
                  ]}>
                  <CharacterAvatar character={c} size={STORY} />
                </View>
                <InkText variant="caption" color={active ? ink.text : ink.text3} lines={1}>
                  {shortName(displayName(c, r))}
                </InkText>
              </PressableScale>
            );
          })}
        </ScrollView>

        {/* 2. Living Bond Hero Card */}
        <LivingBondHero
          character={character}
          relationship={relationship}
          days={days}
          progress={progress}
          reward={reward}
          canChat={Boolean(conversation)}
          onOpenChat={() => conversation && router.push(`/chat/${conversation.id}`)}
          onOpenChapters={() => setChaptersOpen(true)}
          onCall={() => router.push(`/call/${character.id}`)}
          onShare={() => setSharing(true)}
        />

        {/* 3. 2x2 Direct Doors to Existing Full Screens (Memories, Dates, Heartbeat Diary, Together) */}
        <View style={styles.tilesGrid}>
          <View style={styles.tilesRow}>
            <SharedTile
              ios="sparkles"
              icon="sparkles"
              fill={systemColors.indigo}
              title={t('memories.title')}
              sub={t('us.savedCount', { count: memoryCount })}
              onPress={() => router.push({ pathname: '/character/[id]/memories', params: { id: character.id } })}
            />
            <SharedTile
              ios="heart.fill"
              icon="heart"
              fill={systemColors.pink}
              title={t('us.datesTile')}
              sub={dateCount > 0 ? t('us.datesDoneCount', { count: dateCount }) : t('us.datesPlacesCount', { count: DATE_PLACES.length })}
              onPress={() => router.push({ pathname: '/dating', params: { partner: character.id } })}
            />
          </View>
          <View style={styles.tilesRow}>
            <SharedTile
              ios="book.closed.fill"
              icon="book"
              fill={systemColors.orange}
              title={t('home.short.diary')}
              sub={t('us.pagesCount', { count: diaryCount })}
              onPress={() => router.push('/diary')}
            />
            <SharedTile
              ios="camera.fill"
              icon="camera"
              fill={systemColors.blue}
              title={t('us.togetherTile')}
              sub={t('us.togetherSub')}
              onPress={() => setTogetherOpen(true)}
            />
          </View>
        </View>

        {/* 4. Unified Week / Month & Plans Card */}
        <View onLayout={(e) => (calendarY.current = e.nativeEvent.layout.y)}>
          <PlanCalendar
            value={day}
            onChange={setDay}
            today={today}
            marked={planDays}
            talked={talkedDays}
            talkColor={talkColor}
            title={t('us.yourDays')}
            footer={daySchedule}
          />
        </View>

        {/* 5. Calm Editorial Our Moments */}
        <OurMoments character={character} relationship={relationship} today={today} onOpenDay={openDay} />
      </ScrollView>

      <PublishSheet
        visible={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPick={pickPublish}
        name={first}
      />
      <PlanSheet
        visible={planOpen}
        onClose={() => setPlanOpen(false)}
        day={day}
        character={character}
        onSubmit={submitPlan}
        cost={shellCosts.planSetup}
      />
      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
      <TogetherSheet
        visible={togetherOpen}
        onClose={() => setTogetherOpen(false)}
        name={first}
        canScene={Boolean(friendChatId)}
        onPick={pickTogether}
      />
      <ChaptersSheet
        visible={chaptersOpen}
        onClose={() => setChaptersOpen(false)}
        character={character}
        relationship={relationship}
        days={days}
        onOpenProfile={() => router.push(`/character/${character.id}`)}
      />
      <Sheet
        visible={circleOpen}
        onClose={() => setCircleOpen(false)}
        title={t('us.monthCircle', { month: longMonth })}
        scroll>
        <TalkedWith selectedId={character.id} onSelectFriend={selectFromCircle} inSheet />
      </Sheet>
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

/** One compact 2x2 door card on Us with a coloured Apple iOS icon tile and wrapping 2-line labels. */
function SharedTile({
  ios,
  icon,
  fill,
  title,
  sub,
  onPress,
}: {
  ios: SFSymbol;
  icon: keyof typeof Ionicons.glyphMap;
  fill: string;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      scaleTo={0.97}
      haptic
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${sub}`}
      style={styles.tileCard}>
      <View style={[styles.tileIcon, { backgroundColor: fill }]}>
        <SFIcon ios={ios} icon={icon} size={18} color={ink.text} />
      </View>
      <View style={styles.tileText}>
        <InkText variant="subStrong" lines={2}>
          {title}
        </InkText>
        <InkText variant="caption" color={ink.text3} lines={2} style={styles.tabular}>
          {sub}
        </InkText>
      </View>
      <Ionicons name="chevron-forward" size={14} color={ink.text3} />
    </PressableScale>
  );
}

const clock = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function dayTitle(key: string, locale: string) {
  return dateFromKey(key).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** A plan's time in bold beside the title; the iOS Calendar glyph when it has none. */
function TimeTile({ time, accent }: { time?: string; accent?: boolean }) {
  if (!time) {
    return (
      <View style={[styles.planIcon, { backgroundColor: systemColors.red }]}>
        <SFIcon ios="calendar" icon="calendar" size={15} color={colors.white} />
      </View>
    );
  }
  return (
    <View style={styles.timeTile}>
      <InkText variant="subStrong" color={accent ? ink.accent : ink.text} style={styles.tabular}>
        {time}
      </InkText>
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  tabular: { fontVariant: ['tabular-nums'] },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: inkGutter,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  monthCapsule: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: inkRadius.pill,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  monthDot: {
    width: 7,
    height: 7,
    borderRadius: inkRadius.pill,
  },
  // The red count on the bell, ringed in the ground colour so it reads as cut out of it.
  badge: {
    position: 'absolute',
    top: -4,
    right: -5,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.danger,
    borderWidth: 2,
    borderColor: ink.ground,
  },
  picker: { gap: 12, paddingHorizontal: inkGutter, paddingTop: space.sm, paddingBottom: space.xs },
  pick: { alignItems: 'center', gap: 5, width: STORY + (STORY_RING + STORY_GAP) * 2 + 4 },
  storyRing: {
    padding: STORY_GAP,
    borderWidth: STORY_RING,
    borderRadius: inkRadius.pill,
  },
  storyRingIdle: {
    borderColor: ink.edge,
    opacity: 0.65,
  },
  tilesGrid: {
    marginHorizontal: inkGutter,
    marginTop: 14,
    gap: 10,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tileCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: inkRadius.field,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  scheduleWrap: { paddingVertical: 4 },
  pickedDayLabel: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
    textTransform: 'capitalize',
  },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.line },
  free: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: 16, paddingRight: 12 },
  // Planning costs shells, so the pill uses the calm night peach.
  planPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 32,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: inkRadius.pill,
    backgroundColor: colors.primarySoft,
  },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16 },
  planBody: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 14, paddingVertical: 8 },
  planIcon: { width: 28, height: 28, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'center' },
  timeTile: { minWidth: 46, justifyContent: 'center' },
  remind: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
