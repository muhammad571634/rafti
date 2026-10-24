import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { NIGHT_SWITCH } from '@/components/alarms/night';
import { Button, CharacterAvatar, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { alarmLine, alarmTime, uses12Hour } from '@/lib/alarm-format';
import { nextAlarmAt } from '@/lib/alarms';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/use-app-store';
import { colors, sleepColors as night, space, systemColors } from '@/theme';
import type { Alarm } from '@/types';

/**
 * Wake-up alarms, for every plan (Bedtime → Alarms), in Bedtime's navy and the iOS Clock look
 * (2026-10-22, coded straight at the owner's word): a large title, a card with the next alarm,
 * who wakes you and how long until it rings, then one inset list with the big time, who and
 * when, and a switch. "+" adds one, a tap edits it, a swipe to the left deletes it.
 */
export default function AlarmsScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const alarms = useAppStore((s) => s.alarms);
  const characters = useAppStore((s) => s.characters);
  const setAlarmEnabled = useAppStore((s) => s.setAlarmEnabled);
  const deleteAlarm = useAppStore((s) => s.deleteAlarm);
  const h12 = uses12Hour();

  const sorted = [...alarms].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

  // The soonest enabled alarm, for the card on top.
  const next = useMemo(() => {
    const now = new Date();
    return alarms
      .filter((a) => a.enabled)
      .map((a) => ({ a, at: nextAlarmAt(a, now) }))
      .sort((x, y) => x.at.getTime() - y.at.getTime())[0];
  }, [alarms]);

  const add = () => router.push('/alarms/edit');

  return (
    <Screen background={night.bg} statusBarStyle="light">
      <Header
        tint={night.text}
        right={
          <PressableScale scaleTo={0.88} onPress={add} accessibilityRole="button" accessibilityLabel={t('alarms.add')} style={styles.add}>
            <Ionicons name="add" size={26} color={night.brandText} />
          </PressableScale>
        }
      />
      <Txt style={styles.title} accessibilityRole="header">
        {t('alarms.title')}
      </Txt>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="alarm-outline" size={34} color={night.brandText} />
          </View>
          <Txt style={styles.emptyText}>{t('alarms.empty')}</Txt>
          <Button label={t('alarms.add')} onPress={add} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.huge, gap: 22 }} showsVerticalScrollIndicator={false}>
          <NextCard next={next} h12={h12} />
          <View style={styles.list}>
            {sorted.map((alarm, i) => (
              <AlarmRow
                key={alarm.id}
                alarm={alarm}
                last={i === sorted.length - 1}
                h12={h12}
                line={alarmLine(t, alarm, characters.find((c) => c.id === alarm.characterId)?.name, i18n.language)}
                onOpen={() => router.push({ pathname: '/alarms/edit', params: { id: alarm.id } })}
                onToggle={(on) => setAlarmEnabled(alarm.id, on)}
                onDelete={() => deleteAlarm(alarm.id)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

/** The next alarm: its time, how long until it rings and who will wake you. */
function NextCard({ next, h12 }: { next?: { a: Alarm; at: Date }; h12: boolean }) {
  const { t } = useTranslation();
  const friend = useAppStore((s) => s.characters.find((c) => c.id === next?.a.characterId));

  if (!next) {
    return (
      <View style={[styles.next, styles.nextOff]}>
        <Ionicons name="moon-outline" size={20} color={night.textSecondary} />
        <Txt style={styles.nextOffText}>{t('alarms.noneOn')}</Txt>
      </View>
    );
  }

  const { time, period } = alarmTime(next.a.hour, next.a.minute, h12);
  const mins = Math.max(1, Math.round((next.at.getTime() - Date.now()) / 60_000));
  const until = mins < 60 ? t('alarms.inMinutes', { m: mins }) : t('alarms.inTime', { h: Math.floor(mins / 60), m: mins % 60 });

  return (
    <LinearGradient colors={['#232A5C', night.surface]} style={styles.next}>
      <View style={styles.nextHead}>
        <Ionicons name="alarm" size={16} color={night.brandText} />
        <Txt style={styles.nextLabel}>{t('alarms.next')}</Txt>
      </View>
      <View style={styles.nextBody}>
        <View style={styles.flex}>
          <View style={styles.timeLine}>
            <Txt style={styles.nextTime}>{time}</Txt>
            {period ? <Txt style={styles.nextPeriod}>{t(`alarms.${period}`)}</Txt> : null}
          </View>
          <Txt style={styles.nextUntil}>{until}</Txt>
        </View>
        {friend ? <CharacterAvatar character={friend} size={52} ring ringColor="rgba(255,255,255,0.85)" /> : null}
      </View>
    </LinearGradient>
  );
}

function AlarmRow({
  alarm,
  last,
  h12,
  line,
  onOpen,
  onToggle,
  onDelete,
}: {
  alarm: Alarm;
  last: boolean;
  h12: boolean;
  line: string;
  onOpen: () => void;
  onToggle: (on: boolean) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { time, period } = alarmTime(alarm.hour, alarm.minute, h12);
  const tone = alarm.enabled ? night.text : night.textFaint;

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={() => (
        <Pressable style={styles.delete} onPress={onDelete} accessibilityRole="button" accessibilityLabel={t('alarms.deleteAlarm')}>
          <Txt style={styles.deleteText}>{t('alarms.delete')}</Txt>
        </Pressable>
      )}>
      <View style={styles.row}>
        <Pressable
          style={styles.rowBody}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={[period ? `${time} ${t(`alarms.${period}`)}` : time, line].join(', ')}>
          <View style={styles.timeLine}>
            <Txt style={[styles.time, { color: tone }]}>{time}</Txt>
            {period ? <Txt style={[styles.period, { color: tone }]}>{t(`alarms.${period}`)}</Txt> : null}
          </View>
          <Txt style={[styles.line, { color: alarm.enabled ? night.textSecondary : night.textFaint }]} lines={1}>
            {line}
          </Txt>
        </Pressable>
        <Switch
          value={alarm.enabled}
          onValueChange={(v) => {
            haptic.toggle(v);
            onToggle(v);
          }}
          accessibilityLabel={t('alarms.toggle', { time: `${time}${period ? ` ${t(`alarms.${period}`)}` : ''}` })}
          {...NIGHT_SWITCH}
        />
        {last ? null : <View style={styles.divider} />}
      </View>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  add: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: night.text,
  },
  next: { marginHorizontal: space.lg, padding: 18, borderRadius: 24, gap: 10 },
  nextOff: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: night.surface },
  nextOffText: { fontSize: 15, color: night.textSecondary },
  nextHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2, color: night.brandText, textTransform: 'uppercase' },
  nextBody: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  nextTime: { fontSize: 56, lineHeight: 62, fontWeight: '200', letterSpacing: -1, color: night.text, fontVariant: ['tabular-nums'] },
  nextPeriod: { fontSize: 22, fontWeight: '300', color: night.text },
  nextUntil: { fontSize: 15, color: night.textSecondary },
  list: { marginHorizontal: space.lg, borderRadius: 14, overflow: 'hidden', backgroundColor: night.surface },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: space.lg, backgroundColor: night.surface },
  divider: {
    position: 'absolute',
    left: space.lg,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: night.border,
  },
  rowBody: { flex: 1, gap: 2 },
  timeLine: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  time: { fontSize: 46, lineHeight: 52, fontWeight: '300', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  period: { fontSize: 22, fontWeight: '400' },
  line: { fontSize: 15 },
  delete: { width: 88, backgroundColor: systemColors.red, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: 17, fontWeight: '600', color: colors.white },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingBottom: space.huge },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: night.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 17, fontWeight: '600', color: night.text },
});
