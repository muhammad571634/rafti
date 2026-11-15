import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useScrollToTop } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, type ScrollViewInstance, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { InkText } from '@/components/ink';
import { CharacterAvatar, EmptyState, GlassButton, PressableScale, Screen, SFIcon, ShellIcon, UserAvatar } from '@/components/ui';
import { PaywallSheet } from '@/components/paywall-sheet';
import { BondShareSheet } from '@/components/us/bond-share-sheet';
import { OurMoments } from '@/components/us/moments';
import { PlanCalendar } from '@/components/us/plan-calendar';
import { PlanSheet, type NewPlan } from '@/components/us/plan-sheet';
import { PublishSheet, type PublishKind } from '@/components/us/publish-sheet';
import { TalkedWith, talkHue, useTalkShares } from '@/components/us/talked-with';
import { MoreSheet } from '@/components/more-sheet';
import { useDayKey } from '@/hooks/use-day-key';
import { useInboxUnread } from '@/hooks/use-inbox-unread';
import { phrase } from '@/i18n';
import { daysBetween, shortName } from '@/lib/format';
import { nextAlarmAt, ringsOnDay } from '@/lib/alarms';
import { reminderAt } from '@/lib/schedule';
import { dateFromKey, dayKey, levelForIntimacy, shellCosts } from '@/mock';
import { displayName, shareReward, useAppStore } from '@/store/use-app-store';
import { colors, friendColor, hitSlop, isDark, space, systemColors, TAB_BAR_HEIGHT } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';

/** The friend picker's faces, and the ring of their own hue round the chosen one. */
const STORY = 56;
const STORY_RING = 3;
const STORY_GAP = 2;
/** The bond's rings (Apple Health's score rings): size, stroke, the gap between them. */
const RINGS = 124;
const RING_W = 12;
const RING_GAP = 3;
const PAIR = 26;
/** A streak counts towards a full inner ring over a week. */
const STREAK_WEEK = 7;
const WHITE = '#FFFFFF';

/**
 * The rings' colours (owner, 2026-11-13: soft, never loud, for day and night): a quiet indigo for
 * closeness to the next level and a quiet pink for the streak, each on a faint track of itself,
 * brighter at night as Apple's rings are on black.
 */
const RING_HUES = isDark
  ? { outer: '#9C93FF', outerTrack: 'rgba(156,147,255,0.22)', inner: '#FF8CC0', innerTrack: 'rgba(255,140,192,0.22)' }
  : { outer: '#7A6FF0', outerTrack: 'rgba(122,111,240,0.16)', inner: '#EF6FA9', innerTrack: 'rgba(239,111,169,0.16)' };

/**
 * [Us]: one bond at a time — how long, how close, what's next and what you've shared. The playful
 * skin (design-style §10, the approved four-tab prototype): Apple's white ground, friends ringed in their
 * own hue, the bond as a card with Apple Health-style rings, the week as capsules, moments as cards.
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
  const reward = useAppStore((s) => shareReward(s.daily, selectedId ? `bond:${selectedId}` : undefined));
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

  // A plan in the moments opens its day in the calendar: the day is picked and the screen scrolls up to it.
  const calendarY = useRef(0);
  const toCalendar = () => scrollRef.current?.scrollTo({ y: Math.max(0, calendarY.current - space.md), animated: true });
  const openDay = (key: string) => {
    setDay(key);
    toCalendar();
  };
  // Opened for a day (a plan in the whole story, a plan set from the chat): its day is picked while
  // rendering above; here the screen scrolls up to the calendar that shows it.
  useEffect(() => {
    if (openedAt && opened.day) toCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedAt]);

  const plans = useMemo(
    () => schedules.filter((x) => x.characterId === selected?.character.id),
    [schedules, selected],
  );
  // The wake-ups this friend gives you sit on their day too (owner, 2026-11-07: "I set it in the
  // chat, why is it not on Us?"); they stay alarms (no plan reminders), a tap opens the alarm.
  const alarms = useAppStore((s) => s.alarms);
  const friendAlarms = useMemo(() => alarms.filter((a) => a.enabled && a.characterId === selected?.character.id), [alarms, selected]);
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
  // Days you talked with this friend: a dot in their disc's colour on the calendar.
  const friendChatId = useMemo(() => conversations.find((c) => c.characterId === selected?.character.id)?.id, [conversations, selected]);
  const friendMessages = useAppStore((s) => (friendChatId ? s.messages[friendChatId] : undefined));
  const talkedDays = useMemo(() => {
    const days = new Set<string>();
    for (const m of friendMessages ?? []) {
      if ((m.kind === 'text' || m.kind === 'voice' || m.kind === 'image') && !m.failed && !m.pending) days.add(dayKey(m.createdAt));
    }
    return days;
  }, [friendMessages]);
  const shares = useTalkShares();
  const talkColor = talkHue(shares, selected?.character.id);
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
    // A plan with a friend costs what the texts about it cost (`shellCosts.planSetup`), as from the chat.
    if (wallet.shells < shellCosts.planSetup) {
      setPlanOpen(false);
      setPaywall(shellCosts.planSetup);
      return;
    }
    if (addSchedule({ characterId: selected.character.id, ...plan })) spendShells(shellCosts.planSetup, 'setup', selected.character.id);
    setPlanOpen(false);
    setDay(plan.date);
  };

  // Notifications live here, as a bell beside "+" (BIMOBIMO keeps them on Us too).
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
                <InkText variant="caption" color={active ? ink.text : ink.text2} lines={1}>
                  {shortName(displayName(c, r))}
                </InkText>
              </PressableScale>
            );
          })}
        </ScrollView>

        {/* The bond at a glance, as Apple Health shows a score: two rings (closeness to the next
            level, the week's streak) with the level inside, the figures beside them; it opens the chat. */}
        <View style={styles.bond}>
          <PressableScale
            scaleTo={0.99}
            disabled={!conversation}
            accessibilityRole="button"
            accessibilityLabel={`${displayName(character, relationship)}, ${t('us.level', { level: relationship.level })}, ${days} ${t('us.daysLabel', { count: days })}`}
            onPress={() => conversation && router.push(`/chat/${conversation.id}`)}
            style={styles.bondMain}>
            <BondRings closeness={progress} streak={Math.min(relationship.streakDays, STREAK_WEEK) / STREAK_WEEK} level={relationship.level} label={t('us.ringLevel')} />
            <View style={styles.grow}>
              <View style={styles.daysLine}>
                <InkText variant="figure">{days}</InkText>
                <InkText variant="subStrong">{t('us.daysShort', { count: days })}</InkText>
              </View>
              <InkText variant="subStrong" color={ink.text2} lines={1}>
                {phrase(relationship.levelTitle)}
              </InkText>
              <View style={styles.legend}>
                <Legend color={RING_HUES.outer} value={String(relationship.intimacy)} label={t('us.statIntimacy')} />
                <Legend color={RING_HUES.inner} value={String(relationship.streakDays)} label={t('us.statStreak')} />
                <Legend
                  value={new Date(relationship.anniversary).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}
                  label={t('us.statMet')}
                />
              </View>
            </View>
          </PressableScale>

          <View style={styles.bondFoot}>
            <View style={styles.pair} pointerEvents="none">
              <UserAvatar user={user} size={PAIR} style={styles.pairFace} />
              <CharacterAvatar character={character} size={PAIR} style={[styles.pairFace, styles.overlap]} />
            </View>
            <InkText variant="footnote" lines={1} style={[styles.grow, styles.tabular]}>
              {t('us.toLevel', {
                count: Math.max(0, relationship.nextLevelAt - relationship.intimacy),
                level: relationship.level + 1,
              })}
            </InkText>
            {/* Share opens the bond's card (HIG Activity views): small, beside the figures, today's reward on it. */}
            <PressableScale
              style={styles.share}
              scaleTo={0.95}
              haptic
              accessibilityRole="button"
              accessibilityLabel={`${t('common.share')}, ${days} ${t('us.daysLabel', { count: days })}${reward ? `, +${reward} ${t('common.shells')}` : ''}`}
              onPress={() => setSharing(true)}>
              <SFIcon ios="square.and.arrow.up" icon="share-outline" size={15} color={ink.text} />
              <InkText variant="subStrong">{t('common.share')}</InkText>
              {reward ? (
                <View style={styles.reward}>
                  <InkText variant="caption" color={ink.accent}>{`+${reward}`}</InkText>
                  <ShellIcon size={12} />
                </View>
              ) : null}
            </PressableScale>
          </View>
        </View>

        <TalkedWith />

        <View onLayout={(e) => (calendarY.current = e.nativeEvent.layout.y)}>
          <PlanCalendar value={day} onChange={setDay} today={today} marked={planDays} talked={talkedDays} talkColor={talkColor} title={t('us.yourDays')} />
        </View>

        <InkText variant="cardSmall" accessibilityRole="header" style={styles.section}>
          {day === today ? t('common.today') : dayTitle(day, i18n.language)}
        </InkText>
        <View style={styles.card}>
          {dayAlarms.map((alarm, i) => (
            <PressableScale
              key={alarm.id}
              scaleTo={0.98}
              dimOnPress={false}
              accessibilityRole="button"
              accessibilityLabel={`${clock(new Date(2000, 0, 1, alarm.hour, alarm.minute))}, ${alarm.label || t('alarms.defaultLabel')}`}
              onPress={() => router.push({ pathname: '/alarms/edit', params: { id: alarm.id } })}
              style={styles.planRow}>
              <TimeTile time={clock(new Date(2000, 0, 1, alarm.hour, alarm.minute))} />
              <View style={[styles.planBody, (i < dayAlarms.length - 1 || dayPlans.length > 0) && styles.line]}>
                <InkText lines={2} style={styles.grow}>
                  {alarm.label || t('alarms.defaultLabel')}
                </InkText>
                <Ionicons name="alarm" size={18} color={ink.text2} />
              </View>
            </PressableScale>
          ))}
          {dayPlans.length === 0 && dayAlarms.length === 0 ? (
            // The day is free: one quiet line, and one tap plans something.
            <View style={styles.free}>
              <InkText variant="sub" style={styles.grow}>
                {t('us.nothingPlanned')}
              </InkText>
              <PressableScale style={styles.planPill} scaleTo={0.94} accessibilityRole="button" onPress={() => setPlanOpen(true)}>
                <Ionicons name="add" size={16} color={ink.accent} />
                <InkText variant="subStrong" color={ink.accent}>
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
                    <InkText lines={2} style={styles.grow}>
                      {item.title}
                    </InkText>
                    {pending ? (
                      <View style={styles.remind}>
                        <Ionicons name="notifications" size={12} color={ink.text2} />
                        <InkText variant="footnote" style={styles.tabular}>
                          {clock(reminderAt(item))}
                        </InkText>
                      </View>
                    ) : item.followedUp ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    ) : null}
                    <PressableScale
                      hitSlop={hitSlop}
                      scaleTo={0.85}
                      accessibilityLabel={t('a11y.removePlan')}
                      onPress={() => removeSchedule(item.id)}>
                      <Ionicons name="close-circle" size={20} color={ink.text3} />
                    </PressableScale>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <OurMoments character={character} relationship={relationship} today={today} onOpenDay={openDay} />

        {/* One More (audit §6.2): the features people look for, the same sheet as the chat's "+". */}
        <View style={[styles.card, styles.moreCard]}>
          <PressableScale scaleTo={0.98} dimOnPress={false} accessibilityRole="button" accessibilityLabel={t('more.title')} onPress={() => setMoreOpen(true)} style={styles.moreRow}>
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
        name={selected ? shortName(displayName(selected.character, selected.relationship)) : ''}
      />
      <PlanSheet
        visible={planOpen}
        onClose={() => setPlanOpen(false)}
        day={day}
        character={selected?.character}
        onSubmit={submitPlan}
        cost={shellCosts.planSetup}
      />
      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />
      <MoreSheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        // From a friend's page the quiz and a scene are with that friend; truth or dare and a time skip play inside the chat.
        hide={friendChatId ? ['truthOrDare', 'timeSkip'] : ['truthOrDare', 'timeSkip', 'scene']}
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
function TimeTile({ time }: { time?: string }) {
  if (!time) {
    return (
      <View style={[styles.planIcon, { backgroundColor: systemColors.red }]}>
        <SFIcon ios="calendar" icon="calendar" size={16} color={colors.white} />
      </View>
    );
  }
  return (
    <View style={styles.timeTile}>
      <InkText variant="bodyStrong" style={styles.tabular}>
        {time}
      </InkText>
    </View>
  );
}

/**
 * Two rings, as Apple Health draws a score: the outer fills with closeness to the next level, the
 * inner with the streak over a week, each starting at twelve with its glyph on a cap of its colour;
 * the level inside.
 */
function BondRings({ closeness, streak, level, label }: { closeness: number; streak: number; level: number; label: string }) {
  const outerR = (RINGS - RING_W) / 2;
  const innerR = outerR - RING_W - RING_GAP;
  const arc = (r: number, share: number, color: string) => {
    const c = 2 * Math.PI * r;
    const shown = Math.max(0, Math.min(1, share));
    return shown > 0 ? (
      <Circle cx={RINGS / 2} cy={RINGS / 2} r={r} fill="none" stroke={color} strokeWidth={RING_W} strokeLinecap="round" strokeDasharray={`${c * shown} ${c}`} />
    ) : null;
  };
  return (
    <View style={styles.rings}>
      <Svg width={RINGS} height={RINGS} style={styles.ringSvg}>
        <Circle cx={RINGS / 2} cy={RINGS / 2} r={outerR} fill="none" stroke={RING_HUES.outerTrack} strokeWidth={RING_W} />
        <Circle cx={RINGS / 2} cy={RINGS / 2} r={innerR} fill="none" stroke={RING_HUES.innerTrack} strokeWidth={RING_W} />
        {arc(outerR, closeness, RING_HUES.outer)}
        {arc(innerR, streak, RING_HUES.inner)}
      </Svg>
      <View style={[styles.cap, { top: 0, backgroundColor: RING_HUES.outer }]}>
        <Ionicons name="heart" size={8} color={WHITE} />
      </View>
      <View style={[styles.cap, { top: RING_W + RING_GAP, backgroundColor: RING_HUES.inner }]}>
        <Ionicons name="flame" size={8} color={WHITE} />
      </View>
      <View style={styles.ringLabel}>
        <InkText variant="figure">{level}</InkText>
        <InkText variant="caption" lines={1}>
          {label}
        </InkText>
      </View>
    </View>
  );
}

/** One figure beside the rings: its ring's colour (none for the date), the number, what it counts. */
function Legend({ color, value, label }: { color?: string; value: string; label: string }) {
  return (
    <View style={styles.legendRow}>
      {color ? <View style={[styles.legendDot, { backgroundColor: color }]} /> : <Ionicons name="calendar-outline" size={12} color={ink.text2} />}
      <InkText variant="subStrong" lines={1} style={styles.tabular}>
        {value}
      </InkText>
      <InkText variant="footnote" lines={1} style={styles.legendLabel}>
        {label}
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
  picker: { gap: 12, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs },
  pick: { alignItems: 'center', gap: 5, width: STORY + (STORY_RING + STORY_GAP) * 2 },
  // A ring with a gap of ground round the face; only the chosen bond's is coloured.
  storyRing: {
    padding: STORY_GAP,
    borderWidth: STORY_RING,
    borderRadius: inkRadius.pill,
    borderColor: 'transparent',
  },
  // The bond as a card on the night ground, the rings and figures on it (Apple Health).
  bond: {
    marginHorizontal: 14,
    marginTop: 14,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  bondMain: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rings: { width: RINGS, height: RINGS, alignItems: 'center', justifyContent: 'center' },
  // The arcs start at twelve o'clock.
  ringSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  cap: { position: 'absolute', left: RINGS / 2 - RING_W / 2, width: RING_W, height: RING_W, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { alignItems: 'center', maxWidth: RINGS - (RING_W * 2 + RING_GAP) * 2 },
  daysLine: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  legend: { marginTop: 8, gap: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: inkRadius.pill, marginHorizontal: 2 },
  legendLabel: { flexShrink: 1 },
  bondFoot: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  pair: { flexDirection: 'row' },
  pairFace: { borderWidth: 2, borderColor: ink.card, borderRadius: inkRadius.pill },
  overlap: { marginLeft: -8 },
  // Share: a small grey capsule, today's reward riding on it.
  share: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: inkRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ink.raised,
  },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 2 },
  section: { marginTop: 20, marginBottom: 8, marginHorizontal: 18 },
  card: { marginHorizontal: 14, borderRadius: inkRadius.card, borderCurve: 'continuous', backgroundColor: ink.card, overflow: 'hidden' },
  moreCard: { marginTop: 20 },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, minHeight: 56 },
  moreTile: { width: 32, height: 32, borderRadius: 8, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: ink.raised },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.line },
  free: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.lg, paddingRight: 10 },
  // Planning costs shells, so the pill is the money peach.
  planPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 36,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: inkRadius.pill,
    backgroundColor: colors.primarySoft,
  },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  planBody: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingRight: space.lg },
  planIcon: { width: 32, height: 32, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'center' },
  timeTile: { minWidth: 48, justifyContent: 'center' },
  remind: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
