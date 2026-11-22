import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { NightFace, untilText } from '@/components/alarms/night-kit';
import { InkIconButton, InkNavBar, InkText, PillButton } from '@/components/ink';
import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { Anim, CharacterAvatar, DotMatrix, PressableScale, Screen, Txt, useScrolledPast } from '@/components/ui';
import { hasPro } from '@/economy/plans';
import { useFriendName } from '@/hooks/use-friend-name';
import { alarmTime, uses12Hour } from '@/lib/alarm-format';
import { nextAlarmAt } from '@/lib/alarms';
import { callClock } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/use-app-store';
import { bottomRoom, friendAccent, space, systemColors } from '@/theme';
import { ink, inkFace, inkGutter, inkPeachGlass, inkRadius } from '@/theme/ink';
import type { Alarm, Character } from '@/types';

/** Sleep timer steps for -/+, in minutes. */
const TIMERS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const FACE = 52;
const STROKE = 7;
const BED_BG = '#07070B';
const DOCK_BG = 'rgba(7,7,11,0.94)';
const PRO_BG = 'rgba(217,166,245,0.16)';
const PRO_RIM = 'rgba(217,166,245,0.34)';
const PRO_INK = '#D9A6F5';

/**
 * Bedtime (approved Ink Night+ prototype): deep nocturnal obsidian (`#07070B`) with lavender top
 * wash, sticky Apple HIG nav bar, preserved breathing `DotMatrix` LED halo + melting `DreamFace`,
 * friend-accent face strip, hairline-rimmed timer & wake-up cards, and anchored white CTA dock.
 */
export default function BedtimeScreen() {
  const friendName = useFriendName();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { scrolled, onScroll } = useScrolledPast(34);
  const artSize = Math.round(Math.min(220, Math.max(150, height * 0.25)));
  const ringSize = Math.round(Math.min(276, Math.max(196, height * 0.33)));

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
  const readerAccent = reader ? friendAccent(reader.id).strong : ink.accent;
  const wake = useNextWake(alarms, characters);

  useEffect(() => {
    if (left == null || paused) return;
    if (left <= 0) {
      setLeft(null);
      return;
    }
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

  const wakeLine = wake
    ? `${wake.who ? friendName(wake.who, true) : wake.alarm.label || t('home.widget.wakeUp')} · ${untilText(t, wake.at.getTime() - Date.now())}`
    : '';

  return (
    <Screen background={BED_BG} statusBarStyle="light">
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(167,139,250,0.20)', 'rgba(7,7,11,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.ambient}
      />

      <InkNavBar
        backLabel={t('common.back')}
        onBack={() => (running ? stop() : router.back())}
        title={t('bedtime.title')}
        scrolled={!running && scrolled}
        right={
          !pro && !running ? (
            <View style={styles.proPill}>
              <InkText variant="caption" color={PRO_INK}>
                {t('plans.name.pro')}
              </InkText>
            </View>
          ) : undefined
        }
      />

      {running ? (
        <View style={[styles.whisperPage, { paddingBottom: bottomRoom(insets.bottom, space.lg) }]}>
          <View style={styles.whisperPill}>
            {reader ? (
              <View style={[styles.whisperRing, { borderColor: readerAccent }]}>
                <CharacterAvatar character={reader} size={24} />
              </View>
            ) : null}
            <InkText variant="footnoteStrong" color={ink.text} lines={1} style={styles.whisperName}>
              {t('bedtime.whispering', { name })}
            </InkText>
            {paused ? null : <Anim name="voiceWave" size={20} tint={ink.accent} />}
          </View>

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
            <PressableScale
              onPress={stop}
              scaleTo={0.93}
              style={[styles.control, styles.controlGlass]}
              accessibilityRole="button"
              accessibilityLabel={t('bedtime.stop')}>
              <View style={styles.stopGlyph} />
            </PressableScale>
            <PressableScale
              onPress={() => {
                haptic.tap();
                setPaused((p) => !p);
              }}
              scaleTo={0.93}
              style={[styles.control, styles.controlWarm]}
              accessibilityRole="button"
              accessibilityLabel={paused ? t('bedtime.resume') : t('bedtime.pause')}>
              <LinearGradient colors={inkPeachGlass.ctaFill} style={StyleSheet.absoluteFill} pointerEvents="none" />
              <Ionicons name={paused ? 'play' : 'pause'} size={28} color={inkPeachGlass.ctaText} />
            </PressableScale>
          </View>

          <View style={styles.flex} />
          {wake ? (
            <View style={styles.wakePill} accessibilityLabel={`${t('bedtime.wakeUp')}, ${wake.time}, ${wakeLine}`}>
              {wake.who ? (
                <View style={[styles.whisperRing, { borderColor: friendAccent(wake.who.id).strong }]}>
                  <CharacterAvatar character={wake.who} size={24} />
                </View>
              ) : (
                <Ionicons name="alarm" size={16} color={systemColors.green} />
              )}
              <Txt style={styles.wakePillTime}>{wake.time}</Txt>
              {wake.who ? (
                <InkText variant="footnoteStrong" color={ink.text2} lines={1}>
                  {friendName(wake.who, true)}
                </InkText>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : (
        <>
          <ScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 112 }]}>
            <InkText variant="display" accessibilityRole="header" style={styles.title}>
              {t('bedtime.title')}
            </InkText>

            <View style={styles.hero}>
              <View style={{ width: artSize, height: artSize }}>
                <DotMatrix size={artSize} color={NIGHT_DOTS} color2={NIGHT_DOTS_EDGE} cells={17} energy={0.45} />
                {reader ? <DreamFace character={reader} size={Math.round(artSize * FACE_SHARE)} /> : null}
              </View>
              <InkText variant="card" style={styles.heroTitle} lines={2}>
                {reader ? t('bedtime.sleepWith', { name }) : t('bedtime.noVoices')}
              </InkText>
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
                    ringColor={friendAccent(c.id).strong}
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
                <InkIconButton icon="remove" size={20} accessibilityLabel={t('bedtime.setTimer')} onPress={() => nudge(-1)} style={styles.stepBtn} />
                <View style={styles.timerValue}>
                  <Ionicons name="timer-outline" size={20} color={ink.text2} />
                  <Txt style={styles.timerText} lines={1} maxFontSizeMultiplier={1.2}>
                    {t('radio.minutes', { count: minutes })}
                  </Txt>
                </View>
                <InkIconButton icon="add" size={20} accessibilityLabel={t('bedtime.setTimer')} onPress={() => nudge(1)} style={styles.stepBtn} />
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
                  <Ionicons name="alarm" size={21} color="#FFFFFF" />
                </View>
                <View style={styles.flex}>
                  <Txt style={styles.wakeTime}>{wake.time}</Txt>
                  <Txt style={styles.wakeLine} lines={1}>
                    {wakeLine}
                  </Txt>
                </View>
                {wake.who ? (
                  <View style={[styles.wakeAvatarRing, { borderColor: friendAccent(wake.who.id).strong }]}>
                    <CharacterAvatar character={wake.who} size={32} />
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={16} color={ink.text3} />
              </PressableScale>
            ) : (
              <PressableScale
                onPress={() => router.push('/alarms/edit')}
                scaleTo={0.98}
                style={[styles.wakeCard, styles.wakeEmpty]}
                accessibilityRole="button"
                accessibilityLabel={t('home.widget.setWake')}>
                <View style={[styles.wakeTile, styles.wakeTileSoft]}>
                  <Ionicons name="alarm-outline" size={21} color={systemColors.green} />
                </View>
                <Txt style={[styles.flex, styles.wakeSet]} lines={1}>
                  {t('home.widget.setWake')}
                </Txt>
                <View style={styles.plus}>
                  <Ionicons name="add" size={20} color={ink.onAccent} />
                </View>
              </PressableScale>
            )}
          </ScrollView>

          <View style={[styles.dock, { paddingBottom: bottomRoom(insets.bottom, space.md) }]}>
            <PillButton
              label={t('bedtime.start')}
              icon={pro ? 'moon' : 'lock-closed'}
              disabled={!reader}
              onPress={start}
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

const NIGHT_DOTS = '#A78BFA';
const NIGHT_DOTS_EDGE = '#EBAD84';
const FACE_SHARE = 0.5;

function DreamFace({ character, size }: { character: Character; size: number }) {
  const half = size / 2;
  const gradId = `dreamMelt-${character.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dream]}>
      <Animated.View key={character.id} entering={FadeIn.duration(260)} style={{ width: size, height: size }}>
        <CharacterAvatar character={character} size={size} />
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id={gradId} cx="50%" cy="50%" r="50%">
              <Stop offset="0.6" stopColor={BED_BG} stopOpacity={0} />
              <Stop offset="1" stopColor={BED_BG} stopOpacity={0.92} />
            </RadialGradient>
          </Defs>
          <Circle cx={half} cy={half} r={half} fill={`url(#${gradId})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function TimerRing({ size, share, children }: { size: number; share: number; children: React.ReactNode }) {
  const r = (size - STROKE) / 2;
  const length = 2 * Math.PI * r;
  const kept = Math.max(0, Math.min(1, share));
  return (
    <View style={[styles.ring, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={ink.accent}
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
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
  flex: { flex: 1 },
  scroll: { gap: 16 },
  title: { marginHorizontal: inkGutter, marginTop: 2 },
  proPill: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: inkRadius.pill,
    backgroundColor: PRO_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: PRO_RIM,
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', gap: 10 },
  dream: { alignItems: 'center', justifyContent: 'center' },
  heroTitle: { marginHorizontal: inkGutter, textAlign: 'center' },
  faces: { flexGrow: 1, justifyContent: 'center', gap: 14, paddingHorizontal: inkGutter },
  timerCard: {
    marginHorizontal: inkGutter,
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBtn: { width: 44, height: 44, borderRadius: 22 },
  timerValue: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  timerText: { ...inkFace('numeralSmall'), fontSize: 28, lineHeight: 34, color: ink.text },
  wakeCard: {
    marginHorizontal: inkGutter,
    minHeight: 72,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wakeEmpty: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.16)' },
  wakeTile: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderCurve: 'continuous',
    backgroundColor: systemColors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wakeTileSoft: { backgroundColor: 'rgba(48,209,88,0.16)' },
  wakeTime: { ...inkFace('card'), fontVariant: ['tabular-nums'], color: ink.text },
  wakeLine: { ...inkFace('footnote'), color: ink.text2, marginTop: 1, fontVariant: ['tabular-nums'] },
  wakeSet: { ...inkFace('bodyStrong'), color: ink.text },
  wakeAvatarRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  plus: { width: 34, height: 34, borderRadius: 17, backgroundColor: ink.accent, alignItems: 'center', justifyContent: 'center' },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: inkGutter,
    paddingTop: 12,
    backgroundColor: DOCK_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ink.edge,
  },
  whisperPage: { flex: 1, alignItems: 'center', gap: 24, paddingTop: space.xs },
  whisperPill: {
    maxWidth: '86%',
    height: 36,
    paddingLeft: 5,
    paddingRight: 13,
    borderRadius: inkRadius.pill,
    backgroundColor: 'rgba(22,22,30,0.84)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whisperRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  whisperName: { flexShrink: 1 },
  ring: { alignItems: 'center', justifyContent: 'center' },
  countdown: { ...inkFace('numeralMid'), color: ink.text },
  controls: { flexDirection: 'row', gap: 36 },
  control: { width: 68, height: 68, borderRadius: 34, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  controlGlass: {
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  controlWarm: { borderWidth: 1, borderColor: inkPeachGlass.ctaRim },
  stopGlyph: { width: 18, height: 18, borderRadius: 4, backgroundColor: ink.text },
  wakePill: {
    height: 38,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: inkRadius.pill,
    backgroundColor: 'rgba(22,22,30,0.84)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wakePillTime: { ...inkFace('subStrong'), color: ink.text, fontVariant: ['tabular-nums'] },
});
