import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { captionMs, type CallLine, type CallPlacedBy } from '@/ai/call-prompt';
import { apiBase } from '@/ai/server';
import { CallControls, callGlass } from '@/components/call/call-controls';
import { HoldMic } from '@/components/chat/hold-mic';
import { useVoiceNote } from '@/components/chat/use-voice-note';
import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { OutOfMinutesSheet } from '@/components/plans/out-of-minutes-sheet';
import { Anim, BlurBackdrop, CharacterAvatar, PressableScale, Screen, Txt, characterImage } from '@/components/ui';
import { planStatus } from '@/economy/plans';
import { callClock, shortName } from '@/lib/format';
import { shareText } from '@/lib/share';
import { callScript, callsIncluded, displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, gradients, space, systemColors } from '@/theme';

/** `empty`: no minutes when it opened; `out`: they ran out mid-call and it waits on the sheet. */
type CallState = 'empty' | 'connecting' | 'active' | 'out';

/** From this many seconds left the "N min left" pill's clock turns orange. */
const WARN_SECONDS = 120;

/** How long each subtitle line stays up — a stand-in for streamed TTS. */
const SUBTITLE_INTERVAL_MS = 5000;

/**
 * The in-call screen (canvas "CallVoice", 2026-10-21): blurred portrait, avatar, name and timer,
 * the live line in a glass caption, then mute / end / speaker — nothing else competes with the voice.
 *
 * With the model on, the call is a real talk (0z102): the character opens it, the user holds the mic
 * (or taps it twice) to speak, the server writes out the words, and the character answers in
 * `mode: 'call'`; the lines show as captions until a voice reads them (ElevenLabs, later). A busy
 * model says Not Delivered with a retry, never a stock line. With the model off, the old subtitles run.
 */
export default function CallScreen() {
  const insets = useSafeAreaInsets();
  const { id, incoming } = useLocalSearchParams<{ id: string; incoming?: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;
  const answered = incoming === '1';

  const { t } = useTranslation();
  const router = useRouter();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const addCall = useAppStore((s) => s.addCall);
  const wallet = useAppStore((s) => s.wallet);
  // Pro or the trial: out of minutes means a top-up; Basic and free users see the plans.
  const member = callsIncluded(wallet);
  // The call may run for as long as the minutes left (plan, then packs) when it started.
  const budget = useRef(minutesOf(useAppStore.getState().wallet, 'call').total);

  const [state, setState] = useState<CallState>(
    budget.current <= 0 ? 'empty' : answered ? 'active' : 'connecting',
  );
  const [seconds, setSeconds] = useState(0);
  const [line, setLine] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const startedAt = useRef(new Date().toISOString());
  // The time talked is booked once, however the screen closes: hang-up, out of time,
  // or the Android back button / a gesture that leaves without pressing End.
  const secondsRef = useRef(0);
  const booked = useRef(false);
  const bookRef = useRef(() => {});

  const lines = useMemo(() => (character ? callScript(character) : []), [character]);

  // A call on the model: what has been said, the caption up now, and a reply on its way.
  const live = useAppStore((s) => s.settings.realAi) && !!apiBase();
  const callReply = useAppStore((s) => s.callReply);
  const placedBy: CallPlacedBy = answered ? 'character' : 'user';
  const said = useRef<CallLine[]>([]);
  const [caption, setCaption] = useState<CallLine | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const opened = useRef(false);
  const mounted = useRef(true);
  const captionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      mounted.current = false;
      clearTimeout(captionTimer.current);
    },
    [],
  );

  /** Their lines one after another, each up about as long as it takes to say. */
  const play = (theirs: string[], i = 0) => {
    clearTimeout(captionTimer.current);
    setCaption({ author: 'them', text: theirs[i] });
    if (i + 1 < theirs.length) captionTimer.current = setTimeout(() => play(theirs, i + 1), captionMs(theirs[i]));
  };

  /** Asks for their next words on what has been said so far; a retry asks the same again. */
  const ask = () => {
    if (!character) return;
    setWaiting(true);
    setFailed(false);
    const sent = said.current;
    void callReply(character.id, sent, placedBy).then((reply) => {
      if (!mounted.current || said.current !== sent) return;
      setWaiting(false);
      if (!reply) return setFailed(true);
      said.current = [...sent, ...reply.lines.map((text) => ({ author: 'them' as const, text }))];
      play(reply.lines);
    });
  };

  // The user's words, written out by the server: they show, and the character answers them.
  const voice = useVoiceNote(undefined, (note) => {
    const line: CallLine = { author: 'me', text: note.transcript, language: note.language };
    said.current = [...said.current, line];
    clearTimeout(captionTimer.current);
    setCaption(line);
    ask();
  });
  const recording = voice.phase === 'recording';

  // The character speaks first, once the call is up.
  useEffect(() => {
    if (!live || state !== 'active' || opened.current) return;
    opened.current = true;
    ask();
    // `ask` reads refs; once per call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, state]);

  // Muted, or the minutes ran out: what was being said goes nowhere.
  useEffect(() => {
    if ((muted || state !== 'active') && recording) voice.finish(false);
  }, [muted, state, recording, voice]);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => () => bookRef.current(), []);

  useEffect(() => {
    if (state !== 'connecting') return;
    const timer = setTimeout(() => setState('active'), 1600);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (state !== 'active') return;
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    // The old subtitles run only with the model off.
    const subtitle = live ? undefined : setInterval(() => setLine((l) => (l + 1) % Math.max(1, lines.length)), SUBTITLE_INTERVAL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(subtitle);
    };
  }, [state, lines.length, live]);

  const remaining = Math.max(0, budget.current - seconds);

  // Out of minutes mid-call: it pauses on the sheet, which can add more or end it.
  useEffect(() => {
    if (state === 'active' && remaining <= 0) setState('out');
  }, [state, remaining]);

  if (!character) {
    return (
      <Screen>
        <Txt style={styles.missing}>{t('errors.notFound')}</Txt>
      </Screen>
    );
  }

  const name = displayName(character, relationship);

  const book = () => {
    const talked = secondsRef.current;
    if (booked.current || talked <= 0) return;
    booked.current = true;
    addCall(
      {
        characterId: character.id,
        startedAt: startedAt.current,
        durationSec: talked,
        direction: answered ? 'incoming' : 'outgoing',
        missed: false,
      },
      said.current,
    );
  };
  bookRef.current = book;

  const hangUp = () => {
    book();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  /** Ends the call (booking what was talked) and opens the store instead. */
  const leaveFor = (route: Href) => {
    book();
    router.replace(route);
  };

  /** Minutes were added or a plan started: carry on from where the clock is. */
  const resume = () => {
    budget.current = minutesOf(useAppStore.getState().wallet, 'call').total;
    setState(state === 'out' ? 'active' : 'connecting');
  };

  // Nothing is booked until the call ends, so these are the minutes before this call.
  const minutes = minutesOf(wallet, 'call');
  const status = planStatus(wallet.subscription, Date.now());
  const monthly = !!status && !status.trial;
  // The minutes left show for the whole call; the last two turn the clock orange.
  const low = remaining <= WARN_SECONDS;

  const share = () => {
    // Sharing a call counts as the day's share.
    void shareText(t('call.shareMessage', { name }));
  };

  return (
    <Screen
      background={gradients.call}
      statusBarStyle="light"
      backdrop={<BlurBackdrop source={characterImage(character)} dim={0.3} blur={50} />}>
      <LinearGradient
        colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.5)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={callGlass.top}>
        {state === 'active' ? (
          <Animated.View entering={FadeIn.duration(320)} style={[callGlass.glass, callGlass.warn]}>
            <Ionicons name={low ? 'timer' : 'timer-outline'} size={15} color={low ? systemColors.orange : colors.onMedia} />
            <Txt style={callGlass.warnText}>
              {t(monthly ? 'plans.minLeftMonth' : 'plans.minLeft', { count: Math.max(1, Math.ceil(remaining / 60)) })}
            </Txt>
          </Animated.View>
        ) : null}
        <PressableScale
          style={[callGlass.glass, styles.share]}
          hitSlop={6}
          scaleTo={0.88}
          accessibilityLabel={t('a11y.share')}
          onPress={share}>
          <Ionicons name="share-outline" size={20} color={colors.onMedia} />
        </PressableScale>
      </View>

      <View style={styles.head}>
        <View style={styles.avatarWrap}>
          {state === 'connecting' ? (
            <Anim name="calling" size={230} tint="rgba(255,255,255,0.7)" style={styles.rings} />
          ) : null}
          <CharacterAvatar character={character} size={150} ring ringColor="rgba(255,255,255,0.85)" />
        </View>

        <Txt style={[callGlass.title, styles.name]} lines={2}>
          {name}
        </Txt>

        {state === 'empty' ? null : (
          <Txt style={callGlass.timer}>{state === 'connecting' ? t('call.connecting') : callClock(seconds)}</Txt>
        )}
      </View>

      <View style={styles.flex} />

      {state === 'active' && !live ? (
        <Animated.View
          key={line}
          entering={FadeIn.duration(320)}
          exiting={FadeOut.duration(200)}
          style={[callGlass.glass, callGlass.caption]}
          accessibilityLiveRegion="polite">
          <Txt style={callGlass.captionText}>{`“${lines[line]}”`}</Txt>
        </Animated.View>
      ) : null}

      {state === 'active' && live ? (
        <>
          <LiveCaption
            recording={recording}
            seconds={voice.seconds}
            hearing={voice.phase === 'sending'}
            hearingFailed={voice.phase === 'failed'}
            notice={voice.notice ? t(`chat.voice.${voice.notice}`) : null}
            caption={caption}
            waiting={waiting}
            failed={failed}
            onRetryHearing={() => void voice.retry()}
            onRetry={ask}
          />
          <View style={styles.micRow}>
            <HoldMic
              recording={recording}
              onTap={() => (recording ? voice.finish(true) : voice.start())}
              onHoldStart={voice.start}
              onHoldEnd={voice.finish}
              accessibilityLabel={t('chat.voice.hold')}
              accessibilityHint={t('chat.voice.release')}
              style={[callGlass.glass, styles.mic]}
              iconColor={colors.onMedia}
              iconSize={34}
              disabled={muted || waiting || voice.phase === 'sending'}
            />
          </View>
        </>
      ) : null}

      <CallControls
        muted={muted}
        speaker={speaker}
        onMute={() => setMuted((v) => !v)}
        onSpeaker={() => setSpeaker((v) => !v)}
        onEnd={hangUp}
        bottom={Math.max(insets.bottom + space.xl, 52)}
        hidden={state === 'empty'}
      />

      {/* No minutes when it opened: free and Basic users hear what Pro adds, Pro can top up. */}
      <CallPaywallSheet
        visible={state === 'empty' && !member}
        character={character}
        name={name}
        onClose={() => router.back()}
        onStarted={resume}
      />
      <OutOfMinutesSheet
        visible={state === 'out' || (state === 'empty' && member)}
        name={state === 'out' ? shortName(name) : undefined}
        talked={state === 'out' ? minutes.planTotal - minutes.plan + seconds : undefined}
        onAdded={resume}
        onNoShells={() => leaveFor('/store/shell?tab=shells')}
        onGetPro={() => leaveFor('/store/shell?tab=plans&plan=pro')}
        onDone={hangUp}
      />
    </Screen>
  );
}

/**
 * The live caption on a call on the model: their line in quotes, the user's own words softer, a wave
 * while the user speaks, dots while the words are written out or they answer, and Not Delivered with
 * a retry when the model is busy.
 */
function LiveCaption({
  recording,
  seconds,
  hearing,
  hearingFailed,
  notice,
  caption,
  waiting,
  failed,
  onRetryHearing,
  onRetry,
}: {
  recording: boolean;
  seconds: number;
  hearing: boolean;
  hearingFailed: boolean;
  notice: string | null;
  caption: CallLine | null;
  waiting: boolean;
  failed: boolean;
  onRetryHearing: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const retry = hearingFailed ? onRetryHearing : failed ? onRetry : null;
  if (retry) {
    return (
      <PressableScale style={[callGlass.glass, callGlass.caption, styles.caption]} onPress={retry} accessibilityRole="button" accessibilityLabel={t('chat.tryAgain')}>
        <Txt style={callGlass.captionText}>{t('chat.notDelivered')}</Txt>
        <Txt style={styles.captionSoft}>{t('chat.tryAgain')}</Txt>
      </PressableScale>
    );
  }
  const mine = caption?.author === 'me';
  return (
    <View style={[callGlass.glass, callGlass.caption, styles.caption]} accessibilityLiveRegion="polite">
      {recording ? (
        <View style={styles.listening}>
          <Anim name="voiceWave" size={34} tint={colors.onMedia} />
          <Txt style={styles.captionClock}>{callClock(seconds)}</Txt>
        </View>
      ) : notice ? (
        <Txt style={styles.captionSoft}>{notice}</Txt>
      ) : (
        <>
          {caption && !hearing ? (
            <Animated.View key={caption.text} entering={FadeIn.duration(320)}>
              <Txt style={mine ? styles.captionSoft : callGlass.captionText}>{mine ? caption.text : `“${caption.text}”`}</Txt>
            </Animated.View>
          ) : null}
          {hearing || waiting ? <Anim name="typing" size={30} tint={colors.onMedia} /> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  caption: { marginBottom: 20, minHeight: 56, justifyContent: 'center' },
  captionSoft: { fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.72)', textAlign: 'center' },
  captionClock: { fontSize: 15, color: colors.onMedia, fontVariant: ['tabular-nums'] },
  listening: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  micRow: { alignItems: 'center', marginBottom: 28 },
  mic: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  missing: { padding: space.xl },
  share: {
    position: 'absolute',
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: { marginTop: 70, alignItems: 'center', paddingHorizontal: space.xxl },
  avatarWrap: { alignItems: 'center', justifyContent: 'center' },
  rings: { position: 'absolute' },
  name: { marginTop: 22 },
});
