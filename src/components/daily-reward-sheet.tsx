import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type ViewInstance } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PeekingMascot } from '@/components/peeking-mascot';
import { Button, ShellIcon, Sheet, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { DAILY_CHECK_IN, isSurpriseDay } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, palette, radius, space } from '@/theme';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

/** Shells that fly per collect, how far apart they leave, and each one's flight. */
const FLOCK = 5;
const STAGGER = 70;
const FLIGHT = 560;
/** How high the arc lifts over the straight line from today's cell to the wallet. */
const ARC = 52;
/** After the last shell lands, the sheet waits this long so the check and the cheer are seen. */
const SETTLE = 900;

type Point = { x: number; y: number };

/**
 * The day's check-in shells, as a bottom sheet on Today only (never over a chat or another tab).
 * Our own motion, iOS manner (2026-11-07, 0z121; replaces the Coin Drop port): the week's days
 * rise in one after another; Collect lifts today's "+N" out of its cell as five shells that fly on
 * a soft arc into the wallet pill, which swells a little at each landing while its number counts
 * up; on the last one a kalimba note, a success haptic, today's cell turns mint with a springing
 * check, the mascot hops, and the sheet closes. The shells are credited when the app opens; until
 * they land the wallet shows the balance from before. Reduced motion: no flight, the number and
 * the check change in place. Pure Reanimated: works on every build, no Skia.
 */
export function DailyRewardSheet() {
  const { t } = useTranslation();
  const reward = useAppStore((s) => s.dailyReward);
  const dismiss = useAppStore((s) => s.dismissDailyReward);
  const shells = useAppStore((s) => s.wallet.shells);
  const reduced = useReducedMotion();
  const today = reward?.day ?? 1;
  const amount = reward?.amount ?? 0;

  const [flight, setFlight] = useState<{ from: Point; to: Point } | null>(null);
  const [landed, setLanded] = useState(0);
  const [cheer, setCheer] = useState(0);
  const collecting = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const chime = useRef<AudioPlayer | null>(null);

  const root = useRef<ViewInstance>(null);
  const todayCell = useRef<ViewInstance>(null);
  const shellMark = useRef<ViewInstance>(null);

  const swell = useSharedValue(1);
  const lift = useSharedValue(0);
  const check = useSharedValue(0);
  const mint = useSharedValue(0);

  useEffect(() => {
    if (!reward) return;
    // Loaded with the sheet, so the note is ready on the landing; it follows the silent switch.
    const player = createAudioPlayer(require('@/assets/sounds/shells-in.wav'));
    player.volume = 0.7;
    chime.current = player;
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      player.remove();
      chime.current = null;
    };
  }, [reward]);

  // Credited already: the wallet counts up from the balance before today's shells, landing by landing.
  const before = Math.max(0, shells - amount);
  const shown = !reward ? shells : before + Math.round((amount * landed) / FLOCK);
  const done = landed >= FLOCK;

  const close = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    collecting.current = false;
    setFlight(null);
    setLanded(0);
    swell.set(1);
    lift.set(0);
    check.set(0);
    mint.set(0);
    dismiss();
  };

  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  const finish = () => {
    chime.current?.seekTo(0);
    chime.current?.play();
    haptic.success();
    setCheer((n) => n + 1);
    check.set(reduced ? withTiming(1, { duration: 200 }) : withSpring(1, { duration: 420, dampingRatio: 0.5 }));
    mint.set(withSequence(withTiming(1, { duration: 180, easing: EASE_OUT }), withDelay(420, withTiming(0.55, { duration: 400 }))));
    later(SETTLE, close);
  };

  const collect = () => {
    if (!reward) return close();
    if (collecting.current) return;
    collecting.current = true;
    haptic.tap();

    if (reduced) {
      setLanded(FLOCK);
      finish();
      return;
    }

    lift.set(withTiming(1, { duration: 200, easing: EASE_OUT }));
    root.current?.measureInWindow((rx, ry) => {
      todayCell.current?.measureInWindow((dx, dy, dw, dh) => {
        shellMark.current?.measureInWindow((sx, sy, sw, sh) => {
          setFlight({ from: { x: dx - rx + dw / 2, y: dy - ry + dh / 2 }, to: { x: sx - rx + sw / 2, y: sy - ry + sh / 2 } });
          for (let i = 0; i < FLOCK; i++) {
            later(i * STAGGER + FLIGHT, () => {
              setLanded(i + 1);
              swell.set(withSequence(withTiming(1.1, { duration: 90, easing: EASE_OUT }), withSpring(1, { duration: 300, dampingRatio: 0.55 })));
              if (i < FLOCK - 1) haptic.selection();
              else finish();
            });
          }
        });
      });
    });
  };

  const walletStyle = useAnimatedStyle(() => ({ transform: [{ scale: swell.get() }] }));
  const amountStyle = useAnimatedStyle(() => ({
    opacity: 1 - lift.get(),
    transform: [{ translateY: -8 * lift.get() }, { scale: 1 - 0.1 * lift.get() }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, check.get() * 2),
    transform: [{ scale: 0.6 + 0.4 * check.get() }],
  }));
  const mintStyle = useAnimatedStyle(() => ({ opacity: mint.get() }));

  return (
    <Sheet visible={!!reward} onClose={close} dismissable={!flight && !done}>
      <PeekingMascot cheer={cheer} />
      <View ref={root}>
        <View style={styles.head}>
          <Txt variant="h3" style={styles.flex}>
            {t('dailyReward.title')}
          </Txt>
          <Animated.View style={[styles.wallet, walletStyle]} accessible accessibilityLabel={t('plans.shells', { count: shown })}>
            <View ref={shellMark}>
              <ShellIcon size={18} />
            </View>
            <Txt style={styles.walletText}>{shown.toLocaleString('en-US')}</Txt>
          </Animated.View>
        </View>

        <View style={styles.week} accessibilityRole="list">
          {DAILY_CHECK_IN.map((base, index) => {
            const day = index + 1;
            const past = day < today;
            const now = day === today;
            const cellAmount = now && reward ? reward.amount : base;
            return (
              <Animated.View
                key={day}
                ref={now ? todayCell : undefined}
                entering={reduced ? undefined : FadeInDown.delay(140 + index * 40).duration(300).easing(EASE_OUT).withInitialValues({ transform: [{ translateY: 10 }] })}
                style={[styles.cell, now && styles.cellNow]}
                accessibilityRole="text">
                {now ? <Animated.View pointerEvents="none" style={[styles.mintFill, mintStyle]} /> : null}
                <Txt variant="tiny" color={colors.textSecondary}>
                  {t('dailyReward.dayShort', { day })}
                </Txt>
                {past ? (
                  <Ionicons name="checkmark" size={16} color={colors.text} />
                ) : now ? (
                  <View style={styles.slot}>
                    <Animated.View style={amountStyle}>
                      <Txt variant="smallStrong">+{cellAmount}</Txt>
                    </Animated.View>
                    <Animated.View style={[styles.slotCheck, checkStyle]}>
                      <Ionicons name="checkmark" size={18} color={colors.bondText} />
                    </Animated.View>
                  </View>
                ) : (
                  <Txt variant="smallStrong">
                    +{cellAmount}
                    {isSurpriseDay(day) ? '+' : ''}
                  </Txt>
                )}
              </Animated.View>
            );
          })}
        </View>

        <Txt variant="body" color={colors.textSecondary} style={styles.copy}>
          {t('dailyReward.rule')}
        </Txt>

        <Button
          label={t('dailyReward.collectAmount', { count: amount })}
          right={<ShellIcon size={24} />}
          size="lg"
          full
          disabled={!!flight || done}
          onPress={collect}
          style={styles.cta}
        />

        {flight ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {Array.from({ length: FLOCK }, (_, i) => (
              <FlyingShell key={i} index={i} from={flight.from} to={flight.to} />
            ))}
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

const SHELL = 22;

/** One shell's flight: out of today's cell with a small fan, over a soft arc, shrinking into the wallet. */
function FlyingShell({ index, from, to }: { index: number; from: Point; to: Point }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(index * STAGGER, withTiming(1, { duration: FLIGHT, easing: EASE_IN_OUT })));
  }, [index, p]);
  // Each shell leaves a little to the side and with its own tilt, so five read as a handful, not a line.
  const fan = (index - (FLOCK - 1) / 2) * 7;
  const tilt = (index % 2 === 0 ? 1 : -1) * (8 + index * 3);
  const style = useAnimatedStyle(() => {
    const t = p.get();
    const x = from.x + fan * (1 - t) + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t - ARC * Math.sin(Math.PI * t);
    const scale = t < 0.35 ? 0.7 + (t / 0.35) * 0.45 : 1.15 - ((t - 0.35) / 0.65) * 0.6;
    const opacity = t <= 0 ? 0 : t < 0.08 ? t / 0.08 : t > 0.94 ? (1 - t) / 0.06 : 1;
    return {
      opacity,
      transform: [{ translateX: x - SHELL / 2 }, { translateY: y - SHELL / 2 }, { rotate: `${tilt * (1 - t)}deg` }, { scale }],
    };
  });
  return (
    <Animated.View style={[styles.flying, style]}>
      <ShellIcon size={SHELL} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  wallet: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  walletText: { fontSize: 15, fontWeight: '600', color: palette.shellText, fontVariant: ['tabular-nums'] },
  week: { flexDirection: 'row', gap: 6, marginTop: space.lg },
  cell: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  cellNow: { backgroundColor: colors.surface, borderColor: colors.text },
  /** Today's cell turns the bond's mint as the check lands. */
  mintFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bondSoft },
  slot: { height: 20, minWidth: 28, alignItems: 'center', justifyContent: 'center' },
  slotCheck: { position: 'absolute' },
  flying: { position: 'absolute', left: 0, top: 0, width: SHELL, height: SHELL },
  copy: { marginTop: space.lg },
  cta: { marginTop: space.lg },
});
