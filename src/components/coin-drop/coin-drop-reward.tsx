import { Canvas, Fill, Shader, Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, PixelRatio, StyleSheet, View, type ViewInstance } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  ReduceMotion,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { colors, palette } from '@/theme';

import { AUTO_COLLECT, COIN_S, FLICK, FLY_S, HERO_S, meltOf, PULL_FULL, PULL_GO, smooth, TILE } from './cdr-motion';
import { CDR_SKSL } from './cdr-shader';

/*
 Coin Drop Reward, from Native Cook's block of that name, brought into the Gifts screen: the lucky
 wheel's prize poured into the shell wallet by hand.

 The wheel stops and its prize coin pops out of the wheel's centre into a white toast over the
 screen, grown to a glossy apricot 3D coin with a raised scallop shell, and turns once. Pull it
 toward the wallet capsule: as the finger drags, the coin melts into a drop of the same warm liquid,
 its tail trailing back toward the toast, holding wherever the finger stops; let go past a short
 way (or flick, or just tap it) and the drop finishes its change and is poured into the wallet
 along an arc, a small droplet trailing it on a neck that thins and lets go. The wallet wobbles
 like jelly (the parent's capsule, through `wobble`), "+N" slides out beside it, a success haptic.
 Let go too soon and the drop springs back into a coin; a prize left in the toast pours itself
 after 3 s. Reduced motion: the coin appears in the toast without the pop or the turn, and the
 pour is a 0.3 s move.

 Kept from the source: the shader (recoloured), every timing, spring and easing, the gestures,
 haptics and accessibility. Left behind: the demo's missions page, its cooldowns and the autoPlay
 loop with its scripted finger; the fonts are the app's own.
*/

let compiled: SkRuntimeEffect | null = null;
/**
 * The shader, compiled on first use, not at import: the web export renders every route in Node, where
 * CanvasKit is not loaded and Skia throws, which failed the whole all-platform export (0z188).
 */
function coinEffect() {
  try {
    return (compiled ??= Skia.RuntimeEffect.Make(CDR_SKSL));
  } catch {
    return null;
  }
}
const pixelRatio = PixelRatio.get();
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
const EASE_POUR = Easing.bezier(0.55, 0, 0.75, 0.2);
const NEVER = ReduceMotion.Never;
/** How long "+N" takes beside the wallet; the overlay leaves when it is done. */
const PLUS_MS = 900;

export type Point = { x: number; y: number };

export interface CoinDropRewardProps {
  /** Shells won. */
  amount: number;
  /** Where the coin starts, in window points (the wheel's centre). */
  from: Point;
  /** The wallet: its shell icon's centre and its capsule's left edge, in window points. */
  wallet: Point & { left: number };
  /** The capsule's jelly as progress (1 at rest); this sets it going as the drop lands. */
  wobble: SharedValue<number>;
  /** The drop has landed: the parent shows the new balance. */
  onAbsorb: () => void;
  /** Everything has settled: the parent unmounts the overlay. */
  onDone: () => void;
}

export function CoinDropReward({ amount, from, wallet, wobble, onAbsorb, onDone }: CoinDropRewardProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const root = useRef<ViewInstance>(null);
  // The overlay's own top-left in the window, so window points become its points.
  const [origin, setOrigin] = useState<Point | null>(null);
  const [size, setSize] = useState({ w: 402, h: 874 });
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  const L = useMemo(() => {
    const o = origin ?? { x: 0, y: 0 };
    const start = { x: from.x - o.x, y: from.y - o.y };
    const walletIcon = { x: wallet.x - o.x, y: wallet.y - o.y };
    // The toast stands in the middle of the screen, a little above centre (over the wheel).
    const tileCx = size.w / 2;
    const tileCy = Math.round(size.h * 0.46);
    return { start, walletIcon, walletLeft: wallet.left - o.x, tileCx, tileCy, toastCoin: { x: tileCx, y: tileCy - 24 } };
  }, [origin, size, from, wallet]);

  const dir = useMemo(() => {
    const dx = L.walletIcon.x - L.toastCoin.x;
    const dy = L.walletIcon.y - L.toastCoin.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    return { x: dx / d, y: dy / d, d };
  }, [L]);

  /* ------------------------------------------------------------ state */
  const stage = useSharedValue(0); // 0 not yet, 1 popping, 2 waiting in the toast, 3 pulled, 4 pouring, 5 landed
  const out = useSharedValue(0);
  const launch = useSharedValue(0);
  const flip = useSharedValue(0);
  const pull = useSharedValue(0);
  const melt = useSharedValue(0);
  const fly = useSharedValue(0);
  const trail = useSharedValue(0);
  const toast = useSharedValue(0);
  const text = useSharedValue(0);
  const plus = useSharedValue(1);
  const waitStart = useSharedValue(0);
  const clock = useSharedValue(0);
  const p0 = useSharedValue(0);

  const [rewardOut, setRewardOut] = useState(false); // the toast takes touches only while the prize is out
  useAnimatedReaction(
    () => out.get() === 1,
    (now, before) => {
      if (now !== before) scheduleOnRN(setRewardOut, now);
    },
  );

  const landed = useCallback(() => {
    haptic.success();
    onAbsorb();
    setTimeout(onDone, PLUS_MS);
  }, [onAbsorb, onDone]);

  /* ------------------------------------------------------------ the prize (worklets capture what is above them) */
  function absorb() {
    'worklet';
    stage.set(5);
    out.set(0);
    wobble.set(0);
    wobble.set(withTiming(1, { duration: 700, easing: Easing.linear }));
    plus.set(0);
    plus.set(withTiming(1, { duration: PLUS_MS, easing: Easing.linear, reduceMotion: NEVER }));
    scheduleOnRN(landed);
  }

  // the drop finishes its change and is poured into the wallet
  function collect() {
    'worklet';
    if (stage.get() >= 4) return;
    stage.set(4);
    const rest = Math.max(0.25, 1 - fly.get());
    melt.set(withTiming(1, { duration: 300, easing: EASE_OUT, reduceMotion: NEVER }));
    trail.set(withTiming(1, { duration: FLY_S * 900 * rest, easing: EASE_OUT, reduceMotion: NEVER }));
    toast.set(withTiming(0, { duration: 350, easing: EASE_OUT, reduceMotion: NEVER }));
    text.set(withTiming(0, { duration: 250, easing: EASE_OUT, reduceMotion: NEVER }));
    fly.set(
      withTiming(1, { duration: (reduced ? 300 : FLY_S * 1000) * rest, easing: EASE_POUR, reduceMotion: NEVER }, (done) => {
        if (done) absorb();
      }),
    );
  }

  function settleInToast() {
    'worklet';
    stage.set(2);
    waitStart.set(clock.get());
    pull.set(withSpring(0, { duration: 500, dampingRatio: 0.6 }));
    melt.set(withSpring(0, { duration: 500, dampingRatio: 0.8 }));
  }

  // the coin pops out of the wheel into the toast and turns once
  useEffect(() => {
    if (!origin || stage.get() !== 0) return;
    stage.set(1);
    out.set(1);
    if (reduced) {
      launch.set(1);
      flip.set(1);
      toast.set(withTiming(1, { duration: 200, reduceMotion: NEVER }));
      text.set(withTiming(1, { duration: 200, reduceMotion: NEVER }));
      stage.set(2);
      waitStart.set(clock.get());
      return;
    }
    launch.set(withSpring(1, { duration: 600, dampingRatio: 0.62 }));
    toast.set(withTiming(1, { duration: 350, easing: EASE_OUT }));
    text.set(withDelay(300, withTiming(1, { duration: 300, easing: EASE_OUT })));
    flip.set(
      withDelay(
        650,
        withTiming(1, { duration: 800, easing: EASE_IN_OUT }, (done) => {
          if (done && stage.get() === 1) {
            stage.set(2);
            waitStart.set(clock.get());
          }
        }),
      ),
    );
    // Runs once, when the overlay knows where it is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin]);

  // a prize left waiting in the toast pours itself
  useEffect(() => {
    const id = setInterval(() => {
      clock.set(clock.get() + 0.25);
      if (stage.get() === 2 && clock.get() - waitStart.get() > AUTO_COLLECT) collect();
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------ touch */
  // pull the coin toward the wallet; it melts into a drop as it goes
  const coinPan = Gesture.Pan()
    .minDistance(4)
    .onStart(() => {
      if (stage.get() !== 1 && stage.get() !== 2) return;
      stage.set(3);
      flip.set(withTiming(1, { duration: 200 }));
      p0.set(pull.get());
    })
    .onUpdate((e) => {
      if (stage.get() !== 3) return;
      let v = p0.get() + (e.translationX * dir.x + e.translationY * dir.y) / dir.d;
      if (v < 0) v = -0.04 * (1 - Math.exp(v / 0.04));
      if (v > 0.45) v = 0.45 + 0.1 * (1 - Math.exp(-(v - 0.45) / 0.1));
      pull.set(v);
      melt.set(meltOf(v));
    })
    .onFinalize((e) => {
      if (stage.get() !== 3) return;
      const speed = (e.velocityX * dir.x + e.velocityY * dir.y) / dir.d;
      if (pull.get() > PULL_GO || speed > FLICK) collect();
      else settleInToast();
    });
  const coinTap = Gesture.Tap().onEnd(() => {
    if (stage.get() === 1 || stage.get() === 2) collect();
  });
  const coinGesture = Gesture.Exclusive(coinPan, coinTap);

  /* ------------------------------------------------------------ drawing */
  const uniforms = useDerivedValue(() => {
    const P0 = L.start;
    const l = launch.get();
    const lc = Math.max(0, Math.min(1, l));
    const bx = P0.x + (L.toastCoin.x - P0.x) * lc;
    const by = P0.y + (L.toastCoin.y - P0.y) * lc - 30 * Math.sin(Math.PI * lc);
    const k = pull.get();
    const f = fly.get();
    const px = bx + dir.x * dir.d * k;
    const py = by + dir.y * dir.d * k;
    const x = px + (L.walletIcon.x - px) * f;
    const y = py + (L.walletIcon.y - py) * f - 46 * Math.sin(Math.PI * f);
    const s = (COIN_S + (HERO_S - COIN_S) * l) * (1 - 0.82 * f);
    // the tail trails back toward the toast
    const a = Math.atan2(dir.y, -dir.x);
    const stretch = 0.6 * Math.max(0, Math.min(1, k / PULL_FULL)) * (1 - f) + 0.7 * Math.sin(Math.PI * f);
    return {
      uObj: [x, y, s, out.get() * (1 - smooth(0.88, 1, f))],
      uShape: [melt.get(), 2 * Math.PI * flip.get(), Math.PI / 2 - a, stretch],
      uLive: [trail.get() * (1 - smooth(0.85, 1, f)), pixelRatio, 0, 0],
    };
  });

  const veilStyle = useAnimatedStyle(() => ({ opacity: toast.get() }));
  const tileStyle = useAnimatedStyle(() => ({
    opacity: toast.get(),
    transform: [{ scale: 0.86 + 0.14 * toast.get() }],
  }));
  const tileText = useAnimatedStyle(() => ({ opacity: text.get(), transform: [{ translateY: 6 * (1 - text.get()) }] }));
  const plusStyle = useAnimatedStyle(() => ({
    opacity: Math.sin(Math.PI * plus.get()),
    transform: [{ translateX: -10 * plus.get() }],
  }));

  const measure = useCallback(() => {
    root.current?.measureInWindow((x, y, w, h) => {
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
      setOrigin((o) => (o && o.x === x && o.y === y ? o : { x, y }));
    });
  }, []);

  const effect = coinEffect();
  if (!effect) return null;

  return (
    <View ref={root} style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={measure}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.veil, veilStyle]} />
      <Animated.View pointerEvents="none" style={[styles.tile, tileStyle, { left: L.tileCx - TILE / 2, top: L.tileCy - TILE / 2 }]}>
        <Animated.View style={tileText}>
          <Txt style={styles.tileText} center>
            {t('gifts.won', { count: amount })}
          </Txt>
        </Animated.View>
      </Animated.View>
      <GestureDetector gesture={coinGesture}>
        <View
          pointerEvents={rewardOut ? 'auto' : 'none'}
          style={[styles.coinHit, { left: L.tileCx - TILE / 2, top: L.tileCy - TILE / 2 }]}
          accessible={rewardOut}
          accessibilityRole="button"
          accessibilityLabel={t('dailyReward.collectAmount', { count: amount })}
          onAccessibilityTap={() => collect()}
        />
      </GestureDetector>
      <Animated.View pointerEvents="none" style={[styles.plus, plusStyle, { right: size.w - L.walletLeft + 8, top: L.walletIcon.y - 10 }]}>
        <Txt style={styles.plusText} accessibilityLiveRegion="polite">
          +{amount}
        </Txt>
      </Animated.View>

      {/* the coin, the drop */}
      {active && origin ? (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Fill>
            <Shader source={effect} uniforms={uniforms} />
          </Fill>
        </Canvas>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  veil: { backgroundColor: 'rgba(0,0,0,0.12)' },
  tile: {
    position: 'absolute',
    width: TILE,
    height: TILE,
    borderRadius: 36,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 28,
    paddingHorizontal: 20,
    boxShadow: '0 18px 50px rgba(120,70,30,0.18)',
  },
  tileText: { fontSize: 16, fontWeight: '600', color: palette.shellText },
  coinHit: { position: 'absolute', width: TILE, height: TILE },
  plus: { position: 'absolute' },
  plusText: { fontSize: 14, fontWeight: '600', color: palette.shellText, fontVariant: ['tabular-nums'] },
});
