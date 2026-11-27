import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, useSharedValue, withTiming } from 'react-native-reanimated';

import { accessToken } from '@/ai/account';
import { captionMs, type CallLine, type CallPlacedBy, type CallReplyLine } from '@/ai/call-prompt';
import { detectCrisis } from '@/ai/safety';
import { apiBase, serverSpeak } from '@/ai/server';
import { CallControls, callGlass } from '@/components/call/call-controls';
import { CallRings } from '@/components/call/call-rings';
import { CallHelpline, LiveCaption } from '@/components/call/live-caption';
import { useHandsFree } from '@/components/call/use-hands-free';
import { playOnce, setCallAudio, stopNote } from '@/components/chat/voice-player';
import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { OutOfMinutesSheet } from '@/components/plans/out-of-minutes-sheet';
import { InkText } from '@/components/ink';
import { Anim, BlurBackdrop, CharacterAvatar, PressableScale, Screen, Txt, characterImage } from '@/components/ui';
import { planStatus } from '@/economy/plans';
import { CAPTION_STEP_MS, captionLevels } from '@/lib/call-level';
import { callClock, shortName } from '@/lib/format';
import { shareText } from '@/lib/share';
import { dropClip, keepSpeech } from '@/lib/voice-files';
import { callScript, callsIncluded, displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, fonts, friendAccent, gradients, space, systemColors } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';

/** `empty`: no minutes when it opened; `out`: they ran out mid-call and it waits on the sheet. */
type CallState = 'empty' | 'connecting' | 'active' | 'out';

/** From this many seconds left the "N min left" pill's clock turns orange. */
const WARN_SECONDS = 120;

/** How long each subtitle line stays up — a stand-in for streamed TTS. */
const SUBTITLE_INTERVAL_MS = 5000;

/** How long a line waits for its voice; past it the caption shows alone, so the talk never stalls. */
const VOICE_WAIT_MS = 2500;
/** Longer than any line takes to say (about 15 characters a second): a voice that never ends is let go. */
const voiceMaxMs = (text: string) => Math.max(8000, text.length * 120);

/**
 * The in-call screen (canvas "CallVoice", 2026-10-21): blurred portrait, avatar, name and timer,
 * the live line in a glass caption, then mute / end / speaker — nothing else competes with the voice.
 *
 * With the model on, the call is a real talk (0z102): the character opens it, the user just talks
 * (the mic is open, a pause ends their turn, Mute closes it), the server writes out the words, and the
 * character answers in `mode: 'call'`; the lines show as captions, with rings round the avatar while
 * they run, until a voice reads them (ElevenLabs, later). A busy model says Not Delivered with a
 * retry, never a stock line. With the model off, the old subtitles run.
 *
 * Step 4 (brief 2026-11-15): "Connecting" lasts until their first line, not a fixed pause, and the
 * clock starts then; the rings follow the real loudness of their voice (or the rhythm of a caption)
 * and the user's mic, a turning arc shows their answer on its way; Speaker switches speaker and
 * earpiece; with their voice playing the mic stays open, so talking over them stops it.
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
  // Their voice comes from the loudspeaker until Speaker is turned off (then the earpiece).
  const [speaker, setSpeaker] = useState(true);
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
  const helplineToChat = useAppStore((s) => s.helplineToChat);
  const placedBy: CallPlacedBy = answered ? 'character' : 'user';
  // A crisis on the call: help shows on the call at once and the chat gets the card, once a call.
  const [helpline, setHelpline] = useState(false);
  const crisisSeen = useRef(false);
  const markCrisis = () => {
    if (crisisSeen.current || !characterId) return;
    crisisSeen.current = true;
    helplineToChat(characterId);
    if (mounted.current) setHelpline(true);
  };
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
      // Hanging up stops their voice mid-line, and a caption's wait, so their files are dropped.
      sayTurn.current += 1;
      clearTimeout(captionTimer.current);
      clearInterval(pulseTimer.current);
      endPause.current?.();
      stopNote();
    },
    [],
  );

  // The call's audio session: mic allowed, their voice on the loudspeaker or the earpiece; plain
  // playback again once it closes.
  useEffect(() => {
    void setCallAudio({ allowsRecording: true, playsInSilentMode: true, shouldRouteThroughEarpiece: !speaker });
  }, [speaker]);
  useEffect(() => () => void setCallAudio(null), []);

  // Loudness for the avatar (0-1, on the UI thread): theirs and the user's.
  const their = useSharedValue(0);
  const mine = useSharedValue(0);
  const setTheir = (level: number) => their.set(withTiming(level, { duration: 110 }));
  const pulseTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  /** A caption with no voice moves the rings in the rhythm of its words. */
  const pulse = (text: string) => {
    clearInterval(pulseTimer.current);
    const steps = captionLevels(text);
    let at = 0;
    pulseTimer.current = setInterval(() => setTheir(steps.length ? steps[at++ % steps.length] : 0), CAPTION_STEP_MS);
  };
  const stopPulse = () => {
    clearInterval(pulseTimer.current);
    pulseTimer.current = undefined;
    setTheir(0);
  };

  // They speak: in their voice when the server has one (ElevenLabs), else as captions timed like
  // speech; rings round the avatar either way. The mic stays open while their voice plays, behind
  // an echo gate (`createEchoGate`), so talking over them stops them as captions always could.
  const voicePlaying = useRef(false);
  const noVoice = useRef(false);
  const sayTurn = useRef(0);
  const endPause = useRef<(() => void) | undefined>(undefined);

  /** Stops whatever they are saying (talked over, hung up). */
  const hush = () => {
    sayTurn.current += 1;
    clearTimeout(captionTimer.current);
    endPause.current?.();
    stopNote();
    stopPulse();
    voicePlaying.current = false;
  };

  /** A caption's time on screen when there is no voice; `hush` ends it early. */
  const pause = (ms: number) =>
    new Promise<void>((resolve) => {
      endPause.current = resolve;
      captionTimer.current = setTimeout(resolve, ms);
    });

  /** Their line in their voice: a file to play, or null (no voice service, or it failed this time). */
  const voiceOf = async ({ line, sig }: CallReplyLine) => {
    // Only a line the server signed is read aloud; with no voice service none is.
    if (!sig || noVoice.current || !character) return null;
    const audio = await accessToken()
      .then((token) => serverSpeak({ text: line, characterId: character.id, gender: character.gender, sig }, token))
      .catch(() => null);
    if (audio === 'off') noVoice.current = true;
    return audio && audio !== 'off' ? keepSpeech(audio) : null;
  };

  /** A line's voice if it comes in time; one that comes later is dropped and the caption shows alone. */
  const inTime = (voice: Promise<string | null>) =>
    new Promise<string | null>((resolve) => {
      let done = false;
      const late = setTimeout(() => {
        done = true;
        resolve(null);
      }, VOICE_WAIT_MS);
      void voice.then((file) => {
        clearTimeout(late);
        if (!done) resolve(file);
        else if (file) void dropClip(file);
      });
    });

  /** Their lines one after another, each as long as it takes to say; `started` runs as the first shows. */
  const play = async (theirs: CallReplyLine[], started: () => void) => {
    hush();
    const mine = sayTurn.current;
    const current = () => mine === sayTurn.current && mounted.current;
    // Every line's voice is asked for at once, so the lines follow each other without a gap.
    const voices = theirs.map(voiceOf);
    try {
      for (let i = 0; i < theirs.length; i++) {
        const file = await inTime(voices[i]);
        if (!current()) {
          if (file) void dropClip(file);
          continue;
        }
        if (i === 0) started();
        setCaption({ author: 'them', text: theirs[i].text });
        // The words' rhythm first; a voice whose loudness the phone can read takes over the rings.
        pulse(theirs[i].text);
        if (file) {
          voicePlaying.current = true;
          let sampled = false;
          await playOnce(file, voiceMaxMs(theirs[i].text), (level) => {
            if (!sampled) {
              sampled = true;
              clearInterval(pulseTimer.current);
            }
            setTheir(level);
          });
          voicePlaying.current = false;
          void dropClip(file);
        } else await pause(captionMs(theirs[i].text));
      }
    } finally {
      if (mine === sayTurn.current) {
        stopPulse();
        voicePlaying.current = false;
      }
    }
  };

  /** Asks for their next words on what has been said so far; a retry asks the same again. */
  const ask = () => {
    if (!character) return;
    setWaiting(true);
    setFailed(false);
    const sent = said.current;
    // An outgoing call is "Connecting" until their first words (or a failure to show with its retry).
    const connected = () => setState((now) => (now === 'connecting' ? 'active' : now));
    void callReply(character.id, sent, placedBy).then(({ lines: theirs, crisis }) => {
      if (crisis) markCrisis();
      if (!mounted.current || said.current !== sent) return;
      if (!theirs) {
        setWaiting(false);
        connected();
        return setFailed(true);
      }
      said.current = [...sent, ...theirs.map(({ text }) => ({ author: 'them' as const, text }))];
      // The dots stay until their first line shows (with its voice, when there is one).
      void play(theirs, () => {
        setWaiting(false);
        connected();
      });
    });
  };

  // The open mic: the user just talks, and a pause ends their turn. It closes while muted and while
  // their answer is on its way. The words show and the character answers them; words that arrive
  // after the hang-up ask nothing, but a crisis in them still reaches the chat.
  const mic = useHandsFree(
    !!live && state === 'active' && !muted && !waiting,
    (words) => {
      if (detectCrisis(words.text)) markCrisis();
      if (!mounted.current || booked.current) return;
      const line: CallLine = { author: 'me', text: words.text, language: words.language };
      said.current = [...said.current, line];
      hush();
      setCaption(line);
      ask();
    },
    { theirVoice: () => voicePlaying.current, onLevel: (level) => mine.set(withTiming(level, { duration: 140 })) },
  );
  const userTalking = mic.phase === 'speaking';
  const micOpen = mic.phase === 'listening' || userTalking;

  // Talking over them stops them: their captions, and their voice once the echo gate hears the user.
  useEffect(() => {
    if (userTalking) hush();
    // `hush` reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTalking]);

  // A closed mic leaves the avatar's rim dark.
  useEffect(() => {
    if (!micOpen) mine.set(withTiming(0, { duration: 200 }));
  }, [micOpen, mine]);

  // Out of minutes: they stop talking while the sheet is up.
  useEffect(() => {
    if (state === 'out') hush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // The character speaks first: asked while "Connecting", which lasts until their first line.
  useEffect(() => {
    if (!live || opened.current || (state !== 'connecting' && state !== 'active')) return;
    opened.current = true;
    ask();
    // `ask` reads refs; once per call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, state]);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => () => bookRef.current(), []);

  // With the model off nothing is waited for: no made-up "Connecting".
  useEffect(() => {
    if (state === 'connecting' && !live) setState('active');
  }, [state, live]);

  // The model-off subtitles move the rings in their rhythm too.
  useEffect(() => {
    if (live || state !== 'active' || !lines.length) return;
    pulse(lines[line]);
    return () => clearInterval(pulseTimer.current);
    // `pulse` reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, state, line, lines]);

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

  const accent = friendAccent(character.id);

  return (
    <Screen
      background={gradients.call}
      statusBarStyle="light"
      backdrop={<BlurBackdrop source={characterImage(character)} dim={0.36} blur={50} />}>
      {/* Soft friend-hue atmospheric aura fading smoothly into obsidian ground. */}
      <LinearGradient
        colors={[`${accent.strong}38`, 'rgba(9,9,13,0.68)', ink.ground]}
        locations={[0, 0.56, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.topRow}>
        {state === 'active' ? (
          <Animated.View entering={FadeIn.duration(320)} style={styles.minPill}>
            <View style={[styles.liveDot, low && styles.liveDotLow]} />
            <InkText variant="caption" color={ink.text} style={styles.tabular}>
              {t(monthly ? 'plans.minLeftMonth' : 'plans.minLeft', { count: Math.max(1, Math.ceil(remaining / 60)) })}
            </InkText>
          </Animated.View>
        ) : (
          <View />
        )}
        <PressableScale
          style={styles.share}
          hitSlop={6}
          scaleTo={0.88}
          accessibilityLabel={t('a11y.share')}
          onPress={share}>
          <Ionicons name="share-outline" size={19} color={ink.text} />
        </PressableScale>
      </View>

      <View style={styles.head}>
        <View style={styles.avatarWrap}>
          {state === 'connecting' ? <Anim name="calling" size={230} tint={accent.strong} style={styles.rings} /> : null}
          <CallRings size={146} their={their} mine={mine} thinking={state === 'active' && !!live && waiting} accentColor={accent.strong}>
            <CharacterAvatar character={character} size={146} ring ringColor={accent.strong} />
          </CallRings>
        </View>

        <InkText variant="display" color={ink.text} center lines={2} style={styles.name}>
          {name}
        </InkText>

        {state === 'empty' ? null : (
          <InkText variant="sub" color="rgba(255,255,255,0.64)" center style={[styles.timer, styles.tabular]}>
            {state === 'connecting' ? t('call.connecting') : callClock(seconds)}
          </InkText>
        )}
      </View>

      <View style={styles.flex} />

      {state === 'active' && !live ? (
        <Animated.View
          key={line}
          entering={FadeIn.duration(320)}
          exiting={FadeOut.duration(200)}
          style={[styles.fallbackCaption, callGlass.caption]}
          accessibilityLiveRegion="polite">
          <View style={[styles.fallbackLine, { borderLeftColor: accent.strong }]}>
            <Txt style={styles.fallbackText}>{`“${lines[line]}”`}</Txt>
          </View>
        </Animated.View>
      ) : null}

      {state === 'active' && live ? (
        <>
          {helpline ? <CallHelpline /> : null}
          <LiveCaption
            talking={userTalking}
            hearing={mic.phase === 'sending'}
            hearingFailed={mic.failed}
            caption={caption}
            accentColor={accent.strong}
            waiting={waiting}
            failed={failed}
            onRetryHearing={mic.retry}
            onRetry={ask}
          />
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
        gender={character?.gender}
        talked={state === 'out' ? minutes.planTotal - minutes.plan + seconds : undefined}
        onAdded={resume}
        onNoShells={() => leaveFor('/store/shell?tab=shells')}
        onGetPro={() => leaveFor('/store/shell?tab=plans&plan=pro')}
        onDone={hangUp}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  missing: { padding: space.xl },
  tabular: { fontVariant: ['tabular-nums'] },
  topRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: space.lg,
    marginTop: space.xs,
  },
  minPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 13,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.photoGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
  },
  liveDot: { width: 7, height: 7, borderRadius: inkRadius.pill, backgroundColor: systemColors.green },
  liveDotLow: { backgroundColor: systemColors.orange },
  share: {
    width: 40,
    height: 40,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.photoGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
  },
  head: { marginTop: 64, alignItems: 'center', paddingHorizontal: space.xxl },
  avatarWrap: { alignItems: 'center', justifyContent: 'center' },
  rings: { position: 'absolute' },
  name: { marginTop: 26 },
  timer: { marginTop: 4 },
  fallbackCaption: {
    backgroundColor: 'rgba(18,18,24,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  fallbackLine: { alignSelf: 'stretch', borderLeftWidth: 2, paddingLeft: 12 },
  fallbackText: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 23, color: 'rgba(255,255,255,0.95)' },
});
