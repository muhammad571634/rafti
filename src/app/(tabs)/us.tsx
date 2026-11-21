import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useScrollToTop } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, type ScrollViewInstance, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkText } from '@/components/ink';
import { MoreSheet } from '@/components/more-sheet';
import { PaywallSheet } from '@/components/paywall-sheet';
import { CharacterAvatar, EmptyState, GlassButton, PressableScale, Screen, SFIcon } from '@/components/ui';
import { BondShareSheet } from '@/components/us/bond-share-sheet';
import { LivingBondHero } from '@/components/us/living-bond-hero';
import { OurMoments } from '@/components/us/moments';
import { PlanCalendar } from '@/components/us/plan-calendar';
import { PlanSheet, type NewPlan } from '@/components/us/plan-sheet';
import { PublishSheet, type PublishKind } from '@/components/us/publish-sheet';
import { TalkedWith, talkHue, useTalkShares } from '@/components/us/talked-with';
import { useDayKey } from '@/hooks/use-day-key';
import { useInboxUnread } from '@/hooks/use-inbox-unread';
import { nextAlarmAt, ringsOnDay } from '@/lib/alarms';
import { daysBetween, shortName } from '@/lib/format';
import { reminderAt } from '@/lib/schedule';
import { dateFromKey, dayKey, levelForIntimacy, shellCosts } from '@/mock';
import { displayName, shareReward, useAppStore } from '@/store/use-app-store';
import { colors, friendAccent, hitSlop, space, systemColors, TAB_BAR_HEIGHT } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';

/** The friend strip's portrait size and ring spacing. */
const STORY = 50;
const STORY_RING = 2;
const STORY_GAP = 2;
const WHITE = '#FFFFFF';

/**
 * [Us]: one bond at a time — Living Bond Hero on top, unified Week/Month & Plans card in the
 * middle, editorial Our Moments below, and a quiet Month Circle + More at the foot.
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
  const removeSchedule = useAppStore((s) => s.removeSchedule);
  const addSchedule = useAppStore((s) => s.addSchedule);
  const spendShells = useAppStore((s) => s.spendShells);
  const wallet = useAppStore((s) => s.wallet);
  const [paywall, setPaywall] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

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

  const pickPublish = (kind: PublishKind) => {
    setPublishOpen(false);
    if (kind === 'plan') setPlanOpen(true);
    else if (kind === 'diary' && selected) router.push({ pathname: '/diary/write', params: { characterId: selected.character.id } });
    else if (kind === 'diary') router.push('/diary/write');
    else if (selected) router.push({ pathname: '/board/write', params: { characterId: selected.character.id } });
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
          <InkText variant="caption" color={WHITE}>
            {unread > 99 ? '99+' : unread}
          </InkText>
        </View>
      ) : null}
    </View>
  );

  const addButton = <GlassButton icon="add" accessibilityLabel={t('us.add')} onPress={() => setPublishOpen(true)} />;

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
        {bell}
        {addButton}
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xxl }}>
        {/* 1. Quiet Friend Strip: active friend glows in their own accent, others recede calmly. */}
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
          onShare={() => setSharing(true)}
        />

        {/* 3. Unified Week / Month & Plans Card */}
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

        {/* 4. Editorial Our Moments */}
        <OurMoments character={character} relationship={relationship} today={today} onOpenDay={openDay} />

        {/* 5. Quiet Month Circle */}
        <TalkedWith selectedId={character.id} onSelectFriend={selectFromCircle} />

        {/* 6. Quiet More Row */}
        <View style={[styles.card, styles.moreCard]}>
          <PressableScale
            scaleTo={0.98}
            dimOnPress={false}
            accessibilityRole="button"
            accessibilityLabel={t('more.title')}
            onPress={() => setMoreOpen(true)}
            style={styles.moreRow}>
            <View style={styles.moreTile}>
              <Ionicons name="ellipsis-horizontal" size={19} color={ink.text} />
            </View>
            <InkText style={styles.grow}>{t('more.title')}</InkText>
            <Ionicons name="chevron-forward" size={16} color={ink.text3} />
          </PressableScale>
        </View>
      </ScrollView>

      <PublishSheet
        visible={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPick={pickPublish}
        name={shortName(displayName(character, relationship))}
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
      <MoreSheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        // From a friend's page the quiz and a scene are with that friend; truth or dare and a time skip play inside the chat.
        hide={friendChatId ? ['truthOrDare', 'timeSkip', 'twist'] : ['truthOrDare', 'timeSkip', 'twist', 'scene']}
        onChatPick={(key) => {
          if (key === 'quiz') router.push({ pathname: '/quiz/[characterId]', params: { characterId: character.id } });
          else if (key === 'scene' && friendChatId) router.push({ pathname: '/scenes/[conversationId]', params: { conversationId: friendChatId } });
        }}
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
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xs,
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
  picker: { gap: 12, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xs },
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
  card: {
    marginHorizontal: 14,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  moreCard: { marginTop: 16 },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, minHeight: 56 },
  moreTile: { width: 32, height: 32, borderRadius: 8, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: ink.raised },
});
