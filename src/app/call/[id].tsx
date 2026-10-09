import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { OutOfMinutesSheet } from '@/components/plans/out-of-minutes-sheet';
import { Anim, BlurBackdrop, CharacterAvatar, PressableScale, Screen, Txt, characterImage } from '@/components/ui';
import { planStatus } from '@/economy/plans';
import { callClock, shortName } from '@/lib/format';
import { shareForReward } from '@/lib/share';
import { callScript, displayName, memberActive, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, gradients, radius, space } from '@/theme';

/** `empty`: no minutes when it opened; `out`: they ran out mid-call and it waits on the sheet. */
type CallState = 'empty' | 'connecting' | 'active' | 'out';

/** The "N min left" pill shows from this many seconds left. */
const WARN_SECONDS = 120;

/** How long each subtitle line stays up — a stand-in for streamed TTS. */
const SUBTITLE_INTERVAL_MS = 5000;

/**
 * The in-call screen: blurred portrait, avatar, timer and live subtitles, with
 * mute / end / speaker underneath — nothing else competes with the voice.
 */
export default function CallScreen() {
  const { id, incoming } = useLocalSearchParams<{ id: string; incoming?: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;
  const answered = incoming === '1';

  const { t } = useTranslation();
  const router = useRouter();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const addCall = useAppStore((s) => s.addCall);
  const wallet = useAppStore((s) => s.wallet);
  const member = memberActive(wallet);
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
    addCall({
      characterId: character.id,
      startedAt: startedAt.current,
      durationSec: talked,
      direction: answered ? 'incoming' : 'outgoing',
      missed: false,
    });
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
  const monthly = !!status && !status.trial && status.plan !== 'quarterly';
  const warn = state === 'active' && remaining <= WARN_SECONDS;

  const share = () => {
    // Sharing a call counts as the day's share.
    void shareForReward(t('call.shareMessage', { name }));
  };

  return (
    <Screen
      background={gradients.call}
      statusBarStyle="light"
      backdrop={<BlurBackdrop source={characterImage(character)} dim={0.3} blur={50} />}>
      <LinearGradient colors={['rgba(0,0,0,0.18)', 'transparent']} style={styles.topScrim} />

      <View style={styles.top}>
        <View style={styles.topSide} />
        <View style={styles.flex}>
          {warn ? (
            <Animated.View entering={FadeIn.duration(320)} style={styles.warn}>
              <Txt variant="smallStrong" color={colors.onMedia}>
                {t(monthly ? 'plans.minLeftMonth' : 'plans.minLeft', { count: Math.max(1, Math.ceil(remaining / 60)) })}
              </Txt>
            </Animated.View>
          ) : null}
        </View>
        <PressableScale
          style={styles.topSide}
          hitSlop={10}
          scaleTo={0.88}
          accessibilityLabel={t('a11y.share')}
          onPress={share}>
          <Ionicons name="share-outline" size={22} color={colors.onMedia} />
        </PressableScale>
      </View>

      <View style={styles.body}>
        <View style={styles.avatarWrap}>
          {state === 'connecting' ? (
            <Anim name="calling" size={230} tint="rgba(255,255,255,0.7)" style={styles.rings} />
          ) : null}
          <CharacterAvatar character={character} size={150} ring ringColor="rgba(255,255,255,0.85)" />
        </View>

        <Txt variant="h2" color={colors.onMedia} center style={styles.name}>
          {name}
        </Txt>

        {state === 'empty' ? null : (
          <Txt variant="small" color={colors.onMediaMuted} center style={styles.timer}>
            {state === 'connecting' ? t('call.connecting') : callClock(seconds)}
          </Txt>
        )}

        {state === 'active' ? (
          <Animated.View key={line} entering={FadeIn.duration(320)} exiting={FadeOut.duration(200)}>
            <Txt variant="title" color={colors.onMedia} center style={styles.subtitle}>
              {`“${lines[line]}”`}
            </Txt>
          </Animated.View>
        ) : null}
      </View>

      <View style={[styles.controls, state === 'empty' && styles.hidden]}>
        <CallControl
          icon={muted ? 'mic-off' : 'mic-off-outline'}
          label={muted ? t('call.unmute') : t('call.mute')}
          active={muted}
          onPress={() => setMuted((v) => !v)}
        />
        <View style={styles.control}>
          <View style={styles.slot}>
            <PressableScale
              style={styles.hangUp}
              onPress={hangUp}
              scaleTo={0.9}
              haptic
              accessibilityRole="button"
              accessibilityLabel={t('call.end')}>
              <MaterialCommunityIcons name="phone-hangup" size={30} color={colors.onMedia} />
            </PressableScale>
          </View>
          <Txt variant="caption" color={colors.onMediaMuted}>
            {t('call.end')}
          </Txt>
        </View>
        <CallControl
          icon={speaker ? 'volume-high' : 'volume-high-outline'}
          label={t('call.speaker')}
          active={speaker}
          onPress={() => setSpeaker((v) => !v)}
        />
      </View>

      {/* No minutes when it opened: free users hear what Basic adds, members can top up. */}
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
 * A round glass toggle beside the hang-up button. The mock has no audio session yet,
 * so mute and speaker only change state; real builds route them to expo-audio.
 */
function CallControl({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.control}>
      <View style={styles.slot}>
        <PressableScale
          style={[styles.toggle, active && styles.toggleActive]}
          onPress={onPress}
          scaleTo={0.9}
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityState={{ checked: active }}
          aria-checked={active}>
          <Ionicons name={icon} size={24} color={active ? colors.text : colors.onMedia} />
        </PressableScale>
      </View>
      <Txt variant="caption" color={colors.onMediaMuted}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  missing: { padding: space.xl },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.md },
  topSide: { width: 40, alignItems: 'flex-end' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl },
  avatarWrap: { alignItems: 'center', justifyContent: 'center' },
  rings: { position: 'absolute' },
  name: { marginTop: space.xl },
  timer: { marginTop: space.xs, fontVariant: ['tabular-nums'] },
  subtitle: { marginTop: space.xxl, lineHeight: 24 },
  warn: {
    alignSelf: 'center',
    paddingHorizontal: space.md + 2,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.onMediaHairline,
    backgroundColor: colors.onMediaGlass,
  },
  hidden: { display: 'none' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    paddingHorizontal: space.lg,
    paddingBottom: space.xxxl,
  },
  control: { alignItems: 'center', gap: space.sm, width: 84 },
  // Every button sits in a slot as tall as the hang-up, so the labels line up.
  slot: { height: 68, justifyContent: 'center' },
  toggle: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.onMediaGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: colors.onMedia },
  hangUp: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
