import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { NightFace, NightRound, untilText } from '@/components/alarms/night-kit';
import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { Anim, Button, CharacterAvatar, DotMatrix, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { hasPro } from '@/economy/plans';
import { useFriendName } from '@/hooks/use-friend-name';
import { alarmTime, uses12Hour } from '@/lib/alarm-format';
import { nextAlarmAt } from '@/lib/alarms';
import { callClock } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/use-app-store';
import { bottomRoom, sleepColors as night, space, systemColors } from '@/theme';
import { inkFace, inkRadius } from '@/theme/ink';
import type { Alarm, Character } from '@/types';

/** Sleep timer steps for -/+, in minutes. */
const TIMERS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const FACE = 58;
const STROKE = 10;

/**
 * Bedtime, the night's own screen (owner-approved prototype 0z170,
 * https://claude.ai/artifact/Q4tgLYeHSLkpJnMcTvnP4c): the friend who whispers inside the dot field
 * (their picture in its middle since 2026-11-18), who as a row of faces, the sleep timer as a big number with -/+, the next
 * wake-up as a card (tap: the alarms; none: set one), one big button. While the friend whispers, a
 * ring empties around the rocking moon with the countdown, Stop and Pause. Whispers are Pro only
 * (backend-plan §15.10) and never use voice-reply minutes; alarms open for every plan. Colours come
 * from `sleepColors`, the night's navy in both themes, shared with the alarms.
 */
export default function BedtimeScreen() {
  const friendName = useFriendName();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // The moon fits any phone: the setup scrolls, the whispering screen never does.
  const artSize = Math.round(Math.min(230, Math.max(150, height * 0.26)));
  const ringSize = Math.round(Math.min(290, Math.max(200, height * 0.34)));

  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const pro = useAppStore((s) => hasPro(s.wallet.subscription, Date.now()));
  const alarms = useAppStore((s) => s.alarms);

  const known = useMemo(
    () => characters.filter((c) => c.voiceReady && conversations.some((v) => v.characterId === c.id)),
    [characters, conversations],
  );

  const [readerId, setReaderId] = useState(known[0]?.id);
  const [step, setStep] = useState(TIMERS.indexOf(20));
  const [left, setLeft] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [locked, setLocked] = useState(false);

  const minutes = TIMERS[step];
  const reader = known.find((c) => c.id === readerId);
  const running = left != null;
  const name = reader ? friendName(reader, true) : '';
  const wake = useNextWake(alarms, characters);

  useEffect(() => {
    if (left == null || paused) return;
    if (left <= 0) {
      setLeft(null);
      return;
    }
    // Real builds stream the whisper track with expo-audio and fade it out at zero.
    const tick = setTimeout(() => setLeft((s) => (s == null ? null : s - 1)), 1000);
    return () => clearTimeout(tick);
  }, [left, paused]);

  const begin = () => {
    setPaused(false);
    setLeft(minutes * 60);
  };
  const start = () => {
    if (!reader) return;
    haptic.tap();
    if (!pro) return setLocked(true);
    begin();
  };
  const stop = () => {
    haptic.tap();
    setLeft(null);
    setPaused(false);
  };
  const nudge = (by: number) => {
    const next = Math.max(0, Math.min(TIMERS.length - 1, step + by));
    if (next !== step) haptic.selection();
    setStep(next);
  };

  const wakeLine = wake ? `${wake.who ? friendName(wake.who, true) : wake.alarm.label || t('home.widget.wakeUp')} · ${untilText(t, wake.at.getTime() - Date.now())}` : '';

  return (
    <Screen background={night.bg} statusBarStyle="light">
      <Header
        tint={night.text}
        right={
          !pro && !running ? (
            <View style={styles.proPill}>
              <Txt style={styles.proText}>{t('plans.name.pro')}</Txt>
            </View>
          ) : null
        }
      />

      {running ? (
        <View style={[styles.whisperPage, { paddingBottom: bottomRoom(insets.bottom, space.lg) }]}>
          <View style={styles.whisperPill}>
            {reader ? <CharacterAvatar character={reader} size={26} /> : null}
            <Txt style={styles.whisperName} lines={1}>
              {t('bedtime.whispering', { name })}
            </Txt>
            {paused ? null : <Anim name="voiceWave" size={22} tint={night.primary} />}
          </View>

          {/* The LED dot field breathes inside the timer ring while the friend whispers, in place of the
              sleeping mascot (owner, 2026-11-11: "the dark prototype's animation, more alive, wavy"). */}
          <TimerRing size={ringSize} share={minutes > 0 ? (left ?? 0) / (minutes * 60) : 0}>
            <View style={{ width: Math.round(ringSize * 0.8), height: Math.round(ringSize * 0.8) }}>
              <DotMatrix size={Math.round(ringSize * 0.8)} color={NIGHT_DOTS} color2={NIGHT_DOTS_EDGE} cells={17} energy={paused ? 0.2 : 0.9} active={!paused} />
              {reader ? <DreamFace character={reader} size={Math.round(ringSize * 0.8 * FACE_SHARE)} /> : null}
            </View>
          </TimerRing>

          <Txt style={styles.countdown} accessibilityLabel={t('bedtime.remaining', { time: callClock(left ?? 0) })}>
            {callClock(left ?? 0)}
          </Txt>

          <View style={styles.controls}>
            <PressableScale onPress={stop} scaleTo={0.94} style={[styles.control, styles.controlGrey]} accessibilityRole="button" accessibilityLabel={t('bedtime.stop')}>
              <View style={styles.stopGlyph} />
            </PressableScale>
            <PressableScale
              onPress={() => {
                haptic.tap();
                setPaused((p) => !p);
              }}
              scaleTo={0.94}
              style={[styles.control, styles.controlWarm]}
              accessibilityRole="button"
              accessibilityLabel={paused ? t('bedtime.resume') : t('bedtime.pause')}>
              <Ionicons name={paused ? 'play' : 'pause'} size={30} color={night.textOnPrimary} />
            </PressableScale>
          </View>

          <View style={styles.flex} />
          {wake ? (
            <View style={styles.wakePill} accessibilityLabel={`${t('bedtime.wakeUp')}, ${wake.time}, ${wakeLine}`}>
              {wake.who ? <CharacterAvatar character={wake.who} size={26} /> : <Ionicons name="alarm" size={18} color={systemColors.green} />}
              <Txt style={styles.wakePillTime}>{wake.time}</Txt>
              {wake.who ? (
                <Txt style={styles.wakePillName} lines={1}>
                  {friendName(wake.who, true)}
                </Txt>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <Txt style={styles.title} accessibilityRole="header">
              {t('bedtime.title')}
            </Txt>

            <View style={styles.hero}>
              <View style={{ width: artSize, height: artSize }}>
                {/* The dot field at rest, slower and softer than while whispering. */}
                <DotMatrix size={artSize} color={NIGHT_DOTS} color2={NIGHT_DOTS_EDGE} cells={17} energy={0.45} />
                {reader ? <DreamFace character={reader} size={Math.round(artSize * FACE_SHARE)} /> : null}
              </View>
              <Txt style={styles.heroTitle} center lines={2}>
                {reader ? t('bedtime.sleepWith', { name }) : t('bedtime.noVoices')}
              </Txt>
            </View>

            {known.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faces}>
                {known.map((c) => (
                  <NightFace
                    key={c.id}
                    name={friendName(c, true)}
                    on={c.id === readerId}
                    size={FACE}
                    steady
                    onPress={() => {
                      if (c.id !== readerId) haptic.selection();
                      setReaderId(c.id);
                    }}>
                    <CharacterAvatar character={c} size={FACE} />
                  </NightFace>
                ))}
              </ScrollView>
            ) : null}

            {reader ? (
              <View style={styles.timerCard} accessibilityLabel={`${t('bedtime.setTimer')}, ${t('radio.minutes', { count: minutes })}`}>
                <NightRound icon="remove" label={t('bedtime.setTimer')} onPress={() => nudge(-1)} size={52} />
                <View style={styles.timerValue}>
                  <Ionicons name="timer-outline" size={22} color={night.textSecondary} />
                  <Txt style={styles.timerText} lines={1} maxFontSizeMultiplier={1.2}>
                    {t('radio.minutes', { count: minutes })}
                  </Txt>
                </View>
                <NightRound icon="add" label={t('bedtime.setTimer')} onPress={() => nudge(1)} size={52} />
              </View>
            ) : null}

            {wake ? (
              <PressableScale
                onPress={() => router.push('/alarms')}
                scaleTo={0.98}
                style={styles.wakeCard}
                accessibilityRole="button"
                accessibilityLabel={`${t('bedtime.wakeUp')}, ${wake.time}, ${wakeLine}`}>
                <View style={styles.wakeTile}>
                  <Ionicons name="alarm" size={24} color={night.white} />
                </View>
                <View style={styles.flex}>
                  <Txt style={styles.wakeTime}>{wake.time}</Txt>
                  <Txt style={styles.wakeLine} lines={1}>
                    {wakeLine}
                  </Txt>
                </View>
                {wake.who ? <CharacterAvatar character={wake.who} size={36} /> : null}
                <Ionicons name="chevron-forward" size={18} color={night.textFaint} />
              </PressableScale>
            ) : (
              <PressableScale
                onPress={() => router.push('/alarms/edit')}
                scaleTo={0.98}
                style={[styles.wakeCard, styles.wakeEmpty]}
                accessibilityRole="button"
                accessibilityLabel={t('home.widget.setWake')}>
                <View style={[styles.wakeTile, styles.wakeTileSoft]}>
                  <Ionicons name="alarm-outline" size={24} color={systemColors.green} />
                </View>
                <Txt style={[styles.flex, styles.wakeSet]} lines={1}>
                  {t('home.widget.setWake')}
                </Txt>
                <View style={styles.plus}>
                  <Ionicons name="add" size={22} color={night.textOnPrimary} />
                </View>
              </PressableScale>
            )}
          </ScrollView>

          <View style={[styles.bar, { paddingBottom: bottomRoom(insets.bottom, space.lg) }]}>
            <Button
              label={t('bedtime.start')}
              size="lg"
              onPress={start}
              disabled={!reader}
              full
              left={<Ionicons name={pro ? 'moon' : 'lock-closed'} size={18} color={night.textOnPrimary} />}
            />
          </View>
        </>
      )}

      {reader ? (
        <CallPaywallSheet
          visible={locked}
          character={reader}
          name={reader.name}
          kind="bedtime"
          onClose={() => setLocked(false)}
          onStarted={() => {
            setLocked(false);
            begin();
          }}
        />
      ) : null}
    </Screen>
  );
}

/** The next alarm that rings, who wakes you with it, and its time as the phone writes it. */
function useNextWake(alarms: Alarm[], characters: Character[]) {
  const { t } = useTranslation();
  return useMemo(() => {
    const now = new Date();
    const next = alarms
      .filter((a) => a.enabled)
      .map((a) => ({ alarm: a, at: nextAlarmAt(a, now) }))
      .sort((x, y) => x.at.getTime() - y.at.getTime())[0];
    if (!next) return null;
    const { time, period } = alarmTime(next.alarm.hour, next.alarm.minute, uses12Hour());
    return {
      ...next,
      time: period ? `${time} ${t(`alarms.${period}`)}` : time,
      who: next.alarm.characterId ? characters.find((c) => c.id === next.alarm.characterId) : undefined,
    };
  }, [alarms, characters, t]);
}

/** The dot field: lavender in the middle drifting to the warm peach of the ring at its edge. */
const NIGHT_DOTS = '#A78BFA';
const NIGHT_DOTS_EDGE = '#FFB88A';

/** How much of the dot field the friend's picture fills: the dots stay a halo round it. */
const FACE_SHARE = 0.5;

/**
 * The chosen friend inside the dot field (owner, 2026-11-18: no mascot; the friend's picture in the
 * animation): their photo in the middle, its rim melting into the night so the dots seem to come
 * out of it. Picking another friend fades the new face in.
 */
function DreamFace({ character, size }: { character: Character; size: number }) {
  const half = size / 2;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dream]}>
      <Animated.View key={character.id} entering={FadeIn.duration(260)} style={{ width: size, height: size }}>
        <CharacterAvatar character={character} size={size} />
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="dreamMelt" cx="50%" cy="50%" r="50%">
              <Stop offset="0.6" stopColor={night.bg} stopOpacity={0} />
              <Stop offset="1" stopColor={night.bg} stopOpacity={0.9} />
            </RadialGradient>
          </Defs>
          <Circle cx={half} cy={half} r={half} fill="url(#dreamMelt)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** The iOS Timer ring: it empties as the time runs out, the rocking moon inside. */
function TimerRing({ size, share, children }: { size: number; share: number; children: React.ReactNode }) {
  const r = (size - STROKE) / 2;
  const length = 2 * Math.PI * r;
  const kept = Math.max(0, Math.min(1, share));
  return (
    <View style={[styles.ring, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={night.surfaceAlt} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={night.primary}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${length} ${length}`}
          strokeDashoffset={length * (1 - kept)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { gap: space.lg, paddingBottom: space.xl },
  title: { marginHorizontal: space.lg, ...inkFace('display'), color: night.text },
  proPill: { height: 30, justifyContent: 'center', marginRight: space.sm, paddingHorizontal: 12, borderRadius: inkRadius.pill, backgroundColor: night.primarySofter },
  proText: { ...inkFace('subStrong'), color: night.brandText },
  hero: { alignItems: 'center', gap: space.lg, marginTop: space.xs },
  dream: { alignItems: 'center', justifyContent: 'center' },
  heroTitle: { marginHorizontal: space.lg, ...inkFace('title'), color: night.text },
  faces: { flexGrow: 1, justifyContent: 'center', gap: space.md, paddingHorizontal: space.lg },
  timerCard: {
    marginHorizontal: space.lg,
    height: 92,
    paddingHorizontal: 14,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: night.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerValue: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  timerText: { ...inkFace('numeralSmall'), color: night.text },
  wakeCard: {
    marginHorizontal: space.lg,
    minHeight: 78,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: night.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  // An empty slot waiting to be filled: a dashed outline (systemGround.dash's role on the navy).
  wakeEmpty: { backgroundColor: 'transparent', borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(163,168,200,0.35)' },
  wakeTile: { width: 46, height: 46, borderRadius: 14, borderCurve: 'continuous', backgroundColor: systemColors.green, alignItems: 'center', justifyContent: 'center' },
  wakeTileSoft: { backgroundColor: 'rgba(52,199,89,0.18)' },
  wakeTime: { ...inkFace('figure'), color: night.text },
  wakeLine: { ...inkFace('subStrong'), color: night.textSecondary },
  wakeSet: { ...inkFace('bodyStrong'), color: night.text },
  plus: { width: 36, height: 36, borderRadius: inkRadius.pill, backgroundColor: night.primary, alignItems: 'center', justifyContent: 'center' },
  bar: { paddingHorizontal: space.lg, paddingTop: space.md },
  // While whispering everything fits one screen: the friend, the ring, the time, Stop and Pause.
  whisperPage: { flex: 1, alignItems: 'center', gap: space.xl, paddingTop: space.sm },
  whisperPill: {
    maxWidth: '86%',
    height: 38,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: inkRadius.pill,
    backgroundColor: night.well,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  whisperName: { flexShrink: 1, ...inkFace('subStrong'), color: night.text },
  ring: { alignItems: 'center', justifyContent: 'center' },
  countdown: { ...inkFace('numeralMid'), color: night.text },
  controls: { flexDirection: 'row', gap: 44 },
  control: { width: 76, height: 76, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'center' },
  controlGrey: { backgroundColor: night.well },
  controlWarm: { backgroundColor: night.primary },
  stopGlyph: { width: 22, height: 22, borderRadius: 5, backgroundColor: night.text },
  wakePill: {
    height: 40,
    paddingLeft: 8,
    paddingRight: 16,
    borderRadius: inkRadius.pill,
    backgroundColor: night.well,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  wakePillTime: { ...inkFace('bodyStrong'), color: night.text, fontVariant: ['tabular-nums'] },
  wakePillName: { flexShrink: 1, ...inkFace('subStrong'), color: night.textSecondary },
});
