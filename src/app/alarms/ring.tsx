import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterAvatar, PressableScale, Txt } from '@/components/ui';
import { alarmTime, uses12Hour } from '@/lib/alarm-format';
import { SNOOZE_MIN } from '@/lib/alarms';
import { MAX_SNOOZES, WAKE_WINDOW_MIN } from '@/lib/morning-chain';
import { useAppStore } from '@/store/use-app-store';
import { colors, gradients, radius, space } from '@/theme';

/**
 * The ringing screen (approved prototype D): the time, the friend and their question, then
 * "Reply to …" (the wake-up task: the alarm only stops on a real reply in their chat), Snooze
 * (9 min, 3 times) and "Hold 3 s to turn off", the honest way out. Without the task the main
 * button is Stop. The melody is played by `AlarmRuntime` for as long as the session rings.
 */
export default function AlarmRingScreen() {
  const { id, at } = useLocalSearchParams<{ id?: string; at?: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const wake = useAppStore((s) => s.wake);
  const alarm = useAppStore((s) => s.alarms.find((a) => a.id === s.wake?.alarmId));
  const friend = useAppStore((s) => s.characters.find((c) => c.id === s.wake?.characterId));
  const ringAlarm = useAppStore((s) => s.ringAlarm);
  const snoozeWake = useAppStore((s) => s.snoozeWake);
  const stopWake = useAppStore((s) => s.stopWake);
  const [now, setNow] = useState(() => new Date());

  // Opened from a notification: start the ring if it is recent and not running yet.
  useEffect(() => {
    const alarmId = Array.isArray(id) ? id[0] : id;
    if (!alarmId || useAppStore.getState().wake?.state === 'ringing') return;
    const when = at ? Date.parse(Array.isArray(at) ? at[0] : at) : Date.now();
    if (Date.now() - when < WAKE_WINDOW_MIN * 60_000) ringAlarm(alarmId);
  }, [id, at, ringAlarm]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(timer);
  }, []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Nothing ringing (stopped, snoozed elsewhere, or a stale link): leave. Only while this screen
  // is in front, so a ring screen left under the chat never closes the chat instead.
  const ringing = wake?.state === 'ringing';
  useFocusEffect(
    useCallback(() => {
      if (ringing) return;
      const timer = setTimeout(() => {
        if (useAppStore.getState().wake?.state !== 'ringing') close();
      }, 400);
      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ringing]),
  );

  if (!wake || !ringing) return <View style={styles.fill} />;

  const { time, period } = alarmTime(now.getHours(), now.getMinutes(), uses12Hour());
  const canSnooze = !!alarm?.snooze && wake.snoozes < MAX_SNOOZES;
  const task = wake.replyToWake && !!wake.conversationId;
  const name = friend?.name.split(' ')[0] ?? '';

  const reply = () => router.replace(`/chat/${wake.conversationId}`);
  const snooze = () => {
    snoozeWake();
    close();
  };
  const stop = () => {
    stopWake();
    close();
  };

  return (
    <LinearGradient colors={gradients.wake} style={[styles.fill, { paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xxl }]}>
      <View style={styles.top}>
        <View style={styles.clockLine}>
          <Txt color={colors.white} style={styles.clock}>
            {time}
          </Txt>
          {period ? (
            <Txt color={colors.white} style={styles.period}>
              {t(`alarms.${period}`)}
            </Txt>
          ) : null}
        </View>
        <Txt variant="body" color={colors.white}>
          {now.toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}
        </Txt>
        {friend ? (
          <View style={styles.who}>
            <CharacterAvatar character={friend} size={34} />
            <Txt variant="bodyStrong" color={colors.white}>
              {friend.name}
            </Txt>
          </View>
        ) : null}
        <Txt variant="body" color={colors.white} center style={styles.say}>
          {friend ? `“${wake.question}”` : alarm?.label || t('alarms.ringing')}
        </Txt>
        {alarm ? (
          <Txt variant="small" color={colors.onMediaMuted}>
            {`♪ ${t(`alarms.sounds.${alarm.sound}`)}`}
          </Txt>
        ) : null}
      </View>

      <View style={styles.actions}>
        <PressableScale onPress={task ? reply : stop} scaleTo={0.97} style={styles.primary} accessibilityRole="button">
          <Txt variant="bodyStrong" color={colors.white} style={styles.primaryText}>
            {task ? t('alarms.replyTo', { name }) : t('alarms.stop')}
          </Txt>
        </PressableScale>
        {canSnooze ? (
          <PressableScale onPress={snooze} scaleTo={0.96} style={styles.snooze} accessibilityRole="button">
            <Txt variant="bodyStrong" color={colors.white}>
              {t('alarms.snoozeFor', { count: SNOOZE_MIN })}
            </Txt>
          </PressableScale>
        ) : null}
        {task ? (
          <Pressable onLongPress={stop} delayLongPress={3000} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('alarms.holdToStop')}>
            <Txt variant="small" color={colors.onMediaMuted}>
              {t('alarms.holdToStop')}
            </Txt>
          </Pressable>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#E9A27E', justifyContent: 'space-between', paddingHorizontal: space.xl },
  top: { alignItems: 'center', gap: space.xs },
  clockLine: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  clock: { fontSize: 84, lineHeight: 92, fontWeight: '200', fontVariant: ['tabular-nums'] },
  period: { fontSize: 26, fontWeight: '300' },
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.lg,
    paddingVertical: space.xs,
    paddingLeft: space.xs,
    paddingRight: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.onMediaGlass,
  },
  say: { maxWidth: 260, marginTop: space.md },
  actions: { alignItems: 'center', gap: space.md },
  primary: { alignSelf: 'stretch', height: 58, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 17 },
  snooze: { height: 48, paddingHorizontal: space.xl, borderRadius: radius.pill, backgroundColor: colors.onMediaHairline, alignItems: 'center', justifyContent: 'center' },
});
