import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRadioPlayer } from '@/components/radio/radio-player';
import { useRadioClip } from '@/components/radio/use-clips';
import { Anim, CharacterAvatar, PressableScale, Txt } from '@/components/ui';
import { useFriendName } from '@/hooks/use-friend-name';
import { alarmTime, uses12Hour } from '@/lib/alarm-format';
import { lineAt } from '@/lib/radio-clips';
import { SNOOZE_MIN } from '@/lib/alarms';
import { MAX_SNOOZES, WAKE_WINDOW_MIN } from '@/lib/morning-chain';
import { useAppStore } from '@/store/use-app-store';
import { colors, gradients, radius, space } from '@/theme';

import { showOverLockScreen, unlockPhone } from '../../../modules/alarm-screen';

/**
 * The ringing screen (approved prototype D): the time, the friend and their question, then
 * "Reply to …" (the wake-up task: the alarm only stops on a real reply in their chat), Snooze
 * (9 min, 3 times) and "Hold 3 s to turn off", the honest way out. Without the task the main
 * button is Stop. The melody is played by `AlarmRuntime` for as long as the session rings.
 */
export default function AlarmRingScreen() {
  const friendName = useFriendName();
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
  // A Radio clip chosen as this alarm's voice plays while it rings, its words on screen.
  const found = useRadioClip(alarm?.voice ? alarm.clipId : undefined);
  const clip = found && !found.locked ? found : undefined;
  const player = useRadioPlayer();
  const clipLoaded = !!clip && player.kind === 'clip' && player.id === clip.id;

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

  // The clip starts with the ring and stops with it (Stop, Snooze, or leaving for the chat).
  useEffect(() => {
    if (!ringing || !clip) return;
    useRadioPlayer.getState().play('clip', clip.id, clip.durationSec);
    return () => {
      const now = useRadioPlayer.getState();
      if (now.kind === 'clip' && now.id === clip.id) now.stop();
    };
  }, [ringing, clip?.id, clip?.durationSec]);
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

  // Android: over the lock screen only while it rings here; the rest of the app stays locked.
  useFocusEffect(
    useCallback(() => {
      showOverLockScreen(ringing);
      return () => showOverLockScreen(false);
    }, [ringing]),
  );

  if (!wake || !ringing) return <View style={styles.fill} />;

  const { time, period } = alarmTime(now.getHours(), now.getMinutes(), uses12Hour());
  const canSnooze = !!alarm?.snooze && wake.snoozes < MAX_SNOOZES;
  const task = wake.replyToWake && !!wake.conversationId;
  const name = friend ? friendName(friend, true) : '';

  // The chat is private: a locked phone asks for the PIN or fingerprint first.
  const reply = async () => {
    if (await unlockPhone()) router.replace(`/chat/${wake.conversationId}`);
  };
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
        {alarm?.label ? (
          <Txt style={styles.label} lines={1}>
            {alarm.label}
          </Txt>
        ) : null}
        {friend ? (
          <View style={[styles.glassLight, styles.who]}>
            <CharacterAvatar character={friend} size={34} />
            <Txt style={styles.whoName} lines={1}>
              {friendName(friend)}
            </Txt>
          </View>
        ) : null}
        <View style={[styles.glassLight, styles.sayCard]}>
          <Txt style={styles.say} center>
            {clip
              ? `“${clip.lines[clipLoaded ? lineAt(clip.lines, player.elapsed) : 0]}”`
              : friend
                ? `“${wake.question}”`
                : alarm?.label || t('alarms.ringing')}
          </Txt>
          {clip ? (
            <View style={styles.clipLine}>
              <Anim name="voiceWave" size={20} tint={INK_MUTED} />
              <Txt style={styles.sayMeta} lines={1}>
                {clip.title}
              </Txt>
            </View>
          ) : alarm ? (
            <Txt style={styles.sayMeta}>{`♪ ${t(`alarms.sounds.${alarm.sound}`)}`}</Txt>
          ) : null}
        </View>
      </View>

      {/* As the iPhone's alarm: one big button, Snooze in glass under it. */}
      <View style={styles.actions}>
        <PressableScale onPress={task ? reply : stop} scaleTo={0.97} style={styles.primary} accessibilityRole="button">
          <Txt style={styles.primaryText} lines={1}>
            {task ? t('alarms.replyTo', { name }) : t('alarms.stop')}
          </Txt>
        </PressableScale>
        {canSnooze ? (
          <PressableScale onPress={snooze} scaleTo={0.97} style={[styles.glass, styles.snooze]} accessibilityRole="button">
            <Txt style={styles.snoozeText}>{t('alarms.snoozeFor', { count: SNOOZE_MIN })}</Txt>
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

/** Dark warm ink for text on the light glass and the white button. */
const INK = '#5A2A1E';
const INK_MUTED = '#8A5446';

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#E9A27E', justifyContent: 'space-between', paddingHorizontal: space.xl },
  top: { alignItems: 'center', gap: space.xs },
  clockLine: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  clock: { fontSize: 84, lineHeight: 92, fontWeight: '200', fontVariant: ['tabular-nums'] },
  period: { fontSize: 26, fontWeight: '300' },
  label: { marginTop: 2, fontSize: 17, fontWeight: '600', color: colors.white, opacity: 0.9 },
  // Glass on the dawn: a light see-through fill with a bright rim, as Liquid Glass reads on colour.
  glass: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  // The friend and their words sit high, on the light part of the dawn: brighter glass, dark ink.
  glassLight: {
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.xl,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: space.lg,
    borderRadius: radius.pill,
  },
  whoName: { fontSize: 17, fontWeight: '600', color: INK, maxWidth: 200 },
  sayCard: { alignSelf: 'stretch', alignItems: 'center', gap: space.sm, marginTop: space.md, paddingVertical: space.lg, paddingHorizontal: space.xl, borderRadius: 24 },
  say: { fontSize: 20, lineHeight: 27, fontWeight: '600', letterSpacing: -0.3, color: INK },
  sayMeta: { fontSize: 13, color: INK_MUTED },
  clipLine: { flexDirection: 'row', alignItems: 'center', gap: space.xs, maxWidth: 260 },
  actions: { alignItems: 'center', gap: space.md },
  primary: { alignSelf: 'stretch', height: 60, borderRadius: 30, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 19, fontWeight: '700', letterSpacing: -0.3, color: INK },
  snooze: { alignSelf: 'stretch', height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  snoozeText: { fontSize: 17, fontWeight: '600', color: colors.white },
});
