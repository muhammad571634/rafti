import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { ValueWheel, type WheelTone } from '@/components/alarms/time-wheel';
import { SleepingMascot } from '@/components/bedtime/sleeping-mascot';
import { CallPaywallSheet } from '@/components/plans/call-paywall-sheet';
import { Anim, Button, CharacterAvatar, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { hasPro } from '@/economy/plans';
import { useFriendName } from '@/hooks/use-friend-name';
import { alarmTime, uses12Hour } from '@/lib/alarm-format';
import { nextAlarmAt } from '@/lib/alarms';
import { callClock } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { radius, sleepColors as night, space } from '@/theme';
import type { Character } from '@/types';

/** Sleep timer choices on the wheel, in minutes. */
const TIMERS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const RING = 220;
const STROKE = 8;
const WHEEL_TONE: WheelTone = { text: night.text, near: night.textSecondary, far: night.textFaint, band: 'rgba(255,255,255,0.10)' };

type Page = 'main' | 'who' | 'timer';

/**
 * "Sleep Together" in the iOS Sleep look (owner's pick B, 2026-10-14; prototype
 * https://claude.ai/artifact/RfCUeQ3bdF7PvBiadS9zd3): a large title on the night palette, a
 * header card, grouped rows (Who, Sleep timer, Wake-up → Alarms) and one button. While the
 * friend whispers, an iOS Timer ring empties with Stop and Pause. Whispers are Pro only
 * (backend-plan §15.10) and never use voice-reply minutes; Alarms open for every plan.
 * Colours come from `sleepColors`, Bedtime's own navy in both themes.
 */
export default function BedtimeScreen() {
  const friendName = useFriendName();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Sizes that let the whispering screen fit any phone without scrolling.
  const artFit = Math.round(Math.min(210, Math.max(104, height * 0.17)));
  const ringFit = Math.round(Math.min(RING, Math.max(150, height * 0.24)));

  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const pro = useAppStore((s) => hasPro(s.wallet.subscription, Date.now()));
  const alarms = useAppStore((s) => s.alarms);

  const known = useMemo(
    () => characters.filter((c) => c.voiceReady && conversations.some((v) => v.characterId === c.id)),
    [characters, conversations],
  );

  const [readerId, setReaderId] = useState(known[0]?.id);
  const [minutes, setMinutes] = useState(20);
  const [left, setLeft] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [locked, setLocked] = useState(false);
  const [page, setPage] = useState<Page>('main');

  const reader = known.find((c) => c.id === readerId);
  const running = left != null;
  const name = reader ? friendName(reader, true) : '';

  // The next alarm, shown on the Alarms row and under the ring.
  const nextAlarm = useMemo(() => {
    const now = new Date();
    return alarms
      .filter((a) => a.enabled)
      .map((a) => ({ a, at: nextAlarmAt(a, now) }))
      .sort((x, y) => x.at.getTime() - y.at.getTime())[0]?.a;
  }, [alarms]);
  const nextAlarmText = nextAlarm
    ? (() => {
        const { time, period } = alarmTime(nextAlarm.hour, nextAlarm.minute, uses12Hour());
        return period ? `${time} ${t(`alarms.${period}`)}` : time;
      })()
    : null;

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

  const start = () => {
    if (!reader) return;
    if (!pro) return setLocked(true);
    setPaused(false);
    setLeft(minutes * 60);
  };

  const stop = () => {
    setLeft(null);
    setPaused(false);
  };

  return (
    <Screen background={night.bg} statusBarStyle="light">
      <Header
        tint={night.text}
        onBack={page === 'main' ? undefined : () => setPage('main')}
        right={
          !pro && page === 'main' ? (
            <View style={styles.proPill}>
              <Txt variant="smallStrong" color={night.brandText}>
                {t('plans.name.pro')}
              </Txt>
            </View>
          ) : null
        }
      />
      <Txt variant="h1" color={night.text} style={styles.title} accessibilityRole="header">
        {page === 'who' ? t('bedtime.who') : page === 'timer' ? t('bedtime.setTimer') : t('bedtime.title')}
      </Txt>

      {/* While whispering, everything fits one screen: the card, the ring, Stop and Pause at the bottom. */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEnabled={!(page === 'main' && running)}
        contentContainerStyle={[styles.scroll, page === 'main' && running && styles.fit]}>
        {page === 'main' ? (
          <>
            <LinearGradient colors={['#232A5C', night.surface]} style={[styles.hero, running && styles.heroFit]}>
              <SleepingMascot size={running ? artFit : 210} whispering={running && !paused} />
              <View style={styles.heroText}>
                {reader ? (
                  <>
                    <Txt style={styles.heroTitle} center>
                      {t('bedtime.sleepWith', { name })}
                    </Txt>
                    <Txt style={styles.heroLine} center>
                      {t('bedtime.what')}
                    </Txt>
                  </>
                ) : (
                  <Txt style={styles.heroLine} center>
                    {t('bedtime.noVoices')}
                  </Txt>
                )}
              </View>
            </LinearGradient>

            {running ? (
              <TimerRing
                left={left ?? 0}
                total={minutes * 60}
                alarm={nextAlarmText}
                reader={reader}
                name={name}
                paused={paused}
                onStop={stop}
                onPause={() => setPaused((p) => !p)}
                size={ringFit}
              />
            ) : (
              <>
                {known.length > 0 ? (
                  <View style={styles.group}>
                    <Row
                      lead={reader ? <CharacterAvatar character={reader} size={28} /> : null}
                      label={t('bedtime.who')}
                      value={reader ? friendName(reader) : ''}
                      onPress={() => setPage('who')}
                    />
                    <Row
                      lead={<Tile icon="timer-outline" color={night.primary} />}
                      label={t('bedtime.setTimer')}
                      value={t('radio.minutes', { count: minutes })}
                      onPress={() => setPage('timer')}
                      last
                    />
                  </View>
                ) : null}

                <Txt variant="caption" color={night.textSecondary} style={styles.groupTitle}>
                  {t('bedtime.wakeUp').toUpperCase()}
                </Txt>
                <View style={styles.group}>
                  <Row
                    lead={<Tile icon="alarm-outline" color={night.success} />}
                    label={t('alarms.entry')}
                    value={nextAlarmText ?? ''}
                    onPress={() => router.push('/alarms')}
                    last
                  />
                </View>
              </>
            )}
          </>
        ) : null}

        {page === 'who' ? (
          <View style={styles.group}>
            {known.map((c, i) => (
              <Pressable
                key={c.id}
                style={[styles.row, i === known.length - 1 && styles.last]}
                onPress={() => {
                  setReaderId(c.id);
                  setPage('main');
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: c.id === readerId }}>
                <CharacterAvatar character={c} size={28} />
                <Txt variant="body" color={night.text} style={styles.flex}>
                  {friendName(c)}
                </Txt>
                {c.id === readerId ? <Ionicons name="checkmark" size={20} color={night.brandText} /> : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {page === 'timer' ? (
          <View style={styles.wheelBox}>
            <ValueWheel
              label={t('bedtime.setTimer')}
              values={TIMERS.map((m) => t('radio.minutes', { count: m }))}
              index={Math.max(0, TIMERS.indexOf(minutes))}
              onChange={(i) => setMinutes(TIMERS[i])}
              tone={WHEEL_TONE}
            />
          </View>
        ) : null}
      </ScrollView>

      {page === 'main' && !running ? (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          <Button
            label={t('bedtime.start')}
            size="lg"
            onPress={start}
            disabled={!reader}
            full
            left={pro ? undefined : <Ionicons name="lock-closed" size={17} color={night.textOnPrimary} />}
          />
          <Txt variant="caption" color={night.textSecondary} center>
            {pro ? t('bedtime.stopsAfter', { count: minutes }) : t('bedtime.withPro')}
          </Txt>
        </View>
      ) : null}

      {page === 'main' && running ? (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          <Txt variant="caption" color={night.textSecondary} center>
            {t('bedtime.fades')}
          </Txt>
        </View>
      ) : null}

      {reader ? (
        <CallPaywallSheet
          visible={locked}
          character={reader}
          name={reader.name}
          kind="bedtime"
          onClose={() => setLocked(false)}
          onStarted={() => {
            setLocked(false);
            setPaused(false);
            setLeft(minutes * 60);
          }}
        />
      ) : null}
    </Screen>
  );
}

/** The iOS Timer face: a ring that empties, the countdown, the next alarm, Stop and Pause. */
function TimerRing({
  left,
  total,
  alarm,
  reader,
  name,
  paused,
  onStop,
  onPause,
  size,
}: {
  left: number;
  total: number;
  alarm: string | null;
  reader?: Character;
  name: string;
  paused: boolean;
  onStop: () => void;
  onPause: () => void;
  size: number;
}) {
  const { t } = useTranslation();
  const r = (size - STROKE) / 2;
  const length = 2 * Math.PI * r;
  const share = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;

  return (
    <View style={styles.timer}>
      <View style={[styles.ring, { width: size, height: size }]}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={night.border} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={night.brandText}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${length} ${length}`}
            strokeDashoffset={length * (1 - share)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Txt color={night.text} style={[styles.clock, size < 200 && styles.clockSmall]}>
          {callClock(left)}
        </Txt>
        {alarm ? (
          <Txt variant="small" color={night.textSecondary} style={styles.ringAlarm}>
            {`⏰ ${alarm}`}
          </Txt>
        ) : null}
      </View>

      <View style={styles.whisper}>
        {reader ? <CharacterAvatar character={reader} size={24} /> : null}
        <Txt variant="small" color={night.text}>
          {t('bedtime.whispering', { name })}
        </Txt>
        {paused ? null : <Anim name="voiceWave" size={24} tint={night.textSecondary} />}
      </View>

      <View style={styles.circles}>
        <PressableScale
          onPress={onStop}
          scaleTo={0.94}
          style={[styles.circle, styles.circleGrey]}
          accessibilityRole="button"
          accessibilityLabel={t('bedtime.stop')}>
          <Txt variant="bodyStrong" color={night.text}>
            {t('bedtime.stop')}
          </Txt>
        </PressableScale>
        <PressableScale
          onPress={onPause}
          scaleTo={0.94}
          style={[styles.circle, styles.circleWarm]}
          accessibilityRole="button"
          accessibilityLabel={paused ? t('bedtime.resume') : t('bedtime.pause')}>
          <Txt variant="bodyStrong" color={night.brandText}>
            {paused ? t('bedtime.resume') : t('bedtime.pause')}
          </Txt>
        </PressableScale>
      </View>
    </View>
  );
}

function Tile({ icon, color }: { icon: React.ComponentProps<typeof Ionicons>['name']; color: string }) {
  return (
    <View style={[styles.tile, { backgroundColor: color }]}>
      <Ionicons name={icon} size={17} color={night.white} />
    </View>
  );
}

function Row({
  lead,
  label,
  value,
  onPress,
  last,
}: {
  lead?: React.ReactNode;
  label: string;
  value: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={[styles.row, last && styles.last]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}>
      {lead}
      <Txt variant="body" color={night.text} style={styles.flex}>
        {label}
      </Txt>
      {value ? (
        <Txt variant="body" color={night.textSecondary} lines={1}>
          {value}
        </Txt>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={night.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { paddingHorizontal: space.lg, paddingBottom: space.md },
  scroll: { gap: space.lg, paddingBottom: space.xl },
  fit: { flexGrow: 1, paddingBottom: space.sm },
  heroFit: { paddingTop: 18, paddingBottom: 16 },
  proPill: {
    height: 28,
    justifyContent: 'center',
    marginRight: space.sm,
    paddingHorizontal: space.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: night.primarySoft,
    backgroundColor: night.primarySofter,
  },
  // One large card with the sleeping mascot (canvas "BedtimeMascot", owner-approved 2026-10-22).
  hero: {
    alignItems: 'center',
    marginHorizontal: space.lg,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderRadius: 28,
  },
  heroText: { marginTop: 22, alignItems: 'center', gap: 4 },
  heroTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 0.2, color: night.text },
  heroLine: { fontSize: 15, lineHeight: 20, color: night.textSecondary },
  group: { marginHorizontal: space.lg, borderRadius: 11, overflow: 'hidden', backgroundColor: night.surface },
  groupTitle: { marginHorizontal: space.lg * 2, marginBottom: -space.sm, letterSpacing: 0.4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 48,
    paddingHorizontal: space.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: night.border,
  },
  last: { borderBottomWidth: 0 },
  tile: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  wheelBox: { marginHorizontal: space.lg, paddingVertical: space.md, borderRadius: 11, backgroundColor: night.surface },
  timer: { flex: 1, alignItems: 'center', gap: space.lg, paddingTop: space.sm },
  ring: { alignItems: 'center', justifyContent: 'center' },
  clock: { fontSize: 52, lineHeight: 60, fontWeight: '200', fontVariant: ['tabular-nums'] },
  clockSmall: { fontSize: 42, lineHeight: 50 },
  ringAlarm: { position: 'absolute', bottom: 56 },
  whisper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  // Stop and Pause sit at the bottom of the screen, as on the iOS Timer.
  circles: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: space.xxl },
  circle: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  circleGrey: { backgroundColor: night.border },
  circleWarm: { backgroundColor: night.primarySoft },
  bar: { gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md },
});
