import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyRewardSheet } from '@/components/daily-reward-sheet';
import { featuredFriend, TodayHero } from '@/components/today-hero';
import { useDayKey } from '@/hooks/use-day-key';
import {
  AuroraGlass,
  CharacterAvatar,
  ClayIcon,
  PressableScale,
  Screen,
  ShellIcon,
  Txt,
  UserAvatar,
  type ClayIconName,
} from '@/components/ui';
import { nextAlarmAt } from '@/lib/alarms';
import { relativeStamp, shortName } from '@/lib/format';
import { planStart } from '@/lib/schedule';
import { FREE_SPINS_PER_DAY } from '@/mock';
import { checkInStatus, displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { aurora, colors, hitSlop, moduleTiles, space, TAB_BAR_HEIGHT, widgetTones } from '@/theme';
import type { Character } from '@/types';

/** The six modules that are not widgets, as app-icon tiles (owner's pick: B with tiles). */
const TILES: { key: string; icon: ClayIconName; route: string }[] = [
  { key: 'store', icon: 'store', route: '/store/shell' },
  { key: 'photo', icon: 'camera', route: '/photo-booth' },
  { key: 'contacts', icon: 'contacts', route: '/contacts' },
  { key: 'gifts', icon: 'gift', route: '/gifts' },
  { key: 'radio', icon: 'radio', route: '/radio' },
  { key: 'board', icon: 'board', route: '/board' },
];
const TILE = 52;
const WIDGET_HEIGHT = 158;
const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

/**
 * The Today hub on the aurora ground, built from HIG Widgets ("prefer dynamic information that
 * changes throughout the day"): the date and a large title with glass wallet and profile, the
 * friend you talked with last, one "Waiting for you" row while chats are unread, four live
 * widgets (Calls, Diary, Date, Sleep), a sealed note when one is ready, then the other six
 * modules as app-icon tiles. Every widget keeps its module one tap away. The free spin lives
 * on the Gifts tile's badge; the daily gift claims itself on launch (its popup).
 */
export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useAppStore((s) => s.user);
  const wallet = useAppStore((s) => s.wallet);
  const conversations = useAppStore((s) => s.conversations);
  const messages = useAppStore((s) => s.messages);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const notes = useAppStore((s) => s.notes);
  const diaryPages = useAppStore((s) => s.characterDiary);
  const pagesRead = useAppStore((s) => s.diaryPagesRead);
  const schedules = useAppStore((s) => s.schedules);
  const alarms = useAppStore((s) => s.alarms);
  const writeDuePages = useAppStore((s) => s.writeDueDiaryPages);
  const today = useDayKey();
  const spinReady = useAppStore((s) => s.daily.spinDay !== today || s.daily.spinsUsed < FREE_SPINS_PER_DAY);
  const giftWaiting = useAppStore((s) => !checkInStatus(s.daily, today).claimed);

  const charactersById = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  const nameOf = (c: Character) => shortName(displayName(c, relationships[c.id]));
  const hero = useMemo(
    () => featuredFriend(characters, relationships, conversations, messages),
    [characters, relationships, conversations, messages],
  );

  // Coming back in the morning: pages written overnight should be waiting here.
  useFocusEffect(useCallback(() => writeDuePages(), [writeDuePages]));

  const friends = useMemo(
    () =>
      [...conversations]
        .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt))
        .flatMap((conversation) => {
          const character = charactersById.get(conversation.characterId);
          return character ? [{ conversation, character }] : [];
        }),
    [conversations, charactersById],
  );
  const unread = friends.filter((f) => f.conversation.unreadCount > 0);
  const unreadCount = unread.reduce((sum, f) => sum + f.conversation.unreadCount, 0);

  // Calls: the friend you would ring now, and the minutes left to do it.
  const caller = hero?.character.voiceReady ? hero.character : friends.find((f) => f.character.voiceReady)?.character;
  const callMinutes = Math.floor(minutesOf(wallet, 'call').total / 60);

  // Diary: pages friends wrote today that are still unread.
  const freshPages = diaryPages.filter((p) => p.date === today && !pagesRead.includes(p.id));
  const writers = [...new Set(freshPages.map((p) => p.characterId))]
    .map((id) => charactersById.get(id))
    .filter((c): c is Character => !!c);
  const lastPage = freshPages.length
    ? undefined
    : [...diaryPages]
        .sort((a, b) => Date.parse(b.writtenAt) - Date.parse(a.writtenAt))
        .find((p) => charactersById.has(p.characterId));
  const lastWriter = lastPage ? charactersById.get(lastPage.characterId) : undefined;

  // Date: the next plan still ahead today.
  const now = Date.now();
  const plan = schedules
    .filter((p) => (p.date === today ? !p.time || planStart(p).getTime() > now : p.date > today))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))[0];
  const planDay =
    plan && plan.date !== today
      ? new Date(`${plan.date}T12:00:00`).toLocaleDateString(i18n.language, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      : undefined;
  const planFriend = plan ? charactersById.get(plan.characterId) : undefined;
  const planChat = plan ? conversations.find((c) => c.characterId === plan.characterId) : undefined;

  // Sleep: the next alarm that will ring.
  const alarm = alarms
    .filter((a) => a.enabled)
    .map((a) => ({ a, at: nextAlarmAt(a, new Date(now)).getTime() }))
    .sort((x, y) => x.at - y.at)[0]?.a;
  const alarmFriend = alarm?.characterId ? charactersById.get(alarm.characterId) : undefined;

  // A sealed note, one sender.
  const note = notes.find((n) => n.status === 'ready' && charactersById.has(n.characterId));
  const noteFrom = note ? charactersById.get(note.characterId) : undefined;

  const dateLine = new Date(now)
    .toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();
  const names = unread.slice(0, 3).map((f) => nameOf(f.character));
  const namesLine =
    names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} ${t('home.and')} ${names[names.length - 1]}`;

  return (
    <Screen background="aurora">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xxl }}>
        <View style={styles.head}>
          <View style={styles.flex}>
            <Txt style={styles.date} lines={1}>
              {dateLine}
            </Txt>
            <Txt style={styles.title} accessibilityRole="header">
              {t('home.today')}
            </Txt>
          </View>
          <PressableScale
            scaleTo={0.92}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel={`${wallet.shells} ${t('common.shells')}`}
            onPress={() => router.push('/store/shell?tab=shells')}>
            <AuroraGlass style={styles.wallet}>
              <ShellIcon size={18} />
              <Txt style={styles.walletText}>{wallet.shells}</Txt>
            </AuroraGlass>
          </PressableScale>
          <PressableScale
            scaleTo={0.92}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.profile')}
            onPress={() => router.push('/profile')}>
            <AuroraGlass style={styles.profile}>
              <UserAvatar user={user} size={34} />
            </AuroraGlass>
          </PressableScale>
        </View>
        {hero ? <TodayHero friend={hero} onPress={() => router.push(`/chat/${hero.conversation.id}`)} /> : null}

        {unread.length > 0 ? (
          <PressableScale
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={`${t('home.waiting')}, ${namesLine}, ${unreadCount}`}
            onPress={() => router.navigate('/(tabs)/chat')}
            style={[styles.card, styles.waiting]}>
            <View style={styles.faces}>
              {unread.slice(0, 3).map((f, i) => (
                <CharacterAvatar
                  key={f.character.id}
                  character={f.character}
                  size={36}
                  ring
                  ringColor={colors.surface}
                  style={i > 0 && styles.overlap}
                />
              ))}
            </View>
            <View style={styles.flex}>
              <Txt style={styles.rowTitle}>{t('home.waiting')}</Txt>
              <Txt variant="caption" color={aurora.textMuted} lines={1}>
                {namesLine}
              </Txt>
            </View>
            <View style={styles.count}>
              <Txt variant="caption" color={colors.white}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={16} color={aurora.textMuted} />
          </PressableScale>
        ) : null}

        <View style={styles.widgets}>
          {/* Calls: graphite, the room's one dark card by day. */}
          <View style={[styles.widget, { backgroundColor: widgetTones.calls }]}>
            <PressableScale
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={t('home.modules.callHistory')}
              onPress={() => router.push('/call-history')}
              style={styles.widgetFill}>
              <ClayIcon name="calls" size={50} tile={false} />
              <View>
                <Txt style={[styles.widgetTitle, styles.onDark]} lines={1}>
                  {caller ? t('home.widget.call', { name: nameOf(caller) }) : t('home.short.calls')}
                </Txt>
                <Txt variant="caption" color={colors.onMediaMuted} lines={1}>
                  {callMinutes > 0 ? t('home.widget.minutesLeft', { count: callMinutes }) : t('home.widget.hearVoice')}
                </Txt>
              </View>
            </PressableScale>
            {caller ? (
              <PressableScale
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel={t('home.widget.call', { name: nameOf(caller) })}
                onPress={() => router.push(`/call/${caller.id}`)}
                style={styles.callButton}>
                <CharacterAvatar character={caller} size={34} />
                <View style={styles.callDot}>
                  <Ionicons name="call" size={10} color={colors.white} />
                </View>
              </PressableScale>
            ) : null}
          </View>

          <PressableScale
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={t('home.modules.heartbeatDiary')}
            onPress={() => {
              const page = freshPages[0] ?? lastPage;
              if (page)
                router.push({
                  pathname: '/diary/page/[characterId]',
                  params: { characterId: page.characterId, date: page.date },
                });
              else router.push('/diary');
            }}
            style={[styles.widget, styles.card]}>
            <View style={styles.widgetTop}>
              <ClayIcon name="diary" size={50} tile={false} />
              <View style={styles.faces}>
                {(lastWriter ? [lastWriter] : writers.slice(0, 2)).map((c, i) => (
                  <CharacterAvatar
                    key={c.id}
                    character={c}
                    size={28}
                    ring
                    ringColor={colors.surface}
                    style={i > 0 && styles.overlap}
                  />
                ))}
              </View>
            </View>
            {freshPages.length > 0 ? (
              <View>
                <View style={styles.figureLine}>
                  <Txt style={styles.figure}>{freshPages.length}</Txt>
                  <Txt style={styles.figureUnit}>{t('home.widget.newPages', { count: freshPages.length })}</Txt>
                </View>
                <Txt variant="caption" color={aurora.textMuted}>
                  {t('home.short.diary')}
                </Txt>
              </View>
            ) : lastWriter && lastPage ? (
              <View>
                <Txt style={styles.widgetTitle} lines={1}>
                  {t('home.widget.pageOf', { name: nameOf(lastWriter) })}
                </Txt>
                <Txt variant="caption" color={aurora.textMuted} lines={1}>
                  {relativeStamp(lastPage.writtenAt)}
                </Txt>
              </View>
            ) : (
              <View>
                <Txt style={styles.widgetTitle}>{t('home.short.diary')}</Txt>
                <Txt variant="caption" color={aurora.textMuted}>
                  {t('home.widget.writeToday')}
                </Txt>
              </View>
            )}
          </PressableScale>

          <PressableScale
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={plan ? plan.title : t('home.modules.dating')}
            onPress={() => (planChat ? router.push(`/chat/${planChat.id}`) : router.push('/dating'))}
            style={[styles.widget, styles.card]}>
            <View style={styles.widgetTop}>
              <ClayIcon name="date" size={50} tile={false} />
              {planFriend ? <CharacterAvatar character={planFriend} size={28} /> : null}
            </View>
            {plan ? (
              <View>
                <Txt style={styles.figure}>{plan.time ?? t('home.today')}</Txt>
                <Txt variant="caption" color={aurora.textMuted} lines={1}>
                  {planDay ? `${planDay} · ${plan.title}` : plan.title}
                </Txt>
              </View>
            ) : (
              <View>
                <Txt style={styles.widgetTitle}>{t('home.short.dating')}</Txt>
                <Txt variant="caption" color={aurora.textMuted}>
                  {t('home.widget.planDate')}
                </Txt>
              </View>
            )}
          </PressableScale>

          <PressableScale
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={t('home.modules.bedtime')}
            onPress={() => router.push('/bedtime')}
            style={styles.widget}>
            <LinearGradient
              colors={widgetTones.sleep}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.6, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <ClayIcon name="bedtime" size={50} tile={false} />
            {alarm ? (
              <View>
                <Txt style={[styles.figure, styles.onDark]}>{hhmm(alarm.hour, alarm.minute)}</Txt>
                <Txt variant="caption" color={colors.onMediaMuted} lines={1}>
                  {alarmFriend
                    ? t('home.widget.wakeWith', {
                        label: alarm.label || t('home.widget.wakeUp'),
                        name: nameOf(alarmFriend),
                      })
                    : alarm.label || t('home.widget.wakeUp')}
                </Txt>
              </View>
            ) : (
              <View>
                <Txt style={[styles.widgetTitle, styles.onDark]}>{t('home.short.bedtime')}</Txt>
                <Txt variant="caption" color={colors.onMediaMuted}>
                  {t('home.widget.setWake')}
                </Txt>
              </View>
            )}
          </PressableScale>
        </View>

        {note && noteFrom ? (
          <PressableScale
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={t('home.todo.note', { name: nameOf(noteFrom) })}
            onPress={() => router.push(`/secret-note/${noteFrom.id}`)}
            style={[styles.card, styles.noteRow]}>
            <ClayIcon name="secretNote" size={46} tile={false} />
            <View style={styles.flex}>
              <Txt style={styles.rowTitle} lines={1}>
                {t('home.todo.note', { name: nameOf(noteFrom) })}
              </Txt>
              <Txt variant="caption" color={aurora.textMuted}>
                {t('home.widget.sealed')}
              </Txt>
            </View>
            <CharacterAvatar character={noteFrom} size={34} />
          </PressableScale>
        ) : null}

        <View style={styles.tiles}>
          {TILES.map((tile) => {
            const badge = tile.key === 'gifts' && (spinReady || giftWaiting);
            return (
              <PressableScale
                key={tile.key}
                scaleTo={0.92}
                accessibilityRole="button"
                accessibilityLabel={t(`home.short.${tile.key}`)}
                onPress={() => router.push(tile.route as never)}
                style={styles.tileCell}>
                <LinearGradient colors={moduleTiles[tile.key]} style={styles.tile}>
                  <ClayIcon name={tile.icon} size={38} tile={false} />
                </LinearGradient>
                {badge ? (
                  <View style={styles.badge}>
                    <Txt style={styles.badgeText}>1</Txt>
                  </View>
                ) : null}
                <Txt style={styles.tileLabel} lines={1}>
                  {t(`home.short.${tile.key}`)}
                </Txt>
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>
      {/* The day's check-in shows here only, never over a chat or another tab. */}
      <DailyRewardSheet />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  date: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4, color: aurora.textMuted },
  // iOS large title: 34pt bold.
  title: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.4, color: colors.text },
  wallet: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  walletText: { fontSize: 15, fontWeight: '700', color: colors.text },
  profile: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  card: { backgroundColor: colors.surface },
  waiting: {
    marginHorizontal: space.lg,
    marginTop: space.lg,
    height: 64,
    borderRadius: 20,
    paddingLeft: space.md,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  faces: { flexDirection: 'row' },
  overlap: { marginLeft: -12 },
  rowTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  count: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
  },
  widgets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingHorizontal: space.lg, marginTop: space.lg },
  // Two to a row: half the width less half the gap.
  widget: {
    width: '48.3%',
    flexGrow: 1,
    height: WIDGET_HEIGHT,
    borderRadius: 24,
    padding: 14,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  widgetFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    padding: 14,
    justifyContent: 'space-between',
  },
  widgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  widgetTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  onDark: { color: colors.white },
  figureLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  figure: { fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5, color: colors.text },
  figureUnit: { fontSize: 15, fontWeight: '600', color: colors.text },
  callButton: { position: 'absolute', top: 14, right: 14 },
  callDot: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: widgetTones.calls,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteRow: {
    marginHorizontal: space.lg,
    marginTop: space.md,
    height: 76,
    borderRadius: 22,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  tiles: { flexDirection: 'row', paddingHorizontal: space.sm, marginTop: space.xl },
  tileCell: { flex: 1, alignItems: 'center', gap: 6 },
  // iOS app-icon squircle: ~22% corner radius.
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassLine,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: aurora.base,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  tileLabel: { fontSize: 11, fontWeight: '500', color: colors.text },
});
