import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { InkText } from '@/components/ink';
import { PressableScale, ShellIcon, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { skiaReady } from '@/lib/skia-ready';
import { ink, inkFace } from '@/theme/ink';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Skia = skiaReady ? (require('@shopify/react-native-skia') as typeof import('@shopify/react-native-skia')) : null;

const STAGE_H = 152;
const CARD_R = 20;
const BRUSH_W = 44;
const GRID_COLS = 8;
const GRID_ROWS = 4;
const REVEAL_CELLS = 10; // ~31% of 32 cells scratched triggers smooth full reveal
const MIN_STEP_SQ = 36; // 6 pt minimum spacing between points to keep Skia path ultra-light

function countdownToMidnight(): string {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const secs = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Warm Satin Foil Scratch Card (approved Variant 1, 2026-11-21): replaces the casino roulette wheel
 * with a calm, tactile Apple-minimalist daily gift card. Since 0z339 (audit #5) the foil is neutral
 * crystal glass with a peach rim and peach prize, as the Store widget: the warm satin read brown.
 *
 * - Real finger scratching via Skia `<Group layer>` + `blendMode="clear"` (60 fps on Galaxy A51).
 * - Server draws the reward (`onDraw` -> `POST /v1/wallet/spin`) on the very first touch or quick open.
 * - Parent `ScrollView` can lock scrolling while the finger is actively wiping (`onScratchingChange`).
 * - After reveal (or when returning later the same day), shows today's won shells and a live midnight countdown.
 */
export function ScratchGiftCard({
  disabled,
  todayReward,
  autoReveal,
  onDraw,
  onRevealed,
  onScratchingChange,
}: {
  /** True when today's daily surprise has already been collected. */
  disabled?: boolean;
  /** Today's already-collected reward from the ledger, if known. */
  todayReward?: number | null;
  /** Auto-open once after mounting (e.g. navigated from Today's gift widget). */
  autoReveal?: boolean;
  /** Calls the server (`spinWheel`) once and returns the awarded shell count, or null if unavailable. */
  onDraw: () => Promise<number | null>;
  /** Fires once the foil clears so `GiftsScreen` launches the `CoinDropReward` pour. */
  onRevealed: (reward: number) => void;
  /** Lets the parent `ScrollView` pause scrolling while the user is actively wiping the foil. */
  onScratchingChange?: (scratching: boolean) => void;
}) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  const [size, setSize] = useState({ w: 0, h: STAGE_H });
  const [pathD, setPathD] = useState('');
  const [started, setStarted] = useState(false);
  const [drawnReward, setDrawnReward] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(!!disabled);
  const [busy, setBusy] = useState(false);
  const [timer, setTimer] = useState(countdownToMidnight);

  // Sync revealed state if parent transitions to disabled externally (e.g. server wallet refresh).
  useEffect(() => {
    if (disabled && !busy && !started) setRevealed(true);
  }, [disabled, busy, started]);

  // Live midnight countdown while in the collected state.
  useEffect(() => {
    if (!revealed) return;
    setTimer(countdownToMidnight());
    const id = setInterval(() => setTimer(countdownToMidnight()), 1000);
    return () => clearInterval(id);
  }, [revealed]);

  // Subtle satin light sheen drifting across untouched foil.
  const sheen = useSharedValue(0);
  useEffect(() => {
    if (revealed || started || reducedMotion) {
      sheen.value = 0;
      return;
    }
    sheen.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2200 }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
    );
  }, [revealed, started, reducedMotion, sheen]);

  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -140 + sheen.value * (Math.max(280, size.w) + 260) }, { skewX: '-22deg' }],
    opacity: started || revealed ? 0 : 1,
  }));

  const foilOpacity = useSharedValue(1);
  const foilFadeStyle = useAnimatedStyle(() => ({ opacity: foilOpacity.value }));

  // Mutable gesture/draw refs so rapid pan events never duplicate server calls or trigger stale closures.
  const drawPromiseRef = useRef<Promise<number | null> | null>(null);
  const rewardRef = useRef<number | null>(null);
  const finishingRef = useRef(false);
  const pathRef = useRef('');
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const cellsRef = useRef<Set<number>>(new Set());
  const tickCountRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      onScratchingChange?.(false);
    };
  }, [onScratchingChange]);

  const ensureDraw = useCallback(() => {
    if (drawPromiseRef.current) return drawPromiseRef.current;
    setBusy(true);
    const p = onDraw()
      .then((amt) => {
        if (!mountedRef.current) return null;
        if (amt != null) {
          rewardRef.current = amt;
          setDrawnReward(amt);
        }
        return amt;
      })
      .catch(() => null);
    drawPromiseRef.current = p;
    return p;
  }, [onDraw]);

  const completeReveal = useCallback(async () => {
    if (finishingRef.current || revealed) return;
    finishingRef.current = true;
    onScratchingChange?.(false);
    const amt = rewardRef.current ?? (await ensureDraw());
    if (!mountedRef.current) return;
    if (amt == null) {
      // Server refused or network hiccup: cleanly restore the untouched foil so user can retry.
      drawPromiseRef.current = null;
      finishingRef.current = false;
      pathRef.current = '';
      cellsRef.current.clear();
      setPathD('');
      setStarted(false);
      setBusy(false);
      foilOpacity.value = 1;
      return;
    }
    haptic.success();
    foilOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
    setTimeout(() => {
      if (!mountedRef.current) return;
      setBusy(false);
      setRevealed(true);
      onRevealed(amt);
    }, 310);
  }, [ensureDraw, foilOpacity, onRevealed, onScratchingChange, revealed]);

  // Support `?spin=1` auto-reveal from Today's widget.
  const autoRan = useRef(false);
  useEffect(() => {
    if (!autoReveal || disabled || revealed || autoRan.current) return;
    autoRan.current = true;
    const id = setTimeout(() => {
      setStarted(true);
      void completeReveal();
    }, 520);
    return () => clearTimeout(id);
  }, [autoReveal, disabled, revealed, completeReveal]);

  const markPoint = useCallback(
    (x: number, y: number, isStart: boolean) => {
      if (revealed || finishingRef.current || size.w <= 0) return;
      const cx = Math.max(0, Math.min(size.w, x));
      const cy = Math.max(0, Math.min(size.h, y));

      if (!isStart && lastPtRef.current) {
        const dx = cx - lastPtRef.current.x;
        const dy = cy - lastPtRef.current.y;
        if (dx * dx + dy * dy < MIN_STEP_SQ) return;
      }
      lastPtRef.current = { x: cx, y: cy };

      const rx = Math.round(cx);
      const ry = Math.round(cy);
      if (isStart) {
        setStarted(true);
        if (!Skia) {
          void completeReveal();
          return;
        }
        pathRef.current += `${pathRef.current ? ' ' : ''}M ${rx} ${ry} L ${rx + 1} ${ry + 1}`;
        void ensureDraw();
      } else {
        if (!Skia) return;
        pathRef.current += ` L ${rx} ${ry}`;
      }
      setPathD(pathRef.current);

      // Track coverage on an 8x4 grid so ~31% scratched triggers smooth reveal.
      const col = Math.min(GRID_COLS - 1, Math.floor((cx / size.w) * GRID_COLS));
      const row = Math.min(GRID_ROWS - 1, Math.floor((cy / size.h) * GRID_ROWS));
      const before = cellsRef.current.size;
      cellsRef.current.add(row * GRID_COLS + col);
      if (cellsRef.current.size > before) {
        tickCountRef.current += 1;
        if (tickCountRef.current % 2 === 1) haptic.selection();
      }
      if (cellsRef.current.size >= REVEAL_CELLS) {
        void completeReveal();
      }
    },
    [completeReveal, ensureDraw, revealed, size.h, size.w],
  );

  const canScratch = !revealed && (!disabled || started);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(canScratch)
        .minDistance(0)
        .shouldCancelWhenOutside(false)
        .runOnJS(true)
        .onTouchesDown(() => {
          if (canScratch) onScratchingChange?.(true);
        })
        .onBegin((e) => {
          markPoint(e.x, e.y, true);
        })
        .onUpdate((e) => {
          markPoint(e.x, e.y, false);
        })
        .onFinalize(() => {
          lastPtRef.current = null;
          onScratchingChange?.(false);
        }),
    [canScratch, markPoint, onScratchingChange],
  );

  // Diagonal subtle satin texture lines for Skia foil.
  const satinLinesPath = useMemo(() => {
    if (size.w <= 0) return '';
    let d = '';
    for (let x = -size.h; x < size.w + size.h; x += 20) {
      d += `M ${x} 0 L ${x + size.h} ${size.h} `;
    }
    return d;
  }, [size.w, size.h]);

  const shownAmount = drawnReward ?? todayReward ?? null;

  if (revealed) {
    return (
      <View style={styles.doneCard}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.07)', 'rgba(22,22,30,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.85 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.doneBadge}>
          <Ionicons name="checkmark" size={20} color={ink.accent} />
        </View>
        {shownAmount != null ? (
          <View style={styles.doneAmountRow}>
            <Txt style={[styles.doneAmount, styles.tabular]} maxFontSizeMultiplier={1.2}>
              {`+${shownAmount}`}
            </Txt>
            <ShellIcon size={24} />
          </View>
        ) : (
          <ShellIcon size={30} />
        )}
        <InkText variant="footnote" color={ink.text2} style={styles.doneSub}>
          {t('gifts.spinsNone')}
        </InkText>
        <View style={styles.timerPill}>
          <Txt style={[styles.timerText, styles.tabular]} lines={1} maxFontSizeMultiplier={1.2}>
            {t('gifts.scratchNext', { time: timer })}
          </Txt>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={pan}>
        <View
          collapsable={false}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (Math.abs(width - size.w) > 1 || Math.abs(height - size.h) > 1) {
              setSize({ w: Math.round(width), h: Math.round(height) });
            }
          }}
          style={styles.stage}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('gifts.scratchPrompt')}
          accessibilityHint={t('gifts.scratchHint')}>
          {/* Underneath: Hidden Prize Layer */}
          <LinearGradient
            colors={['rgba(255,255,255,0.10)', '#121219']}
            start={{ x: 0.5, y: 0.1 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={styles.prizeLayer}>
            {drawnReward != null ? (
              <View style={styles.prizeRow}>
                <Txt style={[styles.prizeNum, styles.tabular]} maxFontSizeMultiplier={1.2}>
                  {`+${drawnReward}`}
                </Txt>
                <ShellIcon size={26} />
              </View>
            ) : (
              <ShellIcon size={30} />
            )}
          </View>

          {/* Top: Skia Satin Foil Layer punched through in real time by the finger */}
          {size.w > 0 && Skia ? (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, foilFadeStyle]}>
              <Skia.Canvas style={StyleSheet.absoluteFill}>
                <Skia.Group layer>
                  <Skia.RoundedRect x={0} y={0} width={size.w} height={size.h} r={CARD_R}>
                    <Skia.LinearGradient
                      start={Skia.vec(0, 0)}
                      end={Skia.vec(size.w, size.h)}
                      colors={['#2E2E38', '#22222B', '#2C2C36']}
                    />
                  </Skia.RoundedRect>
                  {satinLinesPath ? (
                    <Skia.Path path={satinLinesPath} style="stroke" strokeWidth={1} color="rgba(255,255,255,0.06)" />
                  ) : null}
                  {pathD ? (
                    <Skia.Path
                      path={pathD}
                      style="stroke"
                      strokeWidth={BRUSH_W}
                      strokeCap="round"
                      strokeJoin="round"
                      color="#000000"
                      blendMode="clear"
                    />
                  ) : null}
                </Skia.Group>
              </Skia.Canvas>
            </Animated.View>
          ) : (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.webFoil, foilFadeStyle]} />
          )}

          {/* Soft animated light sheen + centered editorial prompt (fades out the instant user touches) */}
          <Animated.View pointerEvents="none" style={[styles.sheenBar, sheenStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {!started ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.foilPrompt]}>
              <InkText variant="cardSmall" color={ink.accent} center>
                {t('gifts.scratchPrompt')}
              </InkText>
            </View>
          ) : null}
        </View>
      </GestureDetector>

      <View style={styles.footRow}>
        <Txt style={styles.hintText} lines={1} maxFontSizeMultiplier={1.2}>
          {t('gifts.scratchHint')}
        </Txt>
        <PressableScale
          scaleTo={0.94}
          hitSlop={8}
          disabled={busy || revealed}
          accessibilityRole="button"
          accessibilityLabel={t('gifts.scratchQuick')}
          onPress={() => {
            setStarted(true);
            void completeReveal();
          }}>
          <Txt style={styles.quickBtnText} lines={1} maxFontSizeMultiplier={1.2}>
            {t('gifts.scratchQuick')}
          </Txt>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
  wrap: { width: '100%', padding: 14 },
  stage: {
    width: '100%',
    height: STAGE_H,
    borderRadius: CARD_R,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(235,173,132,0.26)',
    backgroundColor: '#121219',
  },
  prizeLayer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  prizeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prizeNum: { ...inkFace('numeralSmall'), fontSize: 40, lineHeight: 46, color: ink.accent },
  webFoil: { backgroundColor: '#26262F', borderRadius: CARD_R },
  sheenBar: { position: 'absolute', top: 0, bottom: 0, width: 120 },
  foilPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 4,
    marginTop: 10,
  },
  hintText: { ...inkFace('caption'), fontWeight: '500', color: ink.text2, flex: 1 },
  quickBtnText: { ...inkFace('footnoteStrong'), color: ink.accent },

  doneCard: {
    width: '100%',
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  doneBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(235,173,132,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  doneAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  doneAmount: { ...inkFace('numeralSmall'), fontSize: 34, lineHeight: 40, color: ink.accent },
  doneSub: { marginTop: 4 },
  timerPill: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  timerText: { ...inkFace('caption'), color: ink.text2 },
});
