import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { InkText } from '@/components/ink';
import { CharacterAvatar } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import {
  WAX_AUTO_CRACK_MS,
  WAX_CRACK_BRANCHES,
  WAX_HOLD_MS,
  waxOutlinePath,
  waxPaletteFor,
  type CrackBranch,
  type WaxSealTier,
} from '@/lib/wax-seal';
import { sharedWaxSealSound } from '@/lib/wax-seal-sound';
import { fonts } from '@/theme';
import { ink, inkRadius, inkWaxSeal } from '@/theme/ink';
import type { Character } from '@/types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const SEAL_BOX = 120;
const SEAL_DISPLAY = 104;
const RING_R = 49;
const RING_CIRC = 2 * Math.PI * RING_R;
const WAX_PATH = waxOutlinePath(60, 60, 39);

/**
 * Obsidian Sealed Envelope with a sculpted 3D Wax Seal ("1. Bosib sindirish", owner approved 2026-11-27).
 * - Before the user writes their note (`canBreak === false`), tapping gives a damped locked wobble
 *   and calls `onNeedNote()` to guide focus straight to the input.
 * - Once their note is ready (`canBreak === true`), pressing and holding the wax medallion for
 *   `WAX_HOLD_MS` builds radial tension, draws 5 live stress fissures across the wax face with
 *   ascending tactile creaks/haptics, then snaps cleanly and invokes `onBreak()`.
 * - Incrementing `autoCrackSeq` (from the bottom "Swap notes" button) plays the exact same
 *   fracture ritual automatically so 1-tap and VoiceOver accessibility stay seamless.
 */
export function WaxSealEnvelope({
  character,
  initial,
  accentColor,
  tier,
  sealedTitle,
  hintText,
  streakLabel,
  creaseLabel,
  accessibilityLabel,
  canBreak,
  autoCrackSeq,
  onBeforeStart,
  onBreak,
  onNeedNote,
}: {
  character: Character;
  initial: string;
  accentColor: string;
  tier: WaxSealTier;
  sealedTitle: string;
  hintText: string;
  streakLabel?: string;
  creaseLabel: string;
  accessibilityLabel: string;
  canBreak: boolean;
  /** Increment to play the full crack ritual automatically (e.g. from the bottom Swap CTA). */
  autoCrackSeq: number;
  /** Optional pre-flight guard (e.g. shell affordability); return false to abort cracking. */
  onBeforeStart?: () => boolean;
  /** Return false if exchange unexpectedly failed so the seal resets cleanly. */
  onBreak: () => boolean;
  onNeedNote: () => void;
}) {
  const reduced = useReducedMotion();
  const pal = useMemo(() => waxPaletteFor(tier, accentColor), [tier, accentColor]);

  const hold = useSharedValue(0);
  const wobbleX = useSharedValue(0);
  const wobbleRot = useSharedValue(0);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const brokenRef = useRef(false);
  const holdingRef = useRef(false);
  const onBreakRef = useRef(onBreak);
  onBreakRef.current = onBreak;
  const onBeforeStartRef = useRef(onBeforeStart);
  onBeforeStartRef.current = onBeforeStart;

  const clearCrackTimers = useCallback(() => {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearCrackTimers(), [clearCrackTimers]);

  const finishBreak = useCallback(() => {
    if (brokenRef.current) return;
    brokenRef.current = true;
    holdingRef.current = false;
    clearCrackTimers();
    const ok = onBreakRef.current();
    if (ok) {
      sharedWaxSealSound().snap();
    } else {
      brokenRef.current = false;
      hold.set(withSpring(0, { damping: 18, stiffness: 260 }));
    }
  }, [clearCrackTimers, hold]);

  const startCrackRun = useCallback(
    (durationMs: number) => {
      if (brokenRef.current) return;
      if (onBeforeStartRef.current && !onBeforeStartRef.current()) {
        holdingRef.current = false;
        return;
      }
      clearCrackTimers();

      if (reduced) {
        hold.set(withTiming(1, { duration: 160 }));
        timersRef.current.push(setTimeout(finishBreak, 170));
        return;
      }

      hold.set(withTiming(1, { duration: durationMs, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }));
      sharedWaxSealSound().creak(0.2);
      haptic.selection();

      const steps = [0.24, 0.48, 0.72, 0.9];
      for (const frac of steps) {
        timersRef.current.push(
          setTimeout(() => {
            if (brokenRef.current) return;
            sharedWaxSealSound().creak(frac);
            if (frac >= 0.7) haptic.tap();
            else haptic.selection();
          }, Math.round(durationMs * frac)),
        );
      }
      timersRef.current.push(setTimeout(finishBreak, durationMs));
    },
    [clearCrackTimers, finishBreak, hold, reduced],
  );

  // One-tap bottom button trigger (`autoCrackSeq > 0`).
  const lastAutoSeq = useRef(autoCrackSeq);
  useEffect(() => {
    if (autoCrackSeq <= lastAutoSeq.current) return;
    lastAutoSeq.current = autoCrackSeq;
    if (!canBreak || brokenRef.current) return;
    startCrackRun(WAX_AUTO_CRACK_MS);
  }, [autoCrackSeq, canBreak, startCrackRun]);

  const triggerLockedWobble = useCallback(() => {
    haptic.tap();
    if (!reduced) {
      wobbleX.set(
        withSequence(
          withTiming(-5, { duration: 55 }),
          withTiming(5, { duration: 65 }),
          withTiming(-3, { duration: 60 }),
          withTiming(0, { duration: 75 }),
        ),
      );
      wobbleRot.set(
        withSequence(
          withTiming(-4, { duration: 55 }),
          withTiming(4, { duration: 65 }),
          withTiming(-2, { duration: 60 }),
          withTiming(0, { duration: 75 }),
        ),
      );
    }
    onNeedNote();
  }, [onNeedNote, reduced, wobbleRot, wobbleX]);

  const handlePressIn = useCallback(() => {
    if (brokenRef.current) return;
    if (!canBreak) {
      triggerLockedWobble();
      return;
    }
    holdingRef.current = true;
    startCrackRun(WAX_HOLD_MS);
  }, [canBreak, startCrackRun, triggerLockedWobble]);

  const handlePressOut = useCallback(() => {
    if (!holdingRef.current || brokenRef.current) return;
    holdingRef.current = false;
    clearCrackTimers();
    cancelAnimation(hold);
    hold.set(withSpring(0, { damping: 18, stiffness: 260 }));
  }, [clearCrackTimers, hold]);

  const sealMotionStyle = useAnimatedStyle(() => {
    const p = hold.value;
    const scale = reduced ? 1 : 1 - p * 0.085;
    // Subtle micro-tremor as the wax approaches fracture point
    const jitter = !reduced && p > 0.25 ? Math.sin(p * 62) * p * 1.9 : 0;
    return {
      opacity: canBreak ? 1 : 0.62,
      transform: [
        { translateX: wobbleX.value + jitter },
        { rotate: `${wobbleRot.value}deg` },
        { scale },
      ],
    };
  });

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRC * (1 - hold.value),
    opacity: hold.value > 0.01 ? 0.95 : 0,
  }));

  const gradSuffix = `${character.id}-${tier}`;

  return (
    <View style={styles.wrap}>
      {/* Folded obsidian linen V-flap behind the header and wax seal */}
      <View pointerEvents="none" style={styles.flapWrap}>
        <Svg width="100%" height="100%" viewBox="0 0 360 110" preserveAspectRatio="none">
          <Defs>
            <SvgLinearGradient id={`flap-${gradSuffix}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={inkWaxSeal.flapTop} />
              <Stop offset="100%" stopColor={inkWaxSeal.flapBottom} />
            </SvgLinearGradient>
          </Defs>
          <Path d="M0,0 L360,0 L180,98 Z" fill={`url(#flap-${gradSuffix})`} />
          <Path d="M0,0 L180,98 L360,0" fill="none" stroke={inkWaxSeal.flapEdge} strokeWidth={1.1} />
          <Path
            d="M16,8 L180,98 L344,8"
            fill="none"
            stroke={pal.accent}
            strokeOpacity={canBreak ? 0.36 : 0.16}
            strokeWidth={1.3}
          />
        </Svg>
      </View>

      {/* Top row: friend avatar + title + optional daily retention tier pill */}
      <View style={styles.topRow}>
        <View style={[styles.avatarRing, { borderColor: accentColor }]}>
          <CharacterAvatar character={character} size={34} />
        </View>
        <View style={styles.flex}>
          <InkText variant="subStrong" color={ink.text} lines={1}>
            {sealedTitle}
          </InkText>
          <InkText variant="footnote" color={ink.text2} lines={2} style={styles.hint}>
            {hintText}
          </InkText>
        </View>
        {streakLabel ? (
          <View style={[styles.tierPill, { backgroundColor: `${pal.accent}22`, borderColor: `${pal.accent}48` }]}>
            <InkText variant="tag" color={pal.rim} lines={1}>
              {streakLabel}
            </InkText>
          </View>
        ) : null}
      </View>

      {/* Centrepiece interactive 3D melted Wax Seal Medallion */}
      <View style={styles.sealCenter}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={hintText}
          hitSlop={10}
          style={styles.hitArea}>
          <Animated.View style={[styles.sealBox, sealMotionStyle]}>
            <Svg width={SEAL_DISPLAY} height={SEAL_DISPLAY} viewBox={`0 0 ${SEAL_BOX} ${SEAL_BOX}`}>
              <Defs>
                <RadialGradient id={`halo-${gradSuffix}`} cx="50%" cy="50%" r="50%">
                  <Stop offset="48%" stopColor={pal.accent} stopOpacity={canBreak ? 0.32 : 0.1} />
                  <Stop offset="100%" stopColor={pal.accent} stopOpacity={0} />
                </RadialGradient>
                <RadialGradient id={`body-${gradSuffix}`} cx="36%" cy="32%" r="68%">
                  <Stop offset="0%" stopColor={pal.rim} />
                  <Stop offset="34%" stopColor={pal.mid} />
                  <Stop offset="86%" stopColor={pal.deep} />
                  <Stop offset="100%" stopColor={inkWaxSeal.waxDarkEdge} />
                </RadialGradient>
                <RadialGradient id={`basin-${gradSuffix}`} cx="62%" cy="64%" r="62%">
                  <Stop offset="0%" stopColor={pal.mid} />
                  <Stop offset="78%" stopColor={pal.deep} />
                  <Stop offset="100%" stopColor={inkWaxSeal.embossShadow} />
                </RadialGradient>
              </Defs>

              {/* Soft molten ambient halo */}
              <Circle cx={60} cy={60} r={58} fill={`url(#halo-${gradSuffix})`} />

              {/* Radial hold tension ring */}
              <AnimatedCircle
                cx={60}
                cy={60}
                r={RING_R}
                fill="none"
                stroke={pal.rim}
                strokeWidth={3.2}
                strokeLinecap="round"
                strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
                transform="rotate(-90 60 60)"
                animatedProps={ringProps}
              />

              {/* Hand-poured organic melted wax silhouette */}
              <Path
                d={WAX_PATH}
                fill={`url(#body-${gradSuffix})`}
                stroke={pal.rim}
                strokeOpacity={0.52}
                strokeWidth={2}
              />

              {/* Recessed stamped inner basin & double embossed bezel */}
              <Circle cx={60} cy={60} r={29} fill={`url(#basin-${gradSuffix})`} />
              <Circle cx={60} cy={60} r={29} fill="none" stroke={inkWaxSeal.embossShadow} strokeWidth={1.8} />
              <Circle cx={60} cy={60} r={27} fill="none" stroke={pal.rim} strokeOpacity={0.44} strokeWidth={1} />

              {/* Embossed serif friend monogram */}
              <SvgText
                x={61}
                y={69.5}
                textAnchor="middle"
                fontFamily={fonts.serif}
                fontSize={29}
                fontWeight="700"
                fill={inkWaxSeal.embossShadow}>
                {initial}
              </SvgText>
              <SvgText
                x={60}
                y={68}
                textAnchor="middle"
                fontFamily={fonts.serif}
                fontSize={29}
                fontWeight="700"
                fill={pal.rim}>
                {initial}
              </SvgText>

              {/* Subtle specular highlight arc on upper-left rim */}
              <Path
                d="M36,41 A30,30 0 0,1 74,32"
                fill="none"
                stroke={inkWaxSeal.sheen}
                strokeWidth={2.2}
                strokeLinecap="round"
              />

              {/* Real-time stress fracture fissures driven directly by `hold` on UI thread */}
              {WAX_CRACK_BRANCHES.map((branch, idx) => (
                <CrackPath key={idx} branch={branch} hold={hold} glowColor={pal.crack} />
              ))}
            </Svg>
          </Animated.View>
        </Pressable>
      </View>

      {/* Bottom envelope crease divider */}
      <View style={styles.creaseRow}>
        <View style={[styles.creaseLine, { backgroundColor: `${pal.accent}42` }]} />
        <InkText variant="caption" color={canBreak ? pal.rim : ink.text3} style={styles.creaseText}>
          {creaseLabel}
        </InkText>
        <View style={[styles.creaseLine, { backgroundColor: `${pal.accent}42` }]} />
      </View>
    </View>
  );
}

function CrackPath({
  branch,
  hold,
  glowColor,
}: {
  branch: CrackBranch;
  hold: SharedValue<number>;
  glowColor: string;
}) {
  const glowProps = useAnimatedProps(() => {
    const span = Math.max(0.15, 0.94 - branch.startAt);
    const local = Math.max(0, Math.min(1, (hold.value - branch.startAt) / span));
    return {
      strokeDashoffset: branch.length * (1 - local),
      strokeOpacity: local > 0.01 ? 0.55 + local * 0.45 : 0,
    };
  });

  const coreProps = useAnimatedProps(() => {
    const span = Math.max(0.15, 0.94 - branch.startAt);
    const local = Math.max(0, Math.min(1, (hold.value - branch.startAt) / span));
    return {
      strokeDashoffset: branch.length * (1 - local),
      strokeOpacity: local > 0.05 ? 0.8 : 0,
    };
  });

  return (
    <>
      <AnimatedPath
        d={branch.d}
        fill="none"
        stroke={glowColor}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${branch.length} ${branch.length}`}
        animatedProps={glowProps}
      />
      <AnimatedPath
        d={branch.d}
        fill="none"
        stroke={inkWaxSeal.fissureCore}
        strokeWidth={1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${branch.length} ${branch.length}`}
        animatedProps={coreProps}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 18, gap: 10 },
  flapWrap: { position: 'absolute', top: 0, left: 0, right: 0, height: 110 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  flex: { flex: 1, minWidth: 0 },
  avatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hint: { marginTop: 1 },
  tierPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: inkRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sealCenter: { alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  hitArea: { width: SEAL_DISPLAY, height: SEAL_DISPLAY, alignItems: 'center', justifyContent: 'center' },
  sealBox: { width: SEAL_DISPLAY, height: SEAL_DISPLAY, alignItems: 'center', justifyContent: 'center' },
  creaseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  creaseLine: { flex: 1, height: StyleSheet.hairlineWidth },
  creaseText: { fontSize: 11, letterSpacing: 0.55, textTransform: 'uppercase' },
});
