import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { portraitOf } from '@/components/chat/chat-ground';
import { useRadioPlayer } from '@/components/radio/radio-player';
import { useRadioClip } from '@/components/radio/use-clips';
import { Anim, PressableScale, Txt } from '@/components/ui';
import { useFriendName } from '@/hooks/use-friend-name';
import { alarmTime, uses12Hour } from '@/lib/alarm-format';
import { haptic } from '@/lib/haptics';
import { lineAt } from '@/lib/radio-clips';
import { SNOOZE_MIN } from '@/lib/alarms';
import { countsAsWakeReply, MAX_SNOOZES, WAKE_WINDOW_MIN } from '@/lib/morning-chain';
import { useAppStore } from '@/store/use-app-store';
import { fonts, gradients, space } from '@/theme';

import { showOverLockScreen, unlockPhone } from '../../../modules/alarm-screen';

/**
 * The ringing screen, the Ink way (owner, 2026-11-13, from the canvas frame): the friend's own
 * picture fills the screen under a dark scrim, the alarm's label (or the date) over the time in big
 * serif, their wake-up words in dark glass, then, with the wake-up task, "Reply to wake up" right
 * here: three real words and "I'm up" sends them to their chat, which turns the alarm off and opens
 * the chat for the morning chain (a locked phone asks for the PIN first: the chat is private). Snooze
 * (9 min, 3 times) in glass, and "Hold 3 s to turn off", the honest way out. Without the task "I'm
 * up" just stops it. No picture (nobody chosen, or none drawn): the dawn gradient as before. The
 * melody is played by `AlarmRuntime` for as long as the session rings.
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
  const sendText = useAppStore((s) => s.sendText);
  const [now, setNow] = useState(() => new Date());
  const [draft, setDraft] = useState('');
  const { width, height } = useWindowDimensions();
  const picture = useMemo(() => (friend ? portraitOf(friend, width / height) : undefined), [friend, width, height]);
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

  const ready = countsAsWakeReply(draft);
  // The reply goes to their chat as if typed there (free in the wake window); that turns the alarm
  // off and starts the morning chain. The chat is private: a locked phone asks for the PIN first.
  const sendReply = async () => {
    if (!wake.conversationId) return;
    if (!ready) {
      haptic.error();
      return;
    }
    if (!(await unlockPhone())) return;
    if (sendText(wake.conversationId, draft.trim()) !== 'sent') return haptic.error();
    haptic.success();
    router.replace(`/chat/${wake.conversationId}`);
  };
  const snooze = () => {
    snoozeWake();
    close();
  };
  const stop = () => {
    stopWake();
    close();
  };
  const said = clip ? clip.lines[clipLoaded ? lineAt(clip.lines, player.elapsed) : 0] : friend ? wake.question : alarm?.label || t('alarms.ringing');
  const over = alarm?.label || now.toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' });

  const content = (
    <KeyboardAvoidingView style={[styles.fill, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.lg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.top}>
        <Txt style={styles.over} lines={1} maxFontSizeMultiplier={1.3}>
          {over}
        </Txt>
        <View style={styles.clockLine} accessible accessibilityLabel={period ? `${time} ${t(`alarms.${period}`)}` : time}>
          <Text style={styles.clock} maxFontSizeMultiplier={1}>
            {time}
          </Text>
          {period ? <Text style={styles.period}>{t(`alarms.${period}`)}</Text> : null}
        </View>
      </View>

      <View style={styles.actions}>
        <View style={styles.bubble} accessibilityLiveRegion="polite">
          {friend ? (
            <Txt style={styles.from} lines={1}>
              {friendName(friend)}
            </Txt>
          ) : null}
          <Txt style={styles.say}>{said}</Txt>
          {clip ? (
            <View style={styles.clipLine}>
              <Anim name="voiceWave" size={18} tint={MUTED} />
              <Txt style={styles.meta} lines={1}>
                {clip.title}
              </Txt>
            </View>
          ) : !friend && alarm ? (
            <Txt style={styles.meta}>{`♪ ${t(`alarms.sounds.${alarm.sound}`)}`}</Txt>
          ) : null}
        </View>

        {task ? (
          <View style={styles.field}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('alarms.replyToWake')}
              placeholderTextColor={MUTED}
              selectionColor="#FFFFFF"
              style={styles.input}
              returnKeyType="send"
              onSubmitEditing={() => void sendReply()}
              accessibilityLabel={t('alarms.replyTo', { name })}
            />
          </View>
        ) : null}

        {/* As the iPhone's alarm: one big white button, Snooze in glass under it. */}
        <PressableScale
          onPress={task ? () => void sendReply() : stop}
          scaleTo={0.97}
          style={[styles.primary, task && !ready && styles.primaryWaiting]}
          accessibilityRole="button"
          accessibilityState={{ disabled: task && !ready }}>
          <Txt style={styles.primaryText} lines={1}>
            {t('alarms.imUp')}
          </Txt>
        </PressableScale>
        {canSnooze ? (
          <PressableScale onPress={snooze} scaleTo={0.97} style={styles.snooze} accessibilityRole="button">
            <Txt style={styles.snoozeText}>{t('alarms.snoozeFor', { count: SNOOZE_MIN })}</Txt>
          </PressableScale>
        ) : null}
        {task ? (
          <Pressable onLongPress={stop} delayLongPress={3000} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('alarms.holdToStop')}>
            <Txt style={styles.hold}>{t('alarms.holdToStop')}</Txt>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );

  if (!picture) {
    return (
      <LinearGradient colors={gradients.wake} style={styles.root}>
        <View style={[StyleSheet.absoluteFill, styles.dawnShade]} />
        {content}
      </LinearGradient>
    );
  }
  return (
    <View style={[styles.root, styles.dark]}>
      <Image source={picture.source} contentFit="cover" contentPosition={picture.position} style={StyleSheet.absoluteFill} transition={200} />
      {/* The scrim: light behind the time, deep behind the words and buttons, so both read on any picture. */}
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.82)']}
        locations={[0, 0.3, 0.5, 0.85]}
        style={StyleSheet.absoluteFill}
      />
      {content}
    </View>
  );
}

/** Text on the scrim and the glass. */
const MUTED = 'rgba(255,255,255,0.62)';

const styles = StyleSheet.create({
  root: { flex: 1 },
  dark: { backgroundColor: '#000' },
  // The dawn without a picture gets a little shade, so the white text still reads on its light top.
  dawnShade: { backgroundColor: 'rgba(0,0,0,0.18)' },
  fill: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20 },
  top: { alignItems: 'center' },
  over: { fontSize: 17, fontWeight: '600', color: 'rgba(255,255,255,0.82)', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6 },
  clockLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  // Lock-screen scale; serif as the canvas has it.
  clock: { fontFamily: fonts.serif, fontSize: 104, lineHeight: 118, letterSpacing: -2, color: '#FFFFFF', fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 12 },
  period: { fontFamily: fonts.serif, fontSize: 28, color: '#FFFFFF' },
  actions: { gap: 12 },
  // Dark glass on the picture, as the canvas's bubble and field.
  bubble: {
    alignSelf: 'stretch',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 26,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  from: { fontSize: 13, fontWeight: '600', color: MUTED },
  say: { fontSize: 17, lineHeight: 23, letterSpacing: -0.3, color: '#FFFFFF' },
  meta: { fontSize: 13, color: MUTED },
  clipLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  field: {
    height: 54,
    borderRadius: 27,
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  input: { fontSize: 17, color: '#FFFFFF', padding: 0 },
  primary: { height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  // Until three real words are typed: a paler white (the press animation owns opacity), so it reads as waiting.
  primaryWaiting: { backgroundColor: 'rgba(255,255,255,0.55)' },
  primaryText: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2, color: '#000' },
  snooze: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  snoozeText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  hold: { alignSelf: 'center', paddingVertical: 4, fontSize: 13, color: MUTED },
});
