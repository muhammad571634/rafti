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

import { CallControls, callGlass } from '@/components/call/call-controls';
import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { OutOfMinutesSheet } from '@/components/plans/out-of-minutes-sheet';
import { Anim, BlurBackdrop, CharacterAvatar, PressableScale, Screen, Txt, characterImage } from '@/components/ui';
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
    const subtitle = setInterval(() => setLine((l) => (l + 1) % Math.max(1, lines.length)), SUBTITLE_INTERVAL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(subtitle);
    };
  }, [state, lines.length]);

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

  const book = () => {
    const talked = secondsRef.current;
    if (booked.current || talked <= 0) return;
    booked.current = true;
    addGroupCall(groupId, startedAt.current, talked);
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
          const talking = state === 'active' && current?.who === i;
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

      {state === 'active' && current ? (
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
