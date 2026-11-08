import { BlurStyle, Canvas, PaintStyle, Picture, Skia, TileMode, useImage, type SkCanvas, type SkImage } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { BRAND, BRAND_ASPECT, CLAY_ICONS } from '@/assets/brand/registry';

// Ported from Native Cook's "Glass Icon Orbit" block (owner, 2026-11-08: use the block's own code,
// swap in our icons; https://nativecook.dev/blocks/glass-icon-orbit/, source
// react-native/src/blocks/onboarding/glass-icon-orbit/GlassIconOrbit.tsx). Kept from the block:
// the black ground and violet glow, the 9 s loop, the ring maths (8 tiles of 68 pt, radius 92 to
// 250, tipped 68 deg, focal 520), the dark glass tiles with gradient rims, the easing, the drag that
// spins the ring and pauses the loop for 2 s, reduced motion and the layout. Changed for Sigmazam:
// - the neon path icons are our 3D clay icons, each tile's rim and glow coloured to suit it;
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
/** The mascot over the centre tile, in points at full size. */
const MASCOT = 118;

/** Our clay icons round the ring, each with the rim colours that suit it on black. */
const ICONS = [
  { art: CLAY_ICONS.bubbles, rim: ['#8A5CFF', '#3DA2FF'] },
  { art: CLAY_ICONS.calls, rim: ['#3DA2FF', '#3CF0B4'] },
  { art: CLAY_ICONS.date, rim: ['#FF8A3D', '#FF5C9A'] },
  { art: CLAY_ICONS.diary, rim: ['#FFB03A', '#8A5CFF'] },
  { art: CLAY_ICONS.alarm, rim: ['#FFE15A', '#FF8A3D'] },
  { art: CLAY_ICONS.photo, rim: ['#3CF0B4', '#2D7BFF'] },
  { art: CLAY_ICONS.gift, rim: ['#FF7BD8', '#8A5CFF'] },
  { art: CLAY_ICONS.music, rim: ['#C05CFF', '#3DA2FF'] },
] as const;

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
  const hop = easeOutBack(seg(t, 6.2, 6.8)) * sink;
  return { radius, tilt, ringAlpha, centre, hop };
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

function drawIcon(c: SkCanvas, k: number, images: (SkImage | null)[], x: number, y: number, s: number, alpha: number) {
  'worklet';
  drawTileBody(c, x, y, s, ICONS[k].rim, alpha);
  const image = images[k];
  // The clay icon sits a little inside the rim, like the block's 64-unit path box.
  if (image) drawFitted(c, image, x + s * 0.16, y + s * 0.16, s * 0.68, s * 0.68, alpha);
}

function drawCentre(c: SkCanvas, cx: number, cy: number, size: number, hop: number, t: number, mascot: SkImage | null) {
  'worklet';
  if (size <= 0.01) return;
  const s = 92 * size;
  const halo = Skia.Paint();
  halo.setAntiAlias(true);
  // A warm brand glow where the block had blue.
  halo.setShader(Skia.Shader.MakeRadialGradient({ x: cx, y: cy }, s * 1.6, [Skia.Color('rgba(255,138,61,0.55)'), Skia.Color('rgba(255,138,61,0)')], null, TileMode.Clamp));
  c.drawCircle(cx, cy, s * 1.6, halo);
  drawTileBody(c, cx - s / 2, cy - s / 2, s, ['#FF8A3D', '#5B5CFF'], 1);
  const ink = Skia.Paint();
  ink.setAntiAlias(true);
  ink.setColor(Skia.Color('#FFFFFF'));
  const k = s / 92;
  // The three dots: someone typing for a moment; they fade as the mascot comes out.
  if (hop < 1) {
    for (let i = 0; i < 3; i++) {
      const bounce = t > 5.1 && t < 6.2 ? Math.max(0, Math.sin((t - 5.1 - i * 0.12) * Math.PI * 2.8)) * 7 : 0;
      const x = cx + (i - 1) * 16 * k;
      const y = cy + 6 * k - bounce * k;
      ink.setAlphaf(clamp01(1 - hop * 2));
      c.drawCircle(x, y, 4.2 * k, ink);
    }
  }
  if (hop > 0.01 && mascot) {
    // Out of the tile and up: its feet leave the tile's middle as it grows to full size.
    const m = MASCOT * hop;
    const mw = m * (mascot.width() / mascot.height());
    drawFitted(c, mascot, cx - mw / 2, cy - m * 0.98, mw, m, clamp01(hop * 1.4));
  }
}

function drawOrbit(c: SkCanvas, t: number, spin: number, cx: number, cy: number, images: (SkImage | null)[], mascot: SkImage | null) {
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
      drawIcon(c, it.k, images, it.x - it.s / 2, it.y - it.s / 2, it.s, st.ringAlpha);
    }
  }
  drawCentre(c, cx, cy, st.centre, st.hop, t, mascot);
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
 * Our icons round the ring, two words in the middle, the mascot out of the centre tile, then
 * "Let's start".
 */
export function GlassIconOrbit({ autoPlay = true, onStart, top }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => sub.remove();
  }, []);

  // Each clay icon and the mascot, decoded once for the canvas.
  const i0 = useImage(ICONS[0].art);
  const i1 = useImage(ICONS[1].art);
  const i2 = useImage(ICONS[2].art);
  const i3 = useImage(ICONS[3].art);
  const i4 = useImage(ICONS[4].art);
  const i5 = useImage(ICONS[5].art);
  const i6 = useImage(ICONS[6].art);
  const i7 = useImage(ICONS[7].art);
  const mascot = useImage(BRAND.wink);

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
    drawOrbit(canvas, clock.get(), spin.get(), cx, cy, [i0, i1, i2, i3, i4, i5, i6, i7], mascot);
    return recorder.finishRecordingAsPicture();
  }, [width, height, cx, cy, i0, i1, i2, i3, i4, i5, i6, i7, mascot]);

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
        <Pressable onPress={onStart} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.action} maxFontSizeMultiplier={1.2}>
            {t('onboarding.start')}
          </Text>
        </Pressable>
        <Text style={styles.legal} maxFontSizeMultiplier={1.3}>
          {t('onboarding.legal')}
        </Text>
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
  word: { fontSize: 38, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.8 },
  over: { position: 'absolute' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 0 },
  heading: { fontSize: 28, lineHeight: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.8 },
  sub: { marginTop: 8, fontSize: 16, lineHeight: 22, color: 'rgba(255,255,255,0.6)' },
  button: { marginTop: 20, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  action: { fontSize: 17, fontWeight: '700', color: '#000000' },
  legal: { marginTop: 10, textAlign: 'center', fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.45)' },
});
