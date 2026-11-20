import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NIGHT_SWITCH } from '@/components/alarms/night';
import { untilText } from '@/components/alarms/night-kit';
import { InkIconButton, InkNavBar, InkText, PillButton } from '@/components/ink';
import { CharacterAvatar, PressableScale, Screen, Txt, useScrolledPast } from '@/components/ui';
import { alarmTime, uses12Hour } from '@/lib/alarm-format';
import { nextAlarmAt } from '@/lib/alarms';
import { weekdayNames } from '@/lib/calendar';
import { haptic } from '@/lib/haptics';
import { displayName, useAppStore } from '@/store/use-app-store';
import { bottomRoom, colors, friendAccent, space, systemColors } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';
import type { Alarm, Character } from '@/types';

const HERO_FACE = 68;
const ROW_FACE = 46;
const BED_BG = '#07070B';
const DOCK_BG = 'rgba(7,7,11,0.94)';

/**
 * Wake-up alarms (approved Ink Night+ prototype): nocturnal `#07070B` ground with next-friend
 * ambient wash, sticky Apple HIG nav bar with "+", friend-accent Next Alarm hero card, hairline-
 * rimmed swipe-to-delete alarm cards with friend-colored repeat days, and an anchored white Add dock.
 */
export default function AlarmsScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { scrolled, onScroll } = useScrolledPast(34);
  const alarms = useAppStore((s) => s.alarms);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const setAlarmEnabled = useAppStore((s) => s.setAlarmEnabled);
  const deleteAlarm = useAppStore((s) => s.deleteAlarm);
  const h12 = uses12Hour();
  // Monday first, as the editor; the store keeps 0 = Sunday.
  const weekdays = useMemo(
    () => weekdayNames(i18n.language).map((name, i) => ({ name: name.slice(0, 2), day: (i + 1) % 7 })),
    [i18n.language],
  );

  const friendOf = (id?: string) => characters.find((c) => c.id === id);
  const nameOf = (c?: Character) => (c ? displayName(c, relationships[c.id]) : undefined);

  const sorted = [...alarms].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  const next = useMemo(() => {
    const now = new Date();
    return alarms
      .filter((a) => a.enabled)
      .map((a) => ({ a, at: nextAlarmAt(a, now) }))
      .sort((x, y) => x.at.getTime() - y.at.getTime())[0];
  }, [alarms]);

  const nextFriend = next ? friendOf(next.a.characterId) : undefined;
  const nextAccent = nextFriend ? friendAccent(nextFriend.id).strong : ink.accent;

  const add = () => router.push('/alarms/edit');
  const open = (alarm: Alarm) => router.push({ pathname: '/alarms/edit', params: { id: alarm.id } });
  const clock = (a: Pick<Alarm, 'hour' | 'minute'>) => {
    const { time, period } = alarmTime(a.hour, a.minute, h12);
    return { time, period: period ? t(`alarms.${period}`) : null };
  };

  return (
    <Screen background={BED_BG} statusBarStyle="light">
      <LinearGradient
        pointerEvents="none"
        colors={[`${nextAccent}24`, 'rgba(7,7,11,0)']}
        start={{ x: 0.25, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.ambient}
      />

      <InkNavBar
        backLabel={t('common.back')}
        onBack={() => router.back()}
        title={t('alarms.title')}
        scrolled={scrolled}
        right={<InkIconButton icon="add" size={22} accessibilityLabel={t('alarms.add')} onPress={add} />}
      />

      {sorted.length === 0 ? (
        <View style={styles.emptyWrap}>
          <InkText variant="display" accessibilityRole="header" style={styles.title}>
            {t('alarms.title')}
          </InkText>
          <View style={styles.empty}>
            <View style={styles.emptyBell}>
              <Ionicons name="alarm" size={44} color={ink.accent} />
            </View>
            <InkText variant="bodyStrong" color={ink.text}>
              {t('alarms.empty')}
            </InkText>
          </View>
        </View>
      ) : (
        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 112 }]}
          showsVerticalScrollIndicator={false}>
          <InkText variant="display" accessibilityRole="header" style={styles.titleInline}>
            {t('alarms.title')}
          </InkText>

          {next ? (
            <PressableScale
              onPress={() => open(next.a)}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={[t('alarms.next'), clock(next.a).time, untilText(t, next.at.getTime() - Date.now())].join(', ')}
              style={styles.hero}>
              <LinearGradient
                pointerEvents="none"
                colors={[`${nextAccent}24`, `${nextAccent}00`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.72, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Face friend={nextFriend} size={HERO_FACE} ringColor={nextAccent} />
              <View style={styles.heroText}>
                <Txt style={[styles.heroLabel, { color: nextAccent }]}>{t('alarms.next').toUpperCase()}</Txt>
                <Txt style={styles.heroTime} maxFontSizeMultiplier={1.2}>
                  {clock(next.a).time}
                  {clock(next.a).period ? <Txt style={styles.heroPeriod}>{` ${clock(next.a).period}`}</Txt> : null}
                </Txt>
                <View style={styles.until}>
                  <Ionicons name="moon" size={13} color={ink.accent} />
                  <Txt style={styles.untilText} lines={1}>
                    {nextFriend ? `${nameOf(nextFriend)} · ` : ''}
                    {untilText(t, next.at.getTime() - Date.now())}
                  </Txt>
                </View>
              </View>
            </PressableScale>
          ) : (
            <View style={[styles.hero, styles.heroOff]}>
              <Ionicons name="moon" size={18} color={ink.text2} />
              <InkText variant="sub" color={ink.text2}>
                {t('alarms.noneOn')}
              </InkText>
            </View>
          )}

          {sorted.map((alarm) => {
            const friend = friendOf(alarm.characterId);
            const acc = friend ? friendAccent(friend.id).strong : ink.accent;
            const { time, period } = clock(alarm);
            const title = alarm.label || nameOf(friend) || t('alarms.defaultLabel');
            const subtitle = friend && alarm.label ? `${alarm.label} · ${nameOf(friend)}` : title;
            return (
              <ReanimatedSwipeable
                key={alarm.id}
                friction={2}
                rightThreshold={40}
                containerStyle={styles.swipe}
                renderRightActions={() => (
                  <Pressable
                    style={styles.delete}
                    onPress={() => deleteAlarm(alarm.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('alarms.deleteAlarm')}>
                    <Ionicons name="trash" size={20} color={colors.white} />
                    <Txt style={styles.deleteText}>{t('alarms.delete')}</Txt>
                  </Pressable>
                )}>
                <View style={styles.card}>
                  <Pressable
                    style={[styles.cardBody, !alarm.enabled && styles.off]}
                    onPress={() => open(alarm)}
                    accessibilityRole="button"
                    accessibilityLabel={[period ? `${time} ${period}` : time, subtitle].join(', ')}>
                    <Face friend={friend} size={ROW_FACE} ringColor={alarm.enabled ? acc : undefined} />
                    <View style={styles.cardText}>
                      <Txt style={styles.time} maxFontSizeMultiplier={1.2}>
                        {time}
                        {period ? <Txt style={styles.period}>{` ${period}`}</Txt> : null}
                      </Txt>
                      {alarm.repeat.length ? (
                        <View style={styles.days}>
                          {weekdays.map(({ name, day }) => {
                            const on = alarm.repeat.includes(day);
                            return (
                              <Txt key={day} style={[styles.day, on && { color: acc, fontWeight: '700' }]}>
                                {name}
                              </Txt>
                            );
                          })}
                        </View>
                      ) : null}
                      <Txt style={styles.line} lines={1}>
                        {subtitle}
                      </Txt>
                    </View>
                  </Pressable>
                  <Switch
                    value={alarm.enabled}
                    onValueChange={(v) => {
                      haptic.toggle(v);
                      setAlarmEnabled(alarm.id, v);
                    }}
                    accessibilityLabel={t('alarms.toggle', { time: period ? `${time} ${period}` : time })}
                    {...NIGHT_SWITCH}
                  />
                </View>
              </ReanimatedSwipeable>
            );
          })}
        </ScrollView>
      )}

      <View style={[styles.dock, { paddingBottom: bottomRoom(insets.bottom, space.md) }]}>
        <PillButton label={t('alarms.add')} icon="add" onPress={add} />
      </View>
    </Screen>
  );
}

/** Who wakes you: their ringed face, or a warm dark-glass bell for a melody-only alarm. */
function Face({ friend, size, ringColor }: { friend?: Character; size: number; ringColor?: string }) {
  const outer = ringColor ? size + 6 : size;
  return (
    <View
      style={[
        styles.faceWrap,
        {
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderWidth: ringColor ? 1.8 : 0,
          borderColor: ringColor ?? 'transparent',
        },
      ]}>
      {friend ? (
        <CharacterAvatar character={friend} size={size} />
      ) : (
        <View style={[styles.bell, { width: size, height: size, borderRadius: size / 2 }]}>
          <Ionicons name="musical-notes" size={size * 0.4} color={ink.accent} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  emptyWrap: { flex: 1 },
  title: { paddingHorizontal: inkGutter, marginTop: 2 },
  titleInline: { marginTop: 2, marginBottom: 4 },
  scroll: { paddingHorizontal: inkGutter, gap: 10 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
    marginBottom: 4,
  },
  heroOff: { gap: 10, paddingVertical: 18 },
  heroText: { flex: 1, minWidth: 0, gap: 2 },
  heroLabel: { ...inkFace('caption'), letterSpacing: 0.5 },
  heroTime: { ...inkFace('numeralMid'), fontSize: 42, lineHeight: 46, color: ink.text },
  heroPeriod: { ...inkFace('subStrong'), color: ink.text2 },
  until: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  untilText: { ...inkFace('footnote'), color: ink.text2, fontVariant: ['tabular-nums'], flexShrink: 1 },
  faceWrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  bell: {
    backgroundColor: 'rgba(235,173,132,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(235,173,132,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipe: {
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
    backgroundColor: ink.card,
  },
  cardBody: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  off: { opacity: 0.42 },
  cardText: { flex: 1, minWidth: 0, gap: 3 },
  time: { ...inkFace('numeralSmall'), fontSize: 30, lineHeight: 34, color: ink.text },
  period: { ...inkFace('footnoteStrong'), color: ink.text2 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  day: { ...inkFace('caption'), fontSize: 11, color: 'rgba(235,235,245,0.28)' },
  line: { ...inkFace('footnote'), color: ink.text2 },
  delete: { width: 92, backgroundColor: systemColors.red, alignItems: 'center', justifyContent: 'center', gap: 4 },
  deleteText: { ...inkFace('caption'), color: colors.white },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 110 },
  emptyBell: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(235,173,132,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(235,173,132,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: inkGutter,
    paddingTop: 12,
    backgroundColor: DOCK_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ink.edge,
  },
});
