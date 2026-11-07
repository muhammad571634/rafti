import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type GestureResponderEvent, Modal, Pressable, StyleSheet, View, type ViewInstance } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LiveMascot, MiniMascot } from '@/components/mascot/live-mascot';
import { PressableScale, ShellIcon, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { DAILY_CHECK_IN, isSurpriseDay } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, fonts, isDark, radius } from '@/theme';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

/** The moment's own ground: warm yellow, a shade deeper at night. Text on it is always ink. */
const YELLOW = isDark ? '#E9B820' : '#FFD43B';
const INK = '#1F1A17';
const INK_SOFT = 'rgba(31,26,23,0.62)';
const GLASS = 'rgba(255,255,255,0.62)';
const CHIP = isDark ? 'rgba(255,255,255,0.08)' : '#F4EFE8';
const CHIP_TODAY = isDark ? 'rgba(255,212,59,0.16)' : '#FFF6D6';
const CHIP_DONE = isDark ? 'rgba(48,209,88,0.20)' : '#E3F7EF';
const DONE_EDGE = '#1E9E78';

const MASCOT = 236;
/** The mascot art is 5:6 of its width; its paws rest this far down over the card's top edge. */
const MASCOT_H = (MASCOT * 200) / 240;
const PAW_OVERLAP = 24;
/** Shells that fly per collect, how far apart they leave, and each one's flight. */
const FLOCK = 5;
const STAGGER = 75;
const FLIGHT = 600;
const ARC = 70;
/** After the last shell lands, the screen stays this long so the laugh and the check are seen. */
const SETTLE = 1300;
const EXIT = 220;
/** Each day rises over RISE ms, the next one RISE_GAP ms after it. */
const RISE = 320;
const RISE_GAP = 45;
const RISE_TOTAL = RISE + RISE_GAP * (DAILY_CHECK_IN.length - 1);

type Point = { x: number; y: number };

/**
 * The day's check-in shells, a full-screen moment on Today only (never over a chat or another tab).
 * Design approved by the owner on the prototype (2026-11-07, 0z122, design-style §10): the whole
 * screen warm yellow, the day and the prize in big rounded type, our living mascot (drawn in code)
 * peeking over a white card that holds the week. Its eyes follow the finger; Collect flies five
 * shells from today's day into the wallet pill, which swells per landing while its number counts
 * up; on the last, a kalimba note, a success haptic, the mascot laughs and hops, today turns mint
 * with a smiling face; then the screen fades away. The shells are credited when the app opens
 * (closing loses nothing); until they land the wallet shows the balance from before. Free users
 * only (`onPaidPlan`, 0z121). Reduced motion: no flight, no hop; the number and faces change in place.
 */
export function DailyRewardSheet() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const reward = useAppStore((s) => s.dailyReward);
  const dismiss = useAppStore((s) => s.dismissDailyReward);
  const shells = useAppStore((s) => s.wallet.shells);
  const reduced = useReducedMotion();
  const today = reward?.day ?? 1;
  const amount = reward?.amount ?? 0;

  const [flight, setFlight] = useState<{ from: Point; to: Point } | null>(null);
  const [landed, setLanded] = useState(0);
  const [got, setGot] = useState(false);
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const chime = useRef<AudioPlayer | null>(null);
  const mascotCenter = useRef<Point | null>(null);
  const [cardHeight, setCardHeight] = useState(0);

  const root = useRef<ViewInstance>(null);
  const todayCell = useRef<ViewInstance>(null);
  const shellMark = useRef<ViewInstance>(null);
  const mascotBox = useRef<ViewInstance>(null);

  const shown = useSharedValue(0);
  const appear = useSharedValue(reduced ? 1 : 0);
  const rise = useSharedValue(reduced ? 1 : 0);
  const hop = useSharedValue(0);
  const joy = useSharedValue(0);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const swell = useSharedValue(1);
  const lift = useSharedValue(0);
  const check = useSharedValue(0);

  useEffect(() => {
    if (!reward) return;
    // Loaded with the screen, so the note is ready on the landing; it follows the silent switch.
    const player = createAudioPlayer(require('@/assets/sounds/shells-in.wav'));
    player.volume = 0.7;
    chime.current = player;
    shown.set(withTiming(1, { duration: reduced ? 150 : 220, easing: EASE_OUT }));
    if (!reduced) {
      rise.set(0);
      rise.set(withDelay(90, withSpring(1, { duration: 620, dampingRatio: 0.62 })));
      appear.set(0);
      appear.set(withDelay(160, withTiming(1, { duration: RISE_TOTAL, easing: Easing.linear })));
    }
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      player.remove();
      chime.current = null;
    };
    // The values are stable; a new reward starts the moment again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reward]);

  // Credited already: the wallet counts up from the balance before today's shells, landing by landing.
  const before = Math.max(0, shells - amount);
  const wallet = !reward || got ? shells : before + Math.round((amount * landed) / FLOCK);

  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    busy.current = false;
    setFlight(null);
    setLanded(0);
    setGot(false);
    [joy, lookX, lookY, lift, check, hop].forEach((v) => v.set(0));
    swell.set(1);
  };

  const close = () => {
    shown.set(withTiming(0, { duration: EXIT, easing: EASE_OUT }));
    timers.current.forEach(clearTimeout);
    timers.current = [
      setTimeout(() => {
        reset();
        dismiss();
      }, EXIT),
    ];
  };

  const look = (x: number, y: number, fast = false) => {
    const cfg = fast ? { duration: 160 } : { duration: 420, dampingRatio: 0.8 };
    lookX.set(withSpring(Math.max(-1, Math.min(1, x)), cfg));
    lookY.set(withSpring(Math.max(-1, Math.min(1, y)), cfg));
  };

  // The mascot looks at the finger wherever it touches the screen.
  const follow = (e: GestureResponderEvent) => {
    if (busy.current || reduced) return;
    const c = mascotCenter.current;
    if (!c) return;
    look((e.nativeEvent.pageX - c.x) / 140, (e.nativeEvent.pageY - c.y) / 160, true);
  };

  const finish = () => {
    setGot(true);
    chime.current?.seekTo(0);
    chime.current?.play();
    haptic.success();
    look(0, 0);
    joy.set(withTiming(1, { duration: 180, easing: EASE_OUT }));
    check.set(reduced ? withTiming(1, { duration: 200 }) : withSpring(1, { duration: 420, dampingRatio: 0.5 }));
    if (!reduced) {
      hop.set(withSequence(withTiming(-22, { duration: 190, easing: EASE_OUT }), withSpring(0, { duration: 420, dampingRatio: 0.5 })));
    }
    later(SETTLE, close);
  };

  const collect = () => {
    if (!reward) return close();
    if (busy.current) return;
    busy.current = true;
    haptic.tap();
    lift.set(withTiming(1, { duration: 200, easing: EASE_OUT }));

    if (reduced) {
      setLanded(FLOCK);
      finish();
      return;
    }

    look(-0.9, -1);
    root.current?.measureInWindow((rx, ry) => {
      todayCell.current?.measureInWindow((dx, dy, dw, dh) => {
        shellMark.current?.measureInWindow((sx, sy, sw, sh) => {
          setFlight({ from: { x: dx - rx + dw / 2, y: dy - ry + dh / 2 }, to: { x: sx - rx + sw / 2, y: sy - ry + sh / 2 } });
          for (let i = 0; i < FLOCK; i++) {
            later(i * STAGGER + FLIGHT, () => {
              setLanded(i + 1);
              swell.set(withSequence(withTiming(1.12, { duration: 90, easing: EASE_OUT }), withSpring(1, { duration: 300, dampingRatio: 0.55 })));
              if (i < FLOCK - 1) haptic.selection();
              else finish();
            });
          }
        });
      });
    });
  };

  const screenStyle = useAnimatedStyle(() => ({ opacity: shown.get() }));
  const mascotStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, rise.get() * 1.6),
    transform: [{ translateY: 40 * (1 - rise.get()) + hop.get() }, { scale: 0.94 + 0.06 * rise.get() }],
  }));
  const walletStyle = useAnimatedStyle(() => ({ transform: [{ scale: swell.get() }] }));
  const amountStyle = useAnimatedStyle(() => ({
    opacity: 1 - lift.get(),
    transform: [{ translateY: -8 * lift.get() }, { scale: 1 - 0.1 * lift.get() }],
  }));
  const faceStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, check.get() * 2),
    transform: [{ scale: 0.6 + 0.4 * check.get() }],
  }));

  const longDate = new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' });
  const date = longDate.charAt(0).toLocaleUpperCase(i18n.language) + longDate.slice(1);
  const done = today - 1 + (got ? 1 : 0);

  return (
    <Modal visible={!!reward} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View
        ref={root}
        style={[styles.fill, screenStyle]}
        onStartShouldSetResponder={() => true}
        onResponderGrant={follow}
        onResponderMove={follow}
        onResponderRelease={() => {
          if (!busy.current) look(0, 0);
        }}>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Animated.View style={[styles.wallet, walletStyle]} accessible accessibilityLabel={t('plans.shells', { count: wallet })}>
            <View ref={shellMark}>
              <ShellIcon size={20} />
            </View>
            <Txt style={styles.walletText}>{wallet.toLocaleString('en-US')}</Txt>
          </Animated.View>
          <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={close} hitSlop={8}>
            <View style={styles.round}>
              <Ionicons name="close" size={22} color={INK} />
            </View>
          </PressableScale>
        </View>

        <View style={styles.heading}>
          <Txt style={styles.date}>{date}</Txt>
          <Txt style={styles.day} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
            {t('dailyReward.dayShort', { day: today })}
          </Txt>
          <View style={styles.prize}>
            <Txt style={styles.prizeText} maxFontSizeMultiplier={1.3}>
              +{amount}
            </Txt>
            <ShellIcon size={30} />
          </View>
        </View>

        <View style={styles.flex} />

        <View style={[styles.stage, { paddingBottom: Math.max(insets.bottom, 12) + 10 }]}>
          {/* Room above the card for the mascot, which is drawn after the card so its paws sit on top. */}
          <View style={{ height: MASCOT_H - PAW_OVERLAP }} />
          <View style={styles.card} onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}>
            <View style={styles.cardHead}>
              <Txt style={styles.cardTitle}>{t('dailyReward.title')}</Txt>
              <Txt style={styles.cardCount}>{`${done}/${DAILY_CHECK_IN.length}`}</Txt>
            </View>

            <View style={styles.week} accessibilityRole="list">
              {DAILY_CHECK_IN.map((base, index) => {
                const day = index + 1;
                const past = day < today;
                const now = day === today;
                return (
                  <RiseIn key={day} index={index} appear={appear}>
                    <Txt style={styles.dayNum}>{day}</Txt>
                    <View
                      ref={now ? todayCell : undefined}
                      style={[styles.chip, now && (got ? styles.chipDone : styles.chipToday)]}
                      accessible
                      accessibilityLabel={t('dailyReward.dayShort', { day })}>
                      {past ? (
                        <MiniMascot size={30} />
                      ) : now ? (
                        <>
                          <Animated.View style={amountStyle}>
                            <Txt style={styles.chipAmount}>+{amount}</Txt>
                          </Animated.View>
                          <Animated.View style={[styles.chipFace, faceStyle]}>
                            <MiniMascot size={30} />
                          </Animated.View>
                        </>
                      ) : (
                        <>
                          <View style={styles.ring} />
                          {isSurpriseDay(day) ? <Txt style={styles.surprise}>+{base}</Txt> : null}
                        </>
                      )}
                    </View>
                  </RiseIn>
                );
              })}
            </View>

            <Txt style={styles.rule}>{t('dailyReward.rule')}</Txt>

            <Pressable
              accessibilityRole="button"
              disabled={!!flight || got}
              onPress={collect}
              style={({ pressed }) => [styles.cta, (flight || got) && styles.ctaOff, pressed && styles.ctaPressed]}>
              <Txt style={styles.ctaText}>{t('dailyReward.collectAmount', { count: amount })}</Txt>
              <ShellIcon size={22} />
            </Pressable>
          </View>

          {cardHeight > 0 ? (
            <Animated.View
              ref={mascotBox}
              pointerEvents="none"
              style={[styles.mascot, { bottom: Math.max(insets.bottom, 12) + 10 + cardHeight - PAW_OVERLAP }, mascotStyle]}
              onLayout={() =>
                mascotBox.current?.measureInWindow((x, y, w, h) => {
                  mascotCenter.current = { x: x + w / 2, y: y + h * 0.63 };
                })
              }>
              <LiveMascot size={MASCOT} joy={joy} lookX={lookX} lookY={lookY} />
            </Animated.View>
          ) : null}
        </View>

        {flight ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {Array.from({ length: FLOCK }, (_, i) => (
              <FlyingShell key={i} index={i} from={flight.from} to={flight.to} />
            ))}
          </View>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

/** A day of the week rising into place on the shared entrance clock (a plain style: nothing can stay hidden). */
function RiseIn({ index, appear, children }: { index: number; appear: SharedValue<number>; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => {
    const local = Math.min(1, Math.max(0, (appear.get() * RISE_TOTAL - index * RISE_GAP) / RISE));
    const t = 1 - (1 - local) ** 3;
    return { opacity: t, transform: [{ translateY: 10 * (1 - t) }] };
  });
  return <Animated.View style={[styles.dayCol, style]}>{children}</Animated.View>;
}

const SHELL = 24;

/** One shell's flight: out of today's day with a small fan, over a soft arc, shrinking into the wallet. */
function FlyingShell({ index, from, to }: { index: number; from: Point; to: Point }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(index * STAGGER, withTiming(1, { duration: FLIGHT, easing: EASE_IN_OUT })));
  }, [index, p]);
  // Each shell leaves a little to the side and with its own tilt, so five read as a handful, not a line.
  const fan = (index - (FLOCK - 1) / 2) * 8;
  const tilt = (index % 2 === 0 ? 1 : -1) * (8 + index * 3);
  const style = useAnimatedStyle(() => {
    const t = p.get();
    const x = from.x + fan * (1 - t) + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t - ARC * Math.sin(Math.PI * t);
    const scale = t < 0.35 ? 0.7 + (t / 0.35) * 0.45 : 1.15 - ((t - 0.35) / 0.65) * 0.6;
    const opacity = t <= 0 ? 0 : t < 0.06 ? t / 0.06 : t > 0.95 ? (1 - t) / 0.05 : 1;
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
  fill: { flex: 1, backgroundColor: YELLOW },
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18 },
  wallet: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 10, paddingRight: 14, borderRadius: 18, backgroundColor: GLASS },
  walletText: { fontSize: 16, fontWeight: '700', color: INK, fontVariant: ['tabular-nums'] },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' },
  heading: { alignItems: 'center', marginTop: 18, paddingHorizontal: 24 },
  date: { fontSize: 14, fontWeight: '600', color: INK_SOFT },
  day: { marginTop: 4, fontFamily: fonts.playful, fontSize: 50, lineHeight: 58, color: INK, letterSpacing: -0.5, textAlign: 'center' },
  prize: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  prizeText: { fontFamily: fonts.playful, fontSize: 30, lineHeight: 36, color: INK },
  stage: { paddingHorizontal: 10, position: 'relative' },
  // The paws rest on the card's top edge.
  mascot: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 2, elevation: 8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 34,
    paddingTop: 26,
    paddingHorizontal: 18,
    paddingBottom: 18,
    shadowColor: '#785000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  cardTitle: { fontFamily: fonts.playfulBold, fontSize: 17, color: colors.text },
  cardCount: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  week: { flexDirection: 'row', gap: 6 },
  dayCol: { flex: 1, alignItems: 'center', gap: 6 },
  dayNum: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  chip: { width: '100%', aspectRatio: 1 / 1.15, borderRadius: radius.md, backgroundColor: CHIP, alignItems: 'center', justifyContent: 'center' },
  chipToday: { backgroundColor: CHIP_TODAY, borderWidth: 2.5, borderColor: isDark ? colors.text : INK },
  chipDone: { backgroundColor: CHIP_DONE, borderWidth: 2.5, borderColor: DONE_EDGE },
  chipAmount: { fontFamily: fonts.playfulBold, fontSize: 14, color: colors.text },
  chipFace: { position: 'absolute' },
  ring: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.border },
  surprise: { position: 'absolute', bottom: 4, fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  rule: { marginTop: 12, marginBottom: 14, fontSize: 12.5, lineHeight: 17, color: colors.textSecondary, textAlign: 'center' },
  cta: { height: 54, borderRadius: 27, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaOff: { opacity: 0.55 },
  ctaPressed: { transform: [{ scale: 0.97 }] },
  ctaText: { fontFamily: fonts.playfulBold, fontSize: 18, color: colors.textOnPrimary },
  flying: { position: 'absolute', left: 0, top: 0, width: SHELL, height: SHELL },
});
