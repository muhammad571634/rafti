import { BlurStyle, Canvas, PaintStyle, Picture, Skia, StrokeCap, TileMode, useImage, type SkCanvas, type SkImage } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInUp, useAnimatedStyle, useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { BRAND, BRAND_ASPECT } from '@/assets/brand/registry';

// Ported from Native Cook's "Glass Icon Orbit" block (owner, 2026-11-08: use the block's own code,
// swap in our icons; https://nativecook.dev/blocks/glass-icon-orbit/, source
// react-native/src/blocks/onboarding/glass-icon-orbit/GlassIconOrbit.tsx). Kept from the block:
// the black ground and violet glow, the 9 s loop, the ring maths (8 tiles of 68 pt, radius 92 to
// 250, tipped 68 deg, focal 520), the dark glass tiles with gradient rims, the easing, the drag that
// spins the ring and pauses the loop for 2 s, reduced motion and the layout. Changed for Sigmazam:
// - the icons stay the block's neon gradient line icons in Apple's SF Symbols manner, drawn for our
//   features: chat, call, heart (dates), diary, alarm, photo, gift, spark (owner: the 3D clay icons
//   are retired; iOS-style icons only);
// - "halo" is the Sigmazam logo, "Skip" is the language chip (`top`), the copy is ours (14 locales);
// - after the centre tile's three dots (a friend typing), our mascot hops out of it instead of the
//   arrow, then sinks back with the tile as the ring opens out again;
// - the button starts onboarding (`onStart`), the legal line sits under it.
//
// Timeline (LOOP = 9 s); spin = 2 pi t / LOOP (one turn a loop):
//   0.0-1.2  rest: small ring
//   1.2-2.4  the ring swells to 250 and tips (ease-in-out cubic); the first word fades in
//   2.4-4.2  the big ring turns round the words (the second word from 3.3)
//   4.2-5.1  the tiles are drawn into the middle (ease-in cubic) and fade; the centre tile grows in
//            (ease-out back) with a warm glow
//   5.1-6.2  its three dots bounce (typing)
//   6.2-6.8  the mascot hops out of the tile (ease-out back)
//   6.8-7.8  hold
//   7.8-9.0  the centre tile and the mascot sink away and the small ring opens out again (ease-out cubic)

/** Seconds. */
export const LOOP = 9;
const TILE = 68;
const SMALL_R = 92;
const BIG_R = 250;
const FOCAL = 520;
const HOLD = 2;
/** The mascot's height over the centre tile, in points at full size (its whole body, arms and legs). */
const MASCOT = 150;
/** When the mascot jumps out: right as the dots stop. */
const JUMP_AT = 6.2;
const JUMP_END = 6.75;

/** Our features round the ring, as the block's neon icons: two-colour fill and rim, on black. */
const ICONS = [
  { kind: 'chat', a: '#C9B8FF', b: '#6B4DFF', rim: ['#FF8A3D', '#6E7BFF'] },
  { kind: 'phone', a: '#4DF5C8', b: '#2D9BFF', rim: ['#3DA2FF', '#8A5CFF'] },
  { kind: 'heart', a: '#FF8AD0', b: '#8A6BFF', rim: ['#FF8A3D', '#8A5CFF'] },
  { kind: 'book', a: '#FFE15A', b: '#FF8A3D', rim: ['#7A5CFF', '#FF8A3D'] },
  { kind: 'alarm', a: '#FFB03A', b: '#FF6AD5', rim: ['#8A5CFF', '#FF8A3D'] },
  { kind: 'photo', a: '#3CF0B4', b: '#2D7BFF', rim: ['#8A5CFF', '#3DA2FF'] },
  { kind: 'gift', a: '#FF7BD8', b: '#FFB03A', rim: ['#C05CFF', '#FF8A3D'] },
  { kind: 'spark', a: '#FF7BD8', b: '#4D7BFF', rim: ['#C05CFF', '#3DA2FF'] },
] as const;

/** Each icon's paths in a 64-unit box (the block's own photo, heart, chat and spark; the rest drawn to match). */
const PATHS: Record<string, { d: string; stroke: boolean }[]> = {
  chat: [{ d: 'M14 22 A6 6 0 0 1 20 16 H44 A6 6 0 0 1 50 22 V36 A6 6 0 0 1 44 42 H30 L22 49 V42 H20 A6 6 0 0 1 14 36 Z', stroke: false }],
  phone: [
    {
      d: 'M23 13 C20 13 15 16 15 22 C15 37 28 50 43 50 C49 50 51 45 51 42 V38.5 C51 37 50 36 48.6 35.7 L41.5 34.2 C40.3 33.9 39.2 34.4 38.6 35.4 L36.3 39 C30.6 36.4 28.4 34.2 25.8 28.6 L29.4 26.3 C30.4 25.7 30.9 24.6 30.6 23.4 L29.1 16.3 C28.8 14.9 27.7 13.9 26.3 13.9 Z',
      stroke: false,
    },
  ],
  heart: [{ d: 'M32 49 C13 36 13 19 24 19 C28 19 31 22 32 26 C33 22 36 19 40 19 C51 19 51 36 32 49 Z', stroke: false }],
  book: [
    { d: 'M32 21 C27 17 20 16 13 17 V46 C20 45 27 46 32 50 C37 46 44 45 51 46 V17 C44 16 37 17 32 21 Z', stroke: true },
    { d: 'M32 21 V49', stroke: true },
  ],
  alarm: [
    { d: 'M47 35 A15 15 0 1 1 17 35 A15 15 0 1 1 47 35 Z', stroke: true },
    { d: 'M32 27 V35 L37.5 38.5', stroke: true },
    { d: 'M14 20 L20 14', stroke: true },
    { d: 'M50 20 L44 14', stroke: true },
  ],
  photo: [
    { d: 'M18 18 H46 A6 6 0 0 1 52 24 V42 A6 6 0 0 1 46 48 H18 A6 6 0 0 1 12 42 V24 A6 6 0 0 1 18 18 Z', stroke: true },
    { d: 'M14 46 L27 32 L35 40 L41 34 L50 46 Z', stroke: false },
    { d: 'M44 27 A4 4 0 1 1 36 27 A4 4 0 1 1 44 27 Z', stroke: false },
  ],
  gift: [
    { d: 'M13 25 H51 V32 H13 Z', stroke: true },
    { d: 'M17 32 V49 H47 V32', stroke: true },
    { d: 'M32 25 V49', stroke: true },
    { d: 'M32 25 C27 15 18 17 22 25', stroke: true },
    { d: 'M32 25 C37 15 46 17 42 25', stroke: true },
  ],
  spark: [{ d: 'M32 10 C34 26 38 30 54 32 C38 34 34 38 32 54 C30 38 26 34 10 32 C26 30 30 26 32 10 Z', stroke: false }],
};

function clamp01(x: number) {
  'worklet';
  return Math.min(1, Math.max(0, x));
}
function seg(t: number, a: number, b: number) {
  'worklet';
  return clamp01((t - a) / (b - a));
}
function easeInOutCubic(x: number) {
  'worklet';
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
function easeOutCubic(x: number) {
  'worklet';
  return 1 - Math.pow(1 - x, 3);
}
function easeOutBack(x: number) {
  'worklet';
  const k = 1.6;
  return 1 + (k + 1) * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2);
}

/** Ring radius and tilt, gather (tiles drawn in), centre tile size and the mascot's hop. */
function stageAt(t: number) {
  'worklet';
  const swell = easeInOutCubic(seg(t, 1.2, 2.4));
  const gather = Math.pow(seg(t, 4.2, 5.1), 3);
  const reopen = easeOutCubic(seg(t, 7.8, 9.0));
  const radius = gather < 1 ? SMALL_R + (BIG_R - SMALL_R) * swell * (1 - gather) - SMALL_R * gather : SMALL_R * reopen;
  const tilt = 68 * swell * (1 - gather);
  const ringAlpha = gather < 1 ? 1 - gather : reopen;
  const sink = 1 - easeInOutCubic(seg(t, 7.8, 8.5));
  const centre = easeOutBack(seg(t, 4.5, 5.1)) * sink;
  const jump = seg(t, JUMP_AT, JUMP_END);
  return { radius, tilt, ringAlpha, centre, jump, sink };
}

function rimPaint(x: number, y: number, s: number, rim: readonly string[], alpha: number) {
  'worklet';
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(1.6);
  p.setAlphaf(alpha);
  p.setShader(Skia.Shader.MakeLinearGradient({ x, y }, { x: x + s, y: y + s }, [Skia.Color(rim[0]), Skia.Color('rgba(255,255,255,0.15)'), Skia.Color(rim[1])], [0, 0.5, 1], TileMode.Clamp));
  return p;
}

/** A glass tile of size s with its top-left at (x, y). */
function drawTileBody(c: SkCanvas, x: number, y: number, s: number, rim: readonly string[], alpha: number) {
  'worklet';
  const rr = Skia.RRectXY(Skia.XYWHRect(x, y, s, s), s * 0.28, s * 0.28);
  const glow = Skia.Paint();
  glow.setAntiAlias(true);
  glow.setColor(Skia.Color(rim[0]));
  glow.setAlphaf(0.35 * alpha);
  glow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, s * 0.12, true));
  c.drawRRect(rr, glow);
  const body = Skia.Paint();
  body.setAntiAlias(true);
  body.setAlphaf(alpha);
  body.setShader(Skia.Shader.MakeLinearGradient({ x, y }, { x, y: y + s }, [Skia.Color('#1A1826'), Skia.Color('#07070C')], null, TileMode.Clamp));
  c.drawRRect(rr, body);
  const inner = Skia.Paint();
  inner.setAntiAlias(true);
  inner.setAlphaf(alpha * 0.5);
  inner.setShader(Skia.Shader.MakeRadialGradient({ x: x + s * 0.5, y: y + s * 1.1 }, s * 0.7, [Skia.Color(rim[1]), Skia.Color('rgba(0,0,0,0)')], null, TileMode.Clamp));
  c.drawRRect(rr, inner);
  c.drawRRect(rr, rimPaint(x, y, s, rim, alpha));
}

/** An image fitted (contain) into the box at (x, y) of size w x h, centred. */
function drawFitted(c: SkCanvas, image: SkImage, x: number, y: number, w: number, h: number, alpha: number) {
  'worklet';
  const iw = image.width();
  const ih = image.height();
  const k = Math.min(w / iw, h / ih);
  const dw = iw * k;
  const dh = ih * k;
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setAlphaf(alpha);
  c.drawImageRect(image, Skia.XYWHRect(0, 0, iw, ih), Skia.XYWHRect(x + (w - dw) / 2, y + (h - dh) / 2, dw, dh), p);
}

function drawIcon(c: SkCanvas, k: number, x: number, y: number, s: number, alpha: number) {
  'worklet';
  const icon = ICONS[k];
  drawTileBody(c, x, y, s, icon.rim, alpha);
  const parts = PATHS[icon.kind];
  c.save();
  c.translate(x, y);
  c.scale(s / 64, s / 64);
  for (let n = 0; n < parts.length; n++) {
    const path = Skia.Path.MakeFromSVGString(parts[n].d);
    if (!path) continue;
    const p = Skia.Paint();
    p.setAntiAlias(true);
    p.setAlphaf(alpha);
    p.setShader(Skia.Shader.MakeLinearGradient({ x: 12, y: 12 }, { x: 52, y: 52 }, [Skia.Color(icon.a), Skia.Color(icon.b)], null, TileMode.Clamp));
    if (parts[n].stroke) {
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(5);
      p.setStrokeCap(StrokeCap.Round);
    }
    c.drawPath(path, p);
  }
  c.restore();
}

function drawCentre(c: SkCanvas, cx: number, cy: number, size: number, jump: number, sink: number, t: number, mascot: SkImage | null) {
  'worklet';
  if (size <= 0.01) return;
  const s = 92 * size;
  const halo = Skia.Paint();
  halo.setAntiAlias(true);
  // A warm brand glow where the block had blue; it flares as the mascot jumps out.
  const flare = 1 + 0.35 * Math.sin(Math.PI * jump) * sink;
  halo.setShader(Skia.Shader.MakeRadialGradient({ x: cx, y: cy }, s * 1.6 * flare, [Skia.Color('rgba(255,138,61,0.55)'), Skia.Color('rgba(255,138,61,0)')], null, TileMode.Clamp));
  c.drawCircle(cx, cy, s * 1.6 * flare, halo);
  drawTileBody(c, cx - s / 2, cy - s / 2, s, ['#FF8A3D', '#5B5CFF'], 1);
  const ink = Skia.Paint();
  ink.setAntiAlias(true);
  ink.setColor(Skia.Color('#FFFFFF'));
  const k = s / 92;
  // The three dots: someone typing; they go the instant the mascot jumps.
  const dots = clamp01(1 - jump * 4);
  if (dots > 0) {
    for (let i = 0; i < 3; i++) {
      const bounce = t > 5.1 && t < JUMP_AT ? Math.max(0, Math.sin((t - 5.1 - i * 0.12) * Math.PI * 2.8)) * 7 : 0;
      const x = cx + (i - 1) * 16 * k;
      const y = cy + 6 * k - bounce * k;
      ink.setAlphaf(dots);
      c.drawCircle(x, y, 4.2 * k, ink);
    }
  }
  if (jump > 0 && sink > 0.01 && mascot) {
    // A spring out of the tile: it shoots up past its rest, falls back with a squash, then breathes.
    const up = easeOutBack(jump);
    const size = (0.25 + 0.75 * up) * sink;
    // Stretched on the way up, squashed as it lands (jump 0.7-1), round again once it settles.
    const land = seg(jump, 0.7, 1);
    const squash = jump < 1 ? Math.sin(Math.PI * land) * 0.1 : 0;
    const stretch = jump < 0.7 ? Math.sin((Math.PI * jump) / 0.7) * 0.08 : 0;
    const idle = t > JUMP_END ? Math.sin((t - JUMP_END) * Math.PI * 2 * 1.2) * 3 : 0;
    const h = MASCOT * size * (1 + stretch - squash);
    const w = MASCOT * (mascot.width() / mascot.height()) * size * (1 - stretch * 0.6 + squash);
    // Its feet rest on the tile's top edge, so the whole body shows above it.
    const feet = cy - s * 0.42 + (1 - up) * s * 0.5 - idle;
    drawFitted(c, mascot, cx - w / 2, feet - h, w, h, clamp01(jump * 5) * sink);
  }
}

function drawOrbit(c: SkCanvas, t: number, spin: number, cx: number, cy: number, mascot: SkImage | null) {
  'worklet';
  const st = stageAt(t);
  // Violet glow behind the ring.
  const g = Skia.Paint();
  g.setAntiAlias(true);
  const gr = 150 + st.radius * 0.6;
  g.setShader(Skia.Shader.MakeRadialGradient({ x: cx, y: cy }, gr, [Skia.Color('rgba(80,50,255,0.55)'), Skia.Color('rgba(40,20,160,0.18)'), Skia.Color('rgba(0,0,0,0)')], [0, 0.55, 1], TileMode.Clamp));
  c.drawCircle(cx, cy, gr, g);
  if (st.ringAlpha > 0.01) {
    const tilt = (st.tilt * Math.PI) / 180;
    const items: { k: number; x: number; y: number; s: number; z: number }[] = [];
    for (let k = 0; k < ICONS.length; k++) {
      const th = spin + (k * Math.PI * 2) / ICONS.length;
      const x = st.radius * Math.cos(th);
      const y0 = st.radius * Math.sin(th);
      // Tip the ring about the x axis towards the viewer.
      const y = y0 * Math.cos(tilt);
      const z = y0 * Math.sin(tilt);
      const sc = FOCAL / (FOCAL - z);
      items.push({ k, x: cx + x * sc, y: cy + y * sc, s: TILE * sc, z });
    }
    items.sort((a, b) => a.z - b.z);
    for (let n = 0; n < items.length; n++) {
      const it = items[n];
      drawIcon(c, it.k, it.x - it.s / 2, it.y - it.s / 2, it.s, st.ringAlpha);
    }
  }
  drawCentre(c, cx, cy, st.centre, st.jump, st.sink, t, mascot);
}

type Props = {
  /** Plays the intro by itself, every LOOP seconds. */
  autoPlay?: boolean;
  /** The button: on to the first question. */
  onStart: () => void;
  /** The top row's right end (the language chip), where the block had "Skip". */
  top?: ReactNode;
};

/**
 * Onboarding's first screen (replaces the old first hello): what the app is, before the questions.
 * Our features round the ring as neon iOS-style icons, two words in the middle, the mascot out of the centre tile, then
 * "Let's start".
 */
export function GlassIconOrbit({ autoPlay = true, onStart, top }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(AppState.currentState === 'active');
  // Start shows once the mascot has jumped out the first time (at once under Reduce Motion).
  const [ready, setReady] = useState(reduced);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setReady(true), JUMP_END * 1000);
    return () => clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => sub.remove();
  }, []);

  // The mascot, decoded once for the canvas.
  const mascot = useImage(BRAND.hop);

  const cx = width / 2;
  const cy = height * 0.45;

  const elapsed = useSharedValue(0);
  const origin = useSharedValue(0);
  // Reduced motion: the still frame with the mascot out of the tile.
  const clock = useSharedValue(reduced ? 7 : 0);
  const spin = useSharedValue(0);
  const extra = useSharedValue(0);
  const touching = useSharedValue(false);
  const released = useSharedValue(-10);
  const paused = useSharedValue(0);

  const frame = useFrameCallback((info) => {
    const dt = (info.timeSincePreviousFrame ?? 0) / 1000;
    elapsed.set(elapsed.get() + dt);
    const now = elapsed.get();
    // While touched (and for 2 s after) the loop clock stands still and the finger spins the ring.
    if (touching.get() || now - released.get() < HOLD) {
      origin.set(origin.get() + dt);
      paused.set(1);
    } else if (paused.get() > 0) {
      // Unwind the extra spin over 0.6 s so the loop picks up exactly.
      extra.set(extra.get() * Math.exp(-6 * dt));
      if (Math.abs(extra.get()) < 0.002) {
        extra.set(0);
        paused.set(0);
      }
    }
    const tt = autoPlay ? (((now - origin.get()) % LOOP) + LOOP) % LOOP : 0;
    clock.set(tt);
    spin.set((Math.PI * 2 * tt) / LOOP + extra.get());
  }, false);
  useEffect(() => {
    frame.setActive(active && !reduced);
    return () => frame.setActive(false);
  }, [active, reduced, frame]);

  const picture = useDerivedValue(() => {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, height));
    drawOrbit(canvas, clock.get(), spin.get(), cx, cy, mascot);
    return recorder.finishRecordingAsPicture();
  }, [width, height, cx, cy, mascot]);

  const ideaStyle = useAnimatedStyle(() => {
    const tt = clock.get();
    return { opacity: seg(tt, 1.6, 2.2) * (1 - seg(tt, 3.1, 3.4)) };
  });
  const needStyle = useAnimatedStyle(() => {
    const tt = clock.get();
    return { opacity: seg(tt, 3.3, 3.6) * (1 - seg(tt, 4.2, 4.6)) };
  });

  const haptic = () => {
    if (process.env.EXPO_OS === 'web') return;
    Haptics.selectionAsync().catch(() => {});
  };
  const pan = Gesture.Pan()
    .enabled(!reduced)
    .minDistance(4)
    .onStart(() => {
      touching.set(true);
      scheduleOnRN(haptic);
    })
    .onChange((e) => extra.set(extra.get() + e.changeX / 120))
    .onFinalize(() => {
      touching.set(false);
      released.set(elapsed.get());
    });

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill} accessible accessibilityLabel={t('onboarding.orbitA11y')}>
            <Picture picture={picture} />
          </Canvas>
          <View style={[styles.words, { top: cy - 24 }]} pointerEvents="none">
            <Animated.Text style={[styles.word, ideaStyle]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>
              {t('onboarding.orbitWordA')}
            </Animated.Text>
            <Animated.Text style={[styles.word, styles.over, needStyle]} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.1}>
              {t('onboarding.orbitWordB')}
            </Animated.Text>
          </View>
        </View>
      </GestureDetector>
      <View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Image source={BRAND.logo} style={styles.brand} contentFit="contain" contentPosition="left center" accessibilityLabel={t('app.name')} />
        {top}
      </View>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <Text style={styles.heading} maxFontSizeMultiplier={1.2}>
          {t('onboarding.orbitTitle')}
        </Text>
        <Text style={styles.sub} maxFontSizeMultiplier={1.3}>
          {t('onboarding.orbitBody')}
        </Text>
        {/* Start comes up once the mascot is out (owner); its room is kept so nothing above moves. */}
        <View style={styles.startRoom}>
          {ready ? (
            <Animated.View entering={FadeInUp.duration(380)}>
              <Pressable onPress={onStart} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
                <Text style={styles.action} maxFontSizeMultiplier={1.2}>
                  {t('onboarding.start')}
                </Text>
              </Pressable>
              <Text style={styles.legal} maxFontSizeMultiplier={1.3}>
                {t('onboarding.legal')}
              </Text>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const LOGO_H = 26;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  top: { position: 'absolute', left: 24, right: 24, height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { width: LOGO_H * BRAND_ASPECT.logo, height: LOGO_H },
  words: { position: 'absolute', left: 24, right: 24, height: 48, alignItems: 'center', justifyContent: 'center' },
  word: { fontSize: 34, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.8 },
  over: { position: 'absolute' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 0 },
  heading: { fontSize: 28, lineHeight: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.8 },
  sub: { marginTop: 8, fontSize: 16, lineHeight: 22, color: 'rgba(255,255,255,0.6)' },
  startRoom: { minHeight: 128 },
  button: { marginTop: 20, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  action: { fontSize: 17, fontWeight: '700', color: '#000000' },
  legal: { marginTop: 10, textAlign: 'center', fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.45)' },
});
