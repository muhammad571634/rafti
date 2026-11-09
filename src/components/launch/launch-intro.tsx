import { Canvas, Picture, Skia, useImage } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BRAND, BRAND_ASPECT } from '@/assets/brand/registry';
import { drawOrbit, easeOutBack, easeOutCubic, seg, SMALL_R, type OrbitStage } from '@/components/onboarding/glass-icon-orbit';
import { skiaReady } from '@/lib/skia-ready';
import { useAppStore } from '@/store/use-app-store';

// Cold-start intro: onboarding's orbit cut short. The ring gathers into the centre tile, the dots
// type, the mascot springs out over the logo, and the cover fades onto the first screen, which
// loads underneath meanwhile. Once per launch (never on a resume); skipped under Reduce Motion;
// gives way to any launch that lands off the tabs (onboarding, a tapped push, an alarm, a call).
//
// Timeline (seconds):
//  -0.35-0.00  the ring fades in, spinning (under the native splash's fade-out)
//   0.12-0.55  the ring is drawn into the middle
//   0.35-0.65  the centre tile grows in
//   0.65-0.95  typing dots
//   0.95-1.40  the mascot springs out; the logo fades up
//   1.65-1.95  the cover fades away (held while the app is still loading)
const LEAD = 0.35;
const RING_IN = 0.2;
const TYPE_AT = 0.65;
const JUMP_AT = 0.95;
const JUMP_END = 1.4;
const FADE_AT = 1.65;
const END = 1.95;
const FADE = END - FADE_AT;
/** Fade length of a skip. */
const QUICK = 0.18;
/** Longest the cover waits for the app. */
const HOLD_LIMIT = 8;
/** Longest frame step; past it a stall is cut rather than jumped over. */
const MAX_STEP = 0.25;

function launchStage(r: number): OrbitStage {
  'worklet';
  const gather = Math.pow(seg(r, 0.12, 0.55), 3);
  return {
    radius: SMALL_R * (1 - gather),
    tilt: 0,
    ringAlpha: easeOutCubic(seg(r, -LEAD, RING_IN - LEAD)) * (1 - gather),
    centre: easeOutBack(seg(r, 0.35, TYPE_AT)),
    jump: seg(r, JUMP_AT, JUMP_END),
    sink: 1,
    typing: r > TYPE_AT && r < JUMP_AT ? r - TYPE_AT : 0,
    settled: r > JUMP_END ? r - JUMP_END : 0,
  };
}

/**
 * Mounted at the root from the first render; `ready` is the root's fonts and i18n. Not drawn without
 * Skia's native side (the web export renders every route in Node, where Skia cannot draw).
 */
export function LaunchIntro({ ready }: { ready: boolean }) {
  const reduced = useReducedMotion();
  const [done, setDone] = useState(reduced || !skiaReady);
  const finish = useCallback(() => setDone(true), []);
  if (done) return null;
  return <Intro ready={ready} onDone={finish} />;
}

function Intro({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const mascot = useImage(BRAND.hop);
  const cx = width / 2;
  const cy = height * 0.45;
  const hydrated = useAppStore((s) => s.hydrated);
  const ringing = useAppStore((s) => s.wake?.state === 'ringing');
  const segments = useSegments();
  const settled = ready && hydrated;
  const away = settled && ((segments.length > 0 && segments[0] !== '(tabs)') || ringing);

  const clock = useSharedValue(-LEAD);
  const fadeFrom = useSharedValue(FADE_AT);
  const fadeTo = useSharedValue(END);
  const open = useSharedValue(false);
  const finished = useSharedValue(false);

  useFrameCallback((info) => {
    // Real time: a janky start drops frames instead of slowing the intro down.
    const now = clock.get() + Math.min((info.timeSincePreviousFrame ?? 0) / 1000, MAX_STEP);
    clock.set(now);
    if (now > HOLD_LIMIT) open.set(true);
    // Until the app is ready the mascot keeps bobbing and the fade waits.
    if (!open.get() && now >= fadeFrom.get()) {
      fadeFrom.set(now);
      fadeTo.set(now + FADE);
    }
    if (now >= fadeTo.get() && !finished.get()) {
      finished.set(true);
      scheduleOnRN(onDone);
    }
  }, true);

  // The cover is drawn, so the native splash can go.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const skip = useCallback(() => {
    open.set(true);
    const now = clock.get();
    if (now + QUICK >= fadeTo.get()) return;
    fadeFrom.set(now);
    fadeTo.set(now + QUICK);
  }, [open, clock, fadeFrom, fadeTo]);

  useEffect(() => {
    if (away) skip();
    else if (settled) open.set(true);
  }, [away, settled, skip, open]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'background' && onDone());
    return () => sub.remove();
  }, [onDone]);

  const picture = useDerivedValue(() => {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, height));
    const r = clock.get();
    drawOrbit(canvas, launchStage(r), (Math.PI * 2 * r) / 1.3, cx, cy, mascot);
    return recorder.finishRecordingAsPicture();
  }, [width, height, cx, cy, mascot]);

  const coverStyle = useAnimatedStyle(() => ({ opacity: 1 - seg(clock.get(), fadeFrom.get(), fadeTo.get()) }));
  const logoStyle = useAnimatedStyle(() => {
    const up = easeOutCubic(seg(clock.get(), 1.05, 1.4));
    return { opacity: up, transform: [{ translateY: (1 - up) * 10 }] };
  });

  return (
    <Animated.View style={[styles.full, coverStyle]}>
      <StatusBar style="light" />
      <Pressable style={StyleSheet.absoluteFill} onPress={skip} accessibilityRole="button" accessibilityLabel="Sigmazam">
        <Canvas style={StyleSheet.absoluteFill}>
          <Picture picture={picture} />
        </Canvas>
        <Animated.View style={[styles.logoRow, { top: cy + 70 }, logoStyle]} pointerEvents="none">
          <Image source={BRAND.logo} style={styles.logo} contentFit="contain" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const LOGO_H = 30;

const styles = StyleSheet.create({
  full: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 1000, backgroundColor: '#000000' },
  logoRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  logo: { width: LOGO_H * BRAND_ASPECT.logo, height: LOGO_H },
});
