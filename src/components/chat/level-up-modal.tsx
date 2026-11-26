import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { InkText } from '@/components/ink';
import { CharacterAvatar, PressableScale, Sheet } from '@/components/ui';
import { phrase } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { createHeartbeatSound } from '@/lib/heartbeat-sound';
import type { LevelUpEvent } from '@/store/use-app-store';
import { friendAccent, space } from '@/theme';
import { ink, inkPeachGlass, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

const RING = 112;
const AVATAR = 94;

export interface LevelUpModalProps {
  event: LevelUpEvent | null;
  character?: Character;
  characterName: string;
  onClose: () => void;
}

/**
 * Fallback level-up card (builds without Skia / web) in the Ink Night+ heartbeat look:
 * friend portrait or heart emblem inside concentric double-heartbeat ("lub-dub") ripple rings,
 * tactile double-beat haptic + warm audio, serif title, and brand-peach continue pill.
 */
export function LevelUpModal({ event, character, characterName, onClose }: LevelUpModalProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const accent = character ? friendAccent(character.id).strong : ink.accent;
  const accentSoft = character ? friendAccent(character.id).soft : ink.tintFill;

  const pulse = useSharedValue(1);
  const ripple1 = useSharedValue(0);
  const ripple2 = useSharedValue(0);

  useEffect(() => {
    if (!event) return;
    const sound = createHeartbeatSound();
    sound.play();
    const cancelHb = haptic.heartbeat();

    if (!reduced) {
      pulse.value = withSequence(
        withTiming(1.07, { duration: 110, easing: Easing.out(Easing.quad) }),
        withTiming(0.99, { duration: 100, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.11, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
      );
      ripple1.value = 0;
      ripple2.value = 0;
      ripple1.value = withTiming(1, { duration: 950, easing: Easing.out(Easing.cubic) });
      ripple2.value = withDelay(210, withTiming(1, { duration: 1050, easing: Easing.out(Easing.cubic) }));
    }

    return () => {
      cancelHb();
      sound.dispose();
      cancelAnimation(pulse);
      cancelAnimation(ripple1);
      cancelAnimation(ripple2);
    };
  }, [event, reduced, pulse, ripple1, ripple2]);

  const portraitStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));
  const ripple1Style = useAnimatedStyle(() => ({
    opacity: reduced ? 0 : (1 - ripple1.value) * 0.72,
    transform: [{ scale: 0.92 + ripple1.value * 0.88 }],
  }));
  const ripple2Style = useAnimatedStyle(() => ({
    opacity: reduced ? 0 : (1 - ripple2.value) * 0.54,
    transform: [{ scale: 0.92 + ripple2.value * 1.08 }],
  }));

  return (
    <Sheet visible={!!event} onClose={onClose} center>
      <View style={styles.card}>
        <View style={styles.emblem}>
          <Animated.View pointerEvents="none" style={[styles.ripple, { borderColor: accent }, ripple1Style]} />
          <Animated.View pointerEvents="none" style={[styles.ripple, { borderColor: accent }, ripple2Style]} />
          <Animated.View style={[styles.ring, { borderColor: accent, backgroundColor: accentSoft }, portraitStyle]}>
            {character ? (
              <CharacterAvatar character={character} size={AVATAR} />
            ) : (
              <Ionicons name="heart" size={40} color={accent} />
            )}
          </Animated.View>
        </View>

        {event ? (
          <View style={[styles.badge, { backgroundColor: accentSoft, borderColor: accent }]}>
            <InkText variant="caption" color={ink.text} style={styles.tabular}>
              {t('levelUp.levelLabel', { level: event.level, title: phrase(event.levelTitle) })}
            </InkText>
          </View>
        ) : null}

        <InkText variant="title" center>
          {t('levelUp.closer', { name: characterName })}
        </InkText>

        <InkText variant="sub" color={ink.text2} center style={styles.subtitle}>
          {t('levelUp.subtitle', { name: characterName })} {t('levelUp.unlocked')}
        </InkText>

        <PressableScale
          onPress={() => {
            haptic.tap();
            onClose();
          }}
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.continue')}
          style={styles.cta}>
          <LinearGradient colors={inkPeachGlass.ctaFill} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <InkText variant="bodyStrong" color={inkPeachGlass.ctaText}>
            {t('onboarding.continue')}
          </InkText>
        </PressableScale>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: space.md,
    paddingTop: space.xl,
    paddingBottom: space.md,
    paddingHorizontal: space.md,
  },
  emblem: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  ripple: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
  },
  ring: {
    width: AVATAR + 10,
    height: AVATAR + 10,
    borderRadius: (AVATAR + 10) / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: inkRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabular: { fontVariant: ['tabular-nums'] },
  subtitle: {
    maxWidth: 280,
  },
  cta: {
    alignSelf: 'stretch',
    height: 50,
    marginTop: space.sm,
    borderRadius: inkRadius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: inkPeachGlass.ctaRim,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
