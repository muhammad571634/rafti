import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { OutOfMinutesSheet } from '@/components/plans/out-of-minutes-sheet';
import { Anim, BlurBackdrop, CharacterAvatar, PressableScale, Screen, Txt, characterImage } from '@/components/ui';
import { planStatus } from '@/economy/plans';
import { callClock, shortName } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { callScript, callsIncluded, displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, gradients, radius, space } from '@/theme';

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
  const warn = state === 'active' && remaining <= WARN_SECONDS;
  const face = members.length >= 3 ? 92 : 112;

  return (
    <Screen
      background={gradients.call}
      statusBarStyle="light"
      backdrop={<BlurBackdrop source={characterImage(members[0])} dim={0.35} blur={50} />}>
      <LinearGradient colors={['rgba(0,0,0,0.18)', 'transparent']} style={styles.topScrim} />

      <View style={styles.top}>
        {warn ? (
          <Animated.View entering={FadeIn.duration(320)} style={styles.warn}>
            <Txt variant="smallStrong" color={colors.onMedia}>
              {t(monthly ? 'plans.minLeftMonth' : 'plans.minLeft', { count: Math.max(1, Math.ceil(remaining / 60)) })}
            </Txt>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.faces}>
          {state === 'connecting' ? (
            <Anim name="calling" size={260} tint="rgba(255,255,255,0.5)" style={styles.rings} />
          ) : null}
          {members.map((m, i) => {
            const talking = state === 'active' && current?.who === i;
            return (
              <View key={m.id} style={[styles.face, state === 'active' && !talking && styles.quiet]}>
                <CharacterAvatar
                  character={m}
                  size={face}
                  ring
                  ringColor={talking ? colors.onMedia : 'rgba(255,255,255,0.45)'}
                />
                <Txt variant="smallStrong" color={colors.onMedia} lines={1}>
                  {nameOf(i)}
                </Txt>
              </View>
            );
          })}
        </View>

        <Txt variant="h2" color={colors.onMedia} center style={styles.name} lines={2}>
          {title}
        </Txt>

        {state === 'empty' ? null : (
          <Txt variant="small" color={colors.onMediaMuted} center style={styles.timer}>
            {state === 'connecting' ? t('group.callConnecting') : callClock(seconds)}
          </Txt>
        )}

        {state === 'active' && current ? (
          <Animated.View key={line} entering={FadeIn.duration(320)} exiting={FadeOut.duration(200)}>
            <Txt variant="title" color={colors.onMedia} center style={styles.subtitle}>
              {`${nameOf(current.who)}: “${current.text}”`}
            </Txt>
          </Animated.View>
        ) : null}
      </View>

      <View
        style={[
          styles.controls,
          { paddingBottom: Math.max(insets.bottom + space.lg, space.xxxl) },
          state === 'empty' && styles.hidden,
        ]}>
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

/** A round glass toggle beside the hang-up button (the mock has no audio session yet). */
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
  missing: { padding: space.xl },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
  top: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingTop: space.md },
  warn: {
    paddingHorizontal: space.md + 2,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.onMediaHairline,
    backgroundColor: colors.onMediaGlass,
  },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  faces: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: space.lg },
  rings: { position: 'absolute', alignSelf: 'center', top: -60 },
  face: { alignItems: 'center', gap: space.sm, maxWidth: 112 },
  quiet: { opacity: 0.6 },
  name: { marginTop: space.xl },
  timer: { marginTop: space.xs, fontVariant: ['tabular-nums'] },
  subtitle: { marginTop: space.xxl, lineHeight: 24 },
  hidden: { display: 'none' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    paddingHorizontal: space.lg,
    paddingBottom: space.xxxl,
  },
  control: { alignItems: 'center', gap: space.sm, width: 84 },
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
