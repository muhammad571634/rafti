import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { captionMs } from '@/ai/call-prompt';
import type { GroupCallLine } from '@/ai/group-call';
import { detectCrisis } from '@/ai/safety';
import { apiBase } from '@/ai/server';
import { CallControls, callGlass } from '@/components/call/call-controls';
import { CallHelpline, LiveCaption } from '@/components/call/live-caption';
import { useHandsFree } from '@/components/call/use-hands-free';
import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { OutOfMinutesSheet } from '@/components/plans/out-of-minutes-sheet';
import { Anim, BlurBackdrop, CharacterAvatar, Screen, Txt, characterImage } from '@/components/ui';
import { planStatus } from '@/economy/plans';
import { callClock, shortName } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { callScript, callsIncluded, displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, gradients, space, systemColors } from '@/theme';

/** `empty`: no minutes when it opened; `out`: they ran out mid-call and it waits on the sheet. */
type CallState = 'empty' | 'connecting' | 'active' | 'out';

const WARN_SECONDS = 120;
/** Each member speaks a line in turn — a stand-in for streamed TTS. */
const SUBTITLE_INTERVAL_MS = 4500;

/**
 * A group call: every member on screen, the one speaking lit up with their line under
 * them. It uses the same call minutes as a one-to-one call, and the same sheets when
 * they run out; the call lands in the group chat as one line.
 *
 * With the model on (0z113) it is a real talk, as on a one-to-one call: two members pick up with a
 * hello, the user just talks (the open mic, a pause ends their turn, Mute closes it), and one or two
 * members answer each time (`groupCallReply`), their lines as captions under their name while their
 * face lights up. A busy model says Not Delivered with a retry, never a stock line. With the model
 * off, the old subtitles run.
 */
export default function GroupCallScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = Array.isArray(id) ? id[0] : id;
  const { t } = useTranslation();
  const router = useRouter();

  const group = useAppStore((s) => s.groups.find((g) => g.id === groupId));
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const addGroupCall = useAppStore((s) => s.addGroupCall);
  const wallet = useAppStore((s) => s.wallet);
  const member = callsIncluded(wallet);
  const budget = useRef(minutesOf(useAppStore.getState().wallet, 'call').total);

  const [state, setState] = useState<CallState>(budget.current <= 0 ? 'empty' : 'connecting');
  const [seconds, setSeconds] = useState(0);
  const [line, setLine] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const startedAt = useRef(new Date().toISOString());
  const secondsRef = useRef(0);
  const booked = useRef(false);
  const bookRef = useRef(() => {});

  // A call on the model: what has been said, the caption up now, and an answer on its way.
  const live = useAppStore((s) => s.settings.realAi) && !!apiBase();
  const groupCallReply = useAppStore((s) => s.groupCallReply);
  const groupHelplineToChat = useAppStore((s) => s.groupHelplineToChat);
  // A crisis on the call: help shows on the call at once and the group chat gets the card, once a call.
  const [helpline, setHelpline] = useState(false);
  const crisisSeen = useRef(false);
  const mounted = useRef(true);
  const markCrisis = () => {
    if (crisisSeen.current || !groupId) return;
    crisisSeen.current = true;
    groupHelplineToChat(groupId);
    if (mounted.current) setHelpline(true);
  };
  const said = useRef<GroupCallLine[]>([]);
  const [caption, setCaption] = useState<GroupCallLine | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const opened = useRef(false);
  const sayTurn = useRef(0);
  const captionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const endPause = useRef<(() => void) | undefined>(undefined);
  useEffect(
    () => () => {
      mounted.current = false;
      sayTurn.current += 1;
      clearTimeout(captionTimer.current);
      endPause.current?.();
    },
    [],
  );

  /** Stops whatever they are saying (talked over, out of minutes). */
  const hush = () => {
    sayTurn.current += 1;
    clearTimeout(captionTimer.current);
    endPause.current?.();
    setSpeaking(false);
  };

  /** A caption's time on screen; `hush` ends it early. */
  const pause = (ms: number) =>
    new Promise<void>((resolve) => {
      endPause.current = resolve;
      captionTimer.current = setTimeout(resolve, ms);
    });

  /** Their lines one after another, each as long as it takes to say, under the member who says it. */
  const play = async (theirs: GroupCallLine[]) => {
    hush();
    const mine = sayTurn.current;
    for (const line of theirs) {
      if (mine !== sayTurn.current || !mounted.current) return;
      setSpeaking(true);
      setCaption(line);
      await pause(captionMs(line.text));
    }
    if (mine === sayTurn.current && mounted.current) setSpeaking(false);
  };

  // Each ask has its number: talking over them, a new ask or the hang-up makes an older one stale, so
  // its members still on their way are neither shown nor asked.
  const askGen = useRef(0);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * Asks the members for their next words on what has been said so far; a retry asks the same again.
   * The first member speaks as soon as their lines come, while the second is still being asked.
   */
  const ask = () => {
    if (!groupId) return;
    const gen = ++askGen.current;
    const current = () => gen === askGen.current && mounted.current && !booked.current;
    setWaiting(true);
    setFailed(false);
    let shown: Promise<void> = Promise.resolve();
    void groupCallReply(groupId, said.current, {
      alive: () => current() && stateRef.current === 'active',
      onTurn: (turn) => {
        if (!current()) return;
        const theirs = turn.lines.map((text) => ({ author: 'them' as const, text, characterId: turn.characterId }));
        said.current = [...said.current, ...theirs];
        setWaiting(false);
        // Out of minutes: kept in what was said, never shown under the sheet.
        if (stateRef.current !== 'active') return;
        shown = shown.then(() => (current() ? play(theirs) : undefined));
      },
    }).then(({ turns, crisis }) => {
      if (crisis) markCrisis();
      if (!current()) return;
      setWaiting(false);
      if (!turns) setFailed(true);
    });
  };

  // The open mic, as on a one-to-one call: closed while muted and while the answer is on its way.
  // Words that arrive after the hang-up ask nothing, but a crisis in them still reaches the chat.
  const mic = useHandsFree(!!live && state === 'active' && !muted && !waiting, (words) => {
    if (detectCrisis(words.text)) markCrisis();
    if (!mounted.current || booked.current) return;
    const line: GroupCallLine = { author: 'me', text: words.text, language: words.language };
    said.current = [...said.current, line];
    hush();
    setCaption(line);
    ask();
  });
  const userTalking = mic.phase === 'speaking';

  // Talking over their captions stops them, as a voice would stop, and a member not yet heard
  // stays quiet: the user's words get a fresh answer.
  useEffect(() => {
    if (!userTalking) return;
    askGen.current += 1;
    hush();
    // `hush` reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTalking]);

  // Out of minutes: they stop talking while the sheet is up.
  useEffect(() => {
    if (state === 'out') hush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Two members pick up with a hello, once the call is up.
  useEffect(() => {
    if (!live || state !== 'active' || opened.current) return;
    opened.current = true;
    ask();
    // `ask` reads refs; once per call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, state]);

  const members = useMemo(
    () => (group?.memberIds ?? []).flatMap((m) => characters.find((c) => c.id === m) ?? []),
    [group?.memberIds, characters],
  );
  // Members take turns: Kai's first line, Theo's first, Hana's first, then everyone's second...
  const lines = useMemo(() => {
    const scripts = members.map((m) => callScript(m));
    const longest = Math.max(0, ...scripts.map((s) => s.length));
    return Array.from({ length: longest }, (_, i) => scripts.map((s, who) => ({ who, text: s[i] })))
      .flat()
      .filter((l) => !!l.text);
  }, [members]);

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

  useEffect(() => {
    if (state === 'active' && remaining <= 0) setState('out');
  }, [state, remaining]);

  if (!group || !groupId || members.length < 2) {
    return (
      <Screen>
        <Txt style={styles.missing}>{t('group.notFound')}</Txt>
      </Screen>
    );
  }

  const nameOf = (i: number) => shortName(displayName(members[i], relationships[members[i].id]));
  const title = group.name || groupTitle(members.map((_, i) => nameOf(i)));
  const current = lines[line % Math.max(1, lines.length)];
  const speakerId = live ? (speaking && caption?.author === 'them' ? caption.characterId : undefined) : undefined;
  const captionWho = caption?.characterId ? members.findIndex((m) => m.id === caption.characterId) : -1;

  const book = () => {
    const talked = secondsRef.current;
    if (booked.current || talked <= 0) return;
    booked.current = true;
    addGroupCall(groupId, startedAt.current, talked, said.current);
  };
  bookRef.current = book;

  const hangUp = () => {
    book();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const leaveFor = (route: Href) => {
    book();
    router.replace(route);
  };

  const resume = () => {
    budget.current = minutesOf(useAppStore.getState().wallet, 'call').total;
    setState(state === 'out' ? 'active' : 'connecting');
  };

  const minutes = minutesOf(wallet, 'call');
  const status = planStatus(wallet.subscription, Date.now());
  const monthly = !!status && !status.trial;
  // The minutes left show for the whole call; the last two turn the clock orange.
  const low = remaining <= WARN_SECONDS;
  const face = members.length >= 3 ? 92 : 112;

  return (
    <Screen
      background={gradients.call}
      statusBarStyle="light"
      backdrop={<BlurBackdrop source={characterImage(members[0])} dim={0.35} blur={50} />}>
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.14)', 'rgba(0,0,0,0.52)']}
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
      </View>

      <View style={styles.faces}>
        {state === 'connecting' ? (
          <Anim name="calling" size={260} tint="rgba(255,255,255,0.5)" style={styles.rings} />
        ) : null}
        {members.map((m, i) => {
          const talking = state === 'active' && (live ? speakerId === m.id : current?.who === i);
          return (
            <View key={m.id} style={[styles.face, state === 'active' && !talking && styles.quiet]}>
              <View>
                <CharacterAvatar
                  character={m}
                  size={face}
                  ring
                  ringColor={talking ? colors.onMedia : 'rgba(255,255,255,0.45)'}
                />
                {talking ? <SpeakingBadge /> : null}
              </View>
              <Txt style={styles.faceName} lines={1}>
                {nameOf(i)}
              </Txt>
            </View>
          );
        })}
      </View>

      <View style={styles.head}>
        <Txt style={callGlass.title} lines={2}>
          {title}
        </Txt>
        {state === 'empty' ? null : (
          <Txt style={callGlass.timer}>{state === 'connecting' ? t('group.callConnecting') : callClock(seconds)}</Txt>
        )}
      </View>

      <View style={styles.flex} />

      {state === 'active' && live ? (
        <>
          {helpline ? <CallHelpline /> : null}
          <LiveCaption
            talking={userTalking}
            hearing={mic.phase === 'sending'}
            hearingFailed={mic.failed}
            caption={caption}
            who={captionWho >= 0 ? nameOf(captionWho) : undefined}
            waiting={waiting}
            failed={failed}
            onRetryHearing={mic.retry}
            onRetry={ask}
          />
        </>
      ) : null}

      {state === 'active' && !live && current ? (
        <Animated.View
          key={line}
          entering={FadeIn.duration(320)}
          exiting={FadeOut.duration(200)}
          style={[callGlass.glass, callGlass.caption]}
          accessibilityLiveRegion="polite">
          <Txt style={styles.who}>{nameOf(current.who)}</Txt>
          <Txt style={callGlass.captionText}>{`“${current.text}”`}</Txt>
        </Animated.View>
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

      <CallPaywallSheet
        visible={state === 'empty' && !member}
        character={members[0]}
        name={displayName(members[0], relationships[members[0].id])}
        onClose={() => router.back()}
        onStarted={resume}
      />
      <OutOfMinutesSheet
        visible={state === 'out' || (state === 'empty' && member)}
        name={state === 'out' ? title : undefined}
        talked={state === 'out' ? minutes.planTotal - minutes.plan + seconds : undefined}
        onAdded={resume}
        onNoShells={() => leaveFor('/store/shell?tab=shells')}
        onGetPro={() => leaveFor('/store/shell?tab=plans&plan=pro')}
        onDone={hangUp}
      />
    </Screen>
  );
}

/** The green badge on whoever is talking: three bars that rise and fall like a voice. */
function SpeakingBadge() {
  return (
    <View style={styles.badge}>
      {[0, 150, 300].map((delay) => (
        <Bar key={delay} delay={delay} />
      ))}
    </View>
  );
}

function Bar({ delay }: { delay: number }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(0.4);
  useEffect(() => {
    if (reduced) return;
    scale.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0.4, { duration: 450 })), -1),
    );
  }, [delay, reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }));
  return <Animated.View style={[styles.bar, style]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  missing: { padding: space.xl },
  faces: { marginTop: 52, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 18 },
  rings: { position: 'absolute', alignSelf: 'center', top: -60 },
  face: { width: 100, alignItems: 'center', gap: 10 },
  quiet: { opacity: 0.6 },
  faceName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: colors.onMedia },
  head: { marginTop: 50, paddingHorizontal: space.xl },
  who: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.72)' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: systemColors.green,
    borderWidth: 3,
    borderColor: 'rgba(16,16,24,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  bar: { width: 3, height: 12, borderRadius: 2, backgroundColor: colors.onMedia },
});
