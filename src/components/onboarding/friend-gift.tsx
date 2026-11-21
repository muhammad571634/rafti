import { Image, type ImageContentPosition, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { InkText } from '@/components/ink';
import { Anim, ShellIcon } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { ink, inkGutter, inkRadius } from '@/theme/ink';

import { EASE_OUT, slowFor } from './night-motion';

/** How much of the screen their picture fills before it melts into the night. */
const PICTURE_SHARE = 0.64;
const SHELLS = 8;
const SHELL_SIZE = 28;
/** When each part arrives (ms, slower after midnight): the docs/prototypes/onboarding-gift.html timeline. */
const AT = { name: 400, bubble: 750, words: 1550, gift: 1800, shells: 1950, count: 2050 } as const;
const COUNT_MS = 900;

/**
 * The last step of the first run (owner 2026-11-17, `docs/prototypes/onboarding-gift.html`): the friend
 * the user picked gives the welcome gift. Their picture comes into focus and fills the top of the
 * screen, melting into the night with a glow of their colour, then drifts slowly; their name, typing
 * dots, then their first words to the user by name; shells fly from them into the gift, which counts
 * up and settles with a haptic. Reduce Motion: all of it at once, no flight. The white pill below
 * stays the onboarding's own (it becomes the chat's field on "Say hi"); it lights up on `onReady`.
 */
export const FriendGift = memo(function FriendGift({
  picture,
  position,
  name,
  hello,
  amount,
  line,
  hue,
  quiet,
  leaving,
  screenHeight,
  bottom,
  onReady,
}: {
  picture: ImageSource | number | string;
  position?: ImageContentPosition;
  name: string;
  hello: string;
  amount: number;
  line: string;
  hue: string;
  quiet: boolean;
  leaving: boolean;
  screenHeight: number;
  /** Room the pill takes at the bottom: the words sit just above it. */
  bottom: number;
  /** Once the gift has counted up and settled (at once under Reduce Motion): "Say hi" lights up then. */
  onReady?: () => void;
}) {
  const reduce = useReducedMotion();
  const k = slowFor(quiet);
  const pictureHeight = Math.round(screenHeight * PICTURE_SHARE);

  // The picture: into focus (scale and fade), then a slow drift for as long as the step shows.
  const focus = useSharedValue(reduce ? 1 : 0);
  const drift = useSharedValue(0);
  const out = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    focus.set(withTiming(1, { duration: 1200 * k, easing: EASE_OUT }));
    drift.set(withDelay(1200 * k, withRepeat(withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.quad) }), -1, true)));
  }, [reduce, k, focus, drift]);
  useEffect(() => {
    out.set(withTiming(leaving ? 1 : 0, { duration: 300, easing: EASE_OUT }));
  }, [leaving, out]);
  const pictureStyle = useAnimatedStyle(() => ({
    opacity: focus.get(),
    transform: [{ scale: 1.14 - 0.12 * focus.get() + 0.05 * drift.get() }, { translateY: -6 * drift.get() }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: focus.get() * (1 - out.get()), transform: [{ scaleX: 0.7 + 0.3 * focus.get() }] }));
  const wordsOut = useAnimatedStyle(() => ({ opacity: 1 - out.get(), transform: [{ translateY: out.get() * 18 }] }));

  // "Say hi" waits for the gift (owner, 2026-11-17: a fast tap skipped the whole moment).
  const ready = useRef(onReady);
  useEffect(() => {
    ready.current = onReady;
  }, [onReady]);
  useEffect(() => {
    const id = setTimeout(() => ready.current?.(), reduce ? 0 : (AT.count + COUNT_MS) * k);
    return () => clearTimeout(id);
  }, [reduce, k]);

  // Their words arrive after the dots.
  const [said, setSaid] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    const id = setTimeout(() => setSaid(true), AT.words * k);
    return () => clearTimeout(id);
  }, [reduce, k]);

  // Where the shells land: the gift's coin, measured once it has its place.
  const coin = useRef<ComponentRef<typeof View>>(null);
  const root = useRef<ComponentRef<typeof View>>(null);
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const measure = () => {
    const node = coin.current;
    const box = root.current;
    if (!node || !box) return;
    box.measureInWindow((bx, by) => node.measureInWindow((x, y, w, h) => w > 0 && setTarget({ x: x - bx + w / 2, y: y - by + h / 2 })));
  };

  const pulse = useSharedValue(1);
  const settle = () => {
    haptic.success();
    pulse.set(withSequence(withSpring(1.16, { duration: 200, dampingRatio: 0.5 }), withSpring(1, { duration: 320, dampingRatio: 0.6 })));
  };
  const chipStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));
  const bump = () => {
    pulse.set(withSequence(withTiming(1.07, { duration: 90 }), withTiming(1, { duration: 130 })));
  };

  return (
    // On the night's own ground: the sky's dawn below the picture left a hard line where the picture ended (A51).
    <View ref={root} pointerEvents="none" style={styles.root} collapsable={false}>
      <View style={[styles.picture, { height: pictureHeight }]}>
        <Animated.View style={[StyleSheet.absoluteFill, pictureStyle]}>
          <Image source={typeof picture === 'string' ? { uri: picture } : picture} contentFit="cover" contentPosition={position ?? 'top'} style={StyleSheet.absoluteFill} accessible={false} />
        </Animated.View>
        <LinearGradient colors={MELT} locations={MELT_AT} style={StyleSheet.absoluteFill} />
      </View>
      {/* Their colour rising where the picture meets the night. */}
      <Animated.View style={[styles.glow, { top: pictureHeight - 150 }, glowStyle]}>
        <LinearGradient colors={['transparent', `${hue}40`, 'transparent']} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View style={[styles.words, { bottom }, wordsOut]}>
        <Rise delay={AT.name * k} reduce={reduce}>
          <InkText variant="display" style={styles.name}>
            {name}
          </InkText>
        </Rise>
        <Rise delay={AT.bubble * k} reduce={reduce} pop>
          <View style={styles.bubble}>{said ? <InkText variant="body">{hello}</InkText> : <Anim name="typing" size={34} tint={ink.text2} />}</View>
        </Rise>
        <Rise delay={AT.gift * k} reduce={reduce} onShown={measure}>
          <View style={styles.gift} accessible accessibilityLabel={`+${amount}. ${line}`}>
            <Animated.View style={[styles.chip, { borderColor: `${hue}66` }, chipStyle]}>
              <View ref={coin} collapsable={false}>
                <ShellIcon size={30} />
              </View>
              <Count to={amount} delay={reduce ? 0 : AT.count * k} duration={reduce ? 0 : COUNT_MS * k} onDone={reduce ? undefined : settle} />
            </Animated.View>
            <InkText variant="sub" style={styles.line}>
              {line}
            </InkText>
          </View>
        </Rise>
      </Animated.View>

      {!reduce && target
        ? Array.from({ length: quiet ? 5 : SHELLS }, (_, i) => (
            <FlyingShell key={i} index={i} from={{ x: inkGutter + 140 + ((i * 37) % 90), y: pictureHeight * 0.4 + ((i * 53) % 80) }} to={target} delay={(AT.shells + i * 90) * k} onLand={bump} />
          ))
        : null}
    </View>
  );
});

const MELT = ['rgba(9,9,13,0.35)', 'rgba(9,9,13,0)', 'rgba(9,9,13,0)', 'rgba(9,9,13,0.85)', ink.ground] as const;
const MELT_AT = [0, 0.18, 0.46, 0.82, 1] as const;

/** Fades and lifts a part in at its moment; `pop` adds the bubble's small spring. */
function Rise({ delay, reduce, pop, onShown, children }: { delay: number; reduce: boolean; pop?: boolean; onShown?: () => void; children: React.ReactNode }) {
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      if (onShown) requestAnimationFrame(onShown);
      return;
    }
    p.set(
      withDelay(
        delay,
        withTiming(1, { duration: pop ? 420 : 520, easing: pop ? Easing.bezier(0.3, 1.4, 0.5, 1) : EASE_OUT }, (done) => {
          if (done && onShown) scheduleOnRN(onShown);
        }),
      ),
    );
    // Once, when the step appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ translateY: (1 - p.get()) * (pop ? 10 : 14) }, { scale: pop ? 0.96 + 0.04 * p.get() : 1 }],
  }));
  return <Animated.View style={[pop && styles.popOrigin, style]}>{children}</Animated.View>;
}

/** The gift's number counting up from nothing; only this text re-renders, for about a second. */
function Count({ to, delay, duration, onDone }: { to: number; delay: number; duration: number; onDone?: () => void }) {
  const [n, setN] = useState(duration ? 0 : to);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (!duration) return;
    let raf = 0;
    const start = Date.now() + delay;
    const tick = () => {
      const v = Math.max(0, Math.min(1, (Date.now() - start) / duration));
      setN(Math.round(to * (1 - Math.pow(1 - v, 3))));
      if (v < 1) raf = requestAnimationFrame(tick);
      else done.current?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay, duration]);
  return (
    <InkText variant="figure" color={ink.accent}>
      {`+${n}`}
    </InkText>
  );
}

/** One shell flying from the friend into the gift along an arc, spinning, and gone as it lands. */
function FlyingShell({ index, from, to, delay, onLand }: { index: number; from: { x: number; y: number }; to: { x: number; y: number }; delay: number; onLand: () => void }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(
      withDelay(
        delay,
        withTiming(1, { duration: 700, easing: Easing.bezier(0.4, 0, 0.6, 1) }, (done) => {
          if (done) scheduleOnRN(onLand);
        }),
      ),
    );
    // Once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const lift = 60 + (index % 3) * 20;
  const sway = ((index % 4) - 1.5) * 26;
  const style = useAnimatedStyle(() => {
    const v = p.get();
    // A quadratic arc: up and to the side first, then down into the coin.
    const mx = (from.x + to.x) / 2 + sway;
    const my = Math.min(from.y, to.y) - lift;
    const x = (1 - v) * (1 - v) * from.x + 2 * (1 - v) * v * mx + v * v * to.x;
    const y = (1 - v) * (1 - v) * from.y + 2 * (1 - v) * v * my + v * v * to.y;
    return {
      opacity: v <= 0 || v >= 1 ? 0 : v < 0.15 ? v / 0.15 : 1,
      transform: [{ translateX: x - SHELL_SIZE / 2 }, { translateY: y - SHELL_SIZE / 2 }, { scale: v < 0.45 ? 0.4 + v * 1.55 : 1.1 - (v - 0.45) * 0.9 }, { rotate: `${320 * v}deg` }],
    };
  });
  return (
    <Animated.View style={[styles.flyer, style]}>
      {/* The app's own shell, the one the wallet and every price show. */}
      <ShellIcon size={SHELL_SIZE} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: ink.ground },
  picture: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  glow: { position: 'absolute', left: -40, right: -40, height: 300 },
  words: { position: 'absolute', left: inkGutter, right: inkGutter, gap: 14 },
  name: { fontSize: 40, lineHeight: 46, letterSpacing: -0.6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },
  popOrigin: { alignSelf: 'flex-start', maxWidth: '88%' },
  // The friend's side of a chat on the night, as the name step's bubble.
  bubble: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    borderBottomLeftRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: ink.photoGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
  },
  gift: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingLeft: 12,
    paddingRight: 18,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.photoGlass,
    borderWidth: 1,
    borderColor: ink.photoGlassRim,
  },
  line: { flex: 1 },
  flyer: { position: 'absolute', left: 0, top: 0, width: SHELL_SIZE, height: SHELL_SIZE },
});
