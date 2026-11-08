import { Canvas, Picture, Skia, useImage } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BRAND, BRAND_ASPECT } from '@/assets/brand/registry';
import { clamp01, drawOrbit, easeOutBack, easeOutCubic, seg, SMALL_R, type OrbitStage } from '@/components/onboarding/glass-icon-orbit';
import { useAppStore } from '@/store/use-app-store';
import { colors } from '@/theme';

// The few seconds of every cold start (owner, 2026-11-08: "a 1-3 s animation on every app open"):
// onboarding's Glass Icon Orbit cut short. The splash's colour turns to black, the small ring of our
// features spins in and is drawn into the centre tile, the friend types, the mascot springs out with
// the logo under it, and the whole cover fades onto the app that loaded underneath meanwhile.
// Not on a resume (it mounts once per launch), not before onboarding (onboarding opens with the full
// orbit), not under Reduce Motion, and it gives way at once to anything a launch opened elsewhere (a
// tapped push, a ringing alarm, an incoming call). A tap skips it.
//
// Timeline (seconds):
//   0.00-0.20  the splash's colour turns black; the ring fades in, spinning
//   0.12-0.55  the tiles are drawn into the middle (ease-in cubic)
//   0.35-0.65  the centre tile grows in (ease-out back)
//   0.65-0.95  its three dots bounce once (typing)
//   0.95-1.40  the mascot springs out (the onboarding hop, a little quicker); the logo fades up
//   1.65-1.95  the cover fades away
const RING_IN = 0.2;
const TYPE_AT = 0.65;
const JUMP_AT = 0.95;
const JUMP_END = 1.4;
const FADE_AT = 1.65;
const END = 1.95;
/** A skip (tap, or a launch that opened elsewhere) fades over this long. */
const QUICK = 0.18;

function launchStage(r: number): OrbitStage {
  'worklet';
  const gather = Math.pow(seg(r, 0.12, 0.55), 3);
  return {
    radius: SMALL_R * (1 - gather),
    tilt: 0,
    ringAlpha: easeOutCubic(seg(r, 0, RING_IN)) * (1 - gather),
    centre: easeOutBack(seg(r, 0.35, TYPE_AT)),
    jump: seg(r, JUMP_AT, JUMP_END),
    sink: 1,
    typing: r > TYPE_AT && r < JUMP_AT ? r - TYPE_AT : 0,
    settled: r > JUMP_END ? r - JUMP_END : 0,
  };
}

/** How long the cover may wait for the app before it lets go anyway (matches the splash's limit). */
const HOLD_LIMIT = 8;
/** The cover's fade once the app is ready after the intro has reached its end. */
const FADE = END - FADE_AT;

/**
 * Mounted once at the root, from the very first render (before fonts, words and saved data are
 * in), so the intro plays while the app loads instead of after it. `ready` is the root's own
 * readiness (fonts, i18n); the intro also waits for saved data, then fades onto the first screen.
 */
export function LaunchIntro({ ready }: { ready: boolean }) {
  const reduced = useReducedMotion();
  const [done, setDone] = useState(reduced);
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
  const onboarded = useAppStore((s) => !!s.user.onboardedAt);
  const ringing = useAppStore((s) => s.wake?.state === 'ringing');
  const segments = useSegments();
  const settled = ready && hydrated;
  // Before onboarding (it opens with the full orbit), or a launch that a tapped push, an alarm or a
  // call took elsewhere: give way at once.
  const elsewhere = segments.length > 0 && segments[0] !== '(tabs)';
  const away = settled && (!onboarded || elsewhere || ringing);

  const clock = useSharedValue(0);
  // Where the fade starts and ends: FADE_AT-END, held back while the app is not ready, or
  // now-now+QUICK after a skip.
  const fadeFrom = useSharedValue(FADE_AT);
  const fadeTo = useSharedValue(END);
  const open = useSharedValue(false);
  const finished = useSharedValue(false);

  useFrameCallback((info) => {
    const dt = Math.min((info.timeSincePreviousFrame ?? 0) / 1000, 0.05);
    const now = clock.get() + dt;
    clock.set(now);
    if (!open.get() && now > HOLD_LIMIT) open.set(true);
    // The app is not there yet: the mascot keeps bobbing and the fade waits.
    if (!open.get() && now >= fadeFrom.get()) {
      fadeFrom.set(now);
      fadeTo.set(now + FADE);
    }
    if (now >= fadeTo.get() && !finished.get()) {
      finished.set(true);
      scheduleOnRN(onDone);
    }
  }, true);

  // The intro is drawn over the splash's colour, so the native splash can go at once.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const skip = () => {
    open.set(true);
    const now = clock.get();
    if (now + QUICK >= fadeTo.get()) return;
    fadeFrom.set(now);
    fadeTo.set(now + QUICK);
  };

  useEffect(() => {
    if (away) skip();
    else if (settled) open.set(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [away, settled]);
  // Sent to the background mid-intro: it is over (it never comes back on a resume).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state !== 'active' && onDone());
    return () => sub.remove();
  }, [onDone]);

  const picture = useDerivedValue(() => {
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, width, height));
    const r = clock.get();
    drawOrbit(canvas, launchStage(r), (Math.PI * 2 * r) / 1.3, cx, cy, mascot);
    return recorder.finishRecordingAsPicture();
  }, [width, height, cx, cy, mascot]);

  // The splash's colour (theme), read once: the cover starts in it so the splash's hand-off does not show.
  const from = colors.bg;
  const coverStyle = useAnimatedStyle(() => {
    const r = clock.get();
    return {
      opacity: 1 - seg(r, fadeFrom.get(), fadeTo.get()),
      backgroundColor: interpolateColor(clamp01(r / RING_IN), [0, 1], [from, '#000000']),
    };
  });
  const logoStyle = useAnimatedStyle(() => {
    const r = clock.get();
    const up = easeOutCubic(seg(r, 1.05, 1.4));
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
  full: { ...StyleSheet.absoluteFill, zIndex: 1000, elevation: 1000 },
  logoRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  logo: { width: LOGO_H * BRAND_ASPECT.logo, height: LOGO_H },
});
