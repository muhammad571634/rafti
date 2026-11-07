import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { NIGHT_SWITCH } from '@/components/alarms/night';
import { CharacterAvatar, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { alarmTime, uses12Hour } from '@/lib/alarm-format';
import { nextAlarmAt } from '@/lib/alarms';
import { weekdayNames } from '@/lib/calendar';
import { haptic } from '@/lib/haptics';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, fonts, sleepColors as night, space, systemColors } from '@/theme';
import type { Alarm, Character } from '@/types';

/** The next alarm's face, as the picked face in the editor; a row's face is smaller. */
const HERO_FACE = 84;
const ROW_FACE = 52;

/**
 * Wake-up alarms, in the same look as the editor (owner, 2026-11-07: "make the list match the new
 * alarm screen, ultra"; no prototype at his word). On Bedtime's navy: the next alarm as one big card
 * (who wakes you, the time, how long until it rings; a tap opens it), then each alarm as its own
 * card with the friend's face, the time, its days and a switch; a swipe to the left deletes one.
 * One big button adds an alarm.
 */
export default function AlarmsScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const alarms = useAppStore((s) => s.alarms);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const setAlarmEnabled = useAppStore((s) => s.setAlarmEnabled);
  const deleteAlarm = useAppStore((s) => s.deleteAlarm);
  const h12 = uses12Hour();
  // Monday first, as the editor; the store keeps 0 = Sunday.
  const weekdays = useMemo(() => weekdayNames(i18n.language).map((name, i) => ({ name: name.slice(0, 2), day: (i + 1) % 7 })), [i18n.language]);

  const friendOf = (id?: string) => characters.find((c) => c.id === id);
  // The name the user calls them ("Mom"), as the chat header shows it.
  const nameOf = (c?: Character) => (c ? displayName(c, relationships[c.id]) : undefined);

  const sorted = [...alarms].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  // The soonest alarm that is on, for the card on top.
  const next = useMemo(() => {
    const now = new Date();
    return alarms
      .filter((a) => a.enabled)
      .map((a) => ({ a, at: nextAlarmAt(a, now) }))
      .sort((x, y) => x.at.getTime() - y.at.getTime())[0];
  }, [alarms]);

  const add = () => router.push('/alarms/edit');
  const open = (alarm: Alarm) => router.push({ pathname: '/alarms/edit', params: { id: alarm.id } });
  const clock = (a: Pick<Alarm, 'hour' | 'minute'>) => {
    const { time, period } = alarmTime(a.hour, a.minute, h12);
    return { time, period: period ? t(`alarms.${period}`) : null };
  };

  return (
    <Screen background={night.bg} statusBarStyle="light">
      <Header tint={night.text} />
      <Txt style={styles.title} accessibilityRole="header">
        {t('alarms.title')}
      </Txt>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyBell}>
            <Ionicons name="alarm" size={56} color={night.textOnPrimary} />
          </View>
          <Txt style={styles.emptyText}>{t('alarms.empty')}</Txt>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {next ? (
            <PressableScale
              onPress={() => open(next.a)}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={[t('alarms.next'), clock(next.a).time, until(t, next.at)].join(', ')}
              style={styles.hero}>
              <Face friend={friendOf(next.a.characterId)} size={HERO_FACE} ring />
              <View style={styles.heroText}>
                <Txt style={styles.heroLabel}>{t('alarms.next').toUpperCase()}</Txt>
                <Txt style={styles.heroTime} maxFontSizeMultiplier={1.2}>
                  {clock(next.a).time}
                  {clock(next.a).period ? <Txt style={styles.heroPeriod}>{` ${clock(next.a).period}`}</Txt> : null}
                </Txt>
                <View style={styles.until}>
                  <Ionicons name="moon" size={14} color={night.primary} />
                  <Txt style={styles.untilText}>{until(t, next.at)}</Txt>
                </View>
              </View>
            </PressableScale>
          ) : (
            <View style={[styles.hero, styles.heroOff]}>
              <Ionicons name="moon" size={20} color={night.textSecondary} />
              <Txt style={styles.untilText}>{t('alarms.noneOn')}</Txt>
            </View>
          )}

          {sorted.map((alarm) => {
            const friend = friendOf(alarm.characterId);
            const { time, period } = clock(alarm);
            const title = alarm.label || nameOf(friend) || t('alarms.defaultLabel');
            return (
              <ReanimatedSwipeable
                key={alarm.id}
                friction={2}
                rightThreshold={40}
                containerStyle={styles.swipe}
                renderRightActions={() => (
                  <Pressable style={styles.delete} onPress={() => deleteAlarm(alarm.id)} accessibilityRole="button" accessibilityLabel={t('alarms.deleteAlarm')}>
                    <Ionicons name="trash" size={22} color={colors.white} />
                    <Txt style={styles.deleteText}>{t('alarms.delete')}</Txt>
                  </Pressable>
                )}>
                <View style={styles.card}>
                  <Pressable
                    style={[styles.cardBody, !alarm.enabled && styles.off]}
                    onPress={() => open(alarm)}
                    accessibilityRole="button"
                    accessibilityLabel={[period ? `${time} ${period}` : time, title].join(', ')}>
                    <Face friend={friend} size={ROW_FACE} />
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
                              <Txt key={day} style={[styles.day, on && styles.dayOn]}>
                                {name}
                              </Txt>
                            );
                          })}
                        </View>
                      ) : null}
                      <Txt style={styles.line} lines={1}>
                        {title}
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

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <PressableScale onPress={add} accessibilityRole="button" style={styles.cta}>
          <Ionicons name="add" size={24} color={night.textOnPrimary} />
          <Txt style={styles.ctaText} maxFontSizeMultiplier={1.2}>
            {t('alarms.add')}
          </Txt>
        </PressableScale>
      </View>
    </Screen>
  );
}

/** "in 8 h 30 min" until a ring. */
function until(t: (key: string, options?: Record<string, unknown>) => string, at: Date) {
  const mins = Math.max(1, Math.round((at.getTime() - Date.now()) / 60_000));
  return mins < 60 ? t('alarms.inMinutes', { m: mins }) : t('alarms.inTime', { h: Math.floor(mins / 60), m: String(mins % 60).padStart(2, '0') });
}

/** Who wakes you: their face, or a bell for a melody-only alarm. Radii in numbers (Android draws 999 square). */
function Face({ friend, size, ring }: { friend?: Character; size: number; ring?: boolean }) {
  const pad = ring ? 3 : 0;
  const border = ring ? 3 : 0;
  return (
    <View style={[ring && styles.ring, { padding: pad, borderWidth: border, borderRadius: size / 2 + pad + border }]}>
      {friend ? (
        <CharacterAvatar character={friend} size={size} />
      ) : (
        <View style={[styles.bell, { width: size, height: size, borderRadius: size / 2 }]}>
          <Ionicons name="musical-notes" size={size * 0.42} color={night.textOnPrimary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: night.text,
  },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.sm + 2 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: 28, backgroundColor: night.surface, marginBottom: space.sm },
  heroOff: { gap: space.sm, paddingVertical: space.lg },
  heroText: { flex: 1, gap: 2 },
  heroLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: night.primary },
  heroTime: { fontFamily: fonts.display, fontSize: 56, lineHeight: 64, color: night.text, fontVariant: ['tabular-nums'] },
  heroPeriod: { fontFamily: fonts.display, fontSize: 20, color: night.textSecondary },
  until: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  untilText: { fontSize: 15, color: night.textSecondary },
  ring: { borderColor: night.primary },
  bell: { backgroundColor: night.primary, alignItems: 'center', justifyContent: 'center' },
  swipe: { borderRadius: 22, overflow: 'hidden' },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.md, backgroundColor: night.surface },
  cardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  off: { opacity: 0.45 },
  cardText: { flex: 1, gap: 2 },
  time: { fontFamily: fonts.display, fontSize: 38, lineHeight: 44, color: night.text, fontVariant: ['tabular-nums'] },
  period: { fontFamily: fonts.display, fontSize: 16, color: night.textSecondary },
  days: { flexDirection: 'row', gap: 6 },
  day: { fontSize: 12, fontWeight: '600', color: night.textFaint },
  dayOn: { color: night.primary, fontWeight: '800' },
  line: { fontSize: 14, color: night.textSecondary },
  delete: { width: 96, backgroundColor: systemColors.red, alignItems: 'center', justifyContent: 'center', gap: 4 },
  deleteText: { fontSize: 13, fontWeight: '600', color: colors.white },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingBottom: space.huge },
  emptyBell: { width: 120, height: 120, borderRadius: 60, backgroundColor: night.primary, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 20, fontWeight: '700', color: night.text },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm },
  cta: { height: 56, borderRadius: 28, backgroundColor: night.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  // System bold, as in the editor: the words come in every script.
  ctaText: { fontSize: 18, fontWeight: '700', color: night.textOnPrimary },
});
