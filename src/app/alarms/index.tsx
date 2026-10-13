import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { EmptyState, Header, IconButton, Screen, Toggle, Txt } from '@/components/ui';
import { alarmLine, alarmTime, uses12Hour } from '@/lib/alarm-format';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import type { Alarm } from '@/types';

/**
 * Wake-up alarms, for every plan (Bedtime → Alarms; approved prototype
 * https://claude.ai/artifact/JYkzQxvxXUV9x9brU1DhZn, iOS Clock style): a large title, one
 * white list of alarms with the big time, who and when, and a switch. "+" adds one, a tap
 * edits it, a swipe to the left deletes it.
 */
export default function AlarmsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const alarms = useAppStore((s) => s.alarms);
  const characters = useAppStore((s) => s.characters);
  const setAlarmEnabled = useAppStore((s) => s.setAlarmEnabled);
  const deleteAlarm = useAppStore((s) => s.deleteAlarm);
  const h12 = uses12Hour();

  const sorted = [...alarms].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

  return (
    <Screen background={colors.bgPlain}>
      <Header
        right={
          <IconButton icon="add" size={26} color={colors.primary} onPress={() => router.push('/alarms/edit')} accessibilityLabel={t('alarms.add')} />
        }
      />
      <Txt variant="h1" style={styles.title} accessibilityRole="header">
        {t('alarms.title')}
      </Txt>

      {sorted.length === 0 ? (
        <EmptyState title={t('alarms.empty')} actionLabel={t('alarms.add')} onAction={() => router.push('/alarms/edit')} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
  const tone = alarm.enabled ? colors.text : colors.textMuted;

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={() => (
        <Pressable style={styles.delete} onPress={onDelete} accessibilityRole="button" accessibilityLabel={t('alarms.deleteAlarm')}>
          <Txt variant="bodyStrong" color={colors.white}>
            {t('alarms.delete')}
          </Txt>
        </Pressable>
      )}>
      <View style={[styles.row, !last && styles.divider]}>
        <Pressable style={styles.rowBody} onPress={onOpen} accessibilityRole="button" accessibilityLabel={[period ? `${time} ${t(`alarms.${period}`)}` : time, line].join(', ')}>
          <View style={styles.timeLine}>
            <Txt style={[styles.time, { color: tone }]}>{time}</Txt>
            {period ? <Txt style={[styles.period, { color: tone }]}>{t(`alarms.${period}`)}</Txt> : null}
          </View>
          <Txt variant="small" color={tone} lines={1}>
            {line}
          </Txt>
        </Pressable>
        <Toggle
          value={alarm.enabled}
          onChange={onToggle}
          onColor={colors.success}
          accessibilityLabel={t('alarms.toggle', { time: `${time}${period ? ` ${t(`alarms.${period}`)}` : ''}` })}
        />
      </View>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  title: { paddingHorizontal: space.lg, paddingBottom: space.md },
  scroll: { paddingBottom: space.huge },
  list: { backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, paddingHorizontal: space.lg, backgroundColor: colors.surface },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowBody: { flex: 1, gap: 2 },
  timeLine: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  time: { fontSize: 46, lineHeight: 52, fontWeight: '300', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  period: { fontSize: 22, fontWeight: '400' },
  delete: { width: 88, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
});

