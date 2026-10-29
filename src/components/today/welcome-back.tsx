import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, AppState, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRAND, BRAND_ASPECT } from '@/assets/brand/registry';
import { Anim, CharacterAvatar, glassStyle, Txt } from '@/components/ui';
import { awayAt, markWelcomed, openedFromNotification } from '@/lib/away-clock';
import { pickWelcome, shouldWelcome, welcomeLineKey } from '@/lib/welcome-back';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import type { Character } from '@/types';

const PEEK_W = 118;
const PEEK_H = PEEK_W / BRAND_ASPECT.peek;
/** Share of the peek art below the body's flat bottom: the paws that rest on the bar's edge. */
const PAW_DROP = (40 / 540) * PEEK_H;
/** Where the bubble starts, over the mascot's hair (as in sigmazam-motion/src/WelcomeBack.tsx). */
const BUBBLE_LEFT = 104;
/** Saved data and a notification tap both land in the first moments; decide after them. */
const SETTLE_MS = 600;
/** Timeline from the approved preview (ms after the decision). */
const RISE_AT = 500;
const POP_AT = 850;
const TEXT_AT = 1450;
const LEAVE_AT = 3300;
const SINK_AT = 3500;
const GONE_AT = 3900;

type Shown = { conversationId: string; character: Character; line: string };

const hiders = new Set<() => void>();
/** Today's scroll calls this: the greeting gets out of the way as soon as the user moves. */
export function hideWelcome() {
  hiders.forEach((hide) => hide());
}

/** Height from the screen's bottom to the tab bar's top edge (Android draws the bar in `(tabs)/_layout.tsx`). */
function barTop(insetBottom: number) {
  return Platform.OS === 'ios' ? insetBottom + 49 : insetBottom + space.md + 62;
}

/**
 * After the app has been away an hour or more (spec 2026-10-29-launch-motion-design.md), the
 * mascot rises from behind the tab bar and brings a line from the character you talked to last:
 * typing dots, then their unread message or a short welcome. Tap it to open that chat; anything
 * else passes through, and it leaves by itself in under 4 s. Today itself never waits for it.
 */
export function WelcomeBack() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const still = useReducedMotion();
  const hydrated = useAppStore((s) => s.hydrated);
  const rewardUp = useAppStore((s) => !!s.dailyReward);
  const [due, setDue] = useState<Shown | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [typed, setTyped] = useState(false);
  const focused = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      return () => {
        focused.current = false;
      };
    }, []),
  );

  const check = useCallback(async () => {
    const at = await awayAt();
    const now = Date.now();
    const s = useAppStore.getState();
    const pick = pickWelcome(s.conversations, (id) => s.characters.some((c) => c.id === id));
    const ok = shouldWelcome({ now, awayAt: at, onboarded: !!s.user.onboardedAt, fromNotification: openedFromNotification(), hasConversation: !!pick });
    if (!ok || !pick || !focused.current) return;
    const character = s.characters.find((c) => c.id === pick.characterId);
    if (!character) return;
    markWelcomed(now);
    setDue({ conversationId: pick.conversationId, character, line: pick.unreadLine ?? t(welcomeLineKey(now)) });
  }, [t]);

  // A cold launch, then every return from the background (not a pull of the control centre).
  useEffect(() => {
    if (!hydrated) return;
    const first = setTimeout(check, SETTLE_MS);
    let last = AppState.currentState;
    let later: ReturnType<typeof setTimeout> | undefined;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && last === 'background') later = setTimeout(check, SETTLE_MS);
      last = next;
    });
    return () => {
      clearTimeout(first);
      clearTimeout(later);
      sub.remove();
    };
  }, [hydrated, check]);

  // The day's check-in sheet goes first; the greeting follows once it is closed.
  useEffect(() => {
    if (due && !rewardUp) {
      setShown(due);
      setDue(null);
    }
  }, [due, rewardUp]);

  const rise = useSharedValue(PEEK_H + 12);
  const nod = useSharedValue(0);
  const pop = useSharedValue(0);
  const leave = useSharedValue(0);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (!shown) return;
    const hide = () => setShown(null);
    hiders.add(hide);
    setTyped(false);
    const timers = [setTimeout(() => setTyped(true), TEXT_AT), setTimeout(hide, GONE_AT)];
    const label = t('welcomeBack.a11y', { name: shown.character.name, line: shown.line });
    timers.push(setTimeout(() => AccessibilityInfo.announceForAccessibility(label), POP_AT));

    leave.value = 0;
    if (still) {
      // Reduce Motion: everything sits in place and fades in and out.
      rise.value = 0;
      nod.value = 0;
      pop.value = 1;
      fade.value = withSequence(withDelay(RISE_AT, withTiming(1, { duration: 250 })), withDelay(LEAVE_AT - RISE_AT - 250, withTiming(0, { duration: 300 })));
    } else {
      fade.value = 1;
      rise.value = withDelay(RISE_AT, withSpring(0, { damping: 11, stiffness: 170, mass: 0.8 }));
      // On a clock, not after the spring: a spring's settle time varies, the sink must not.
      timers.push(setTimeout(() => (rise.value = withTiming(PEEK_H + 12, { duration: 350, easing: Easing.in(Easing.cubic) })), SINK_AT));
      nod.value = withDelay(TEXT_AT, withSequence(withTiming(-6, { duration: 150 }), withTiming(4, { duration: 180 }), withTiming(0, { duration: 170 })));
      pop.value = 0;
      pop.value = withDelay(POP_AT, withSpring(1, { damping: 13, stiffness: 210, mass: 0.7 }));
      leave.value = withDelay(LEAVE_AT, withTiming(1, { duration: 250, easing: Easing.in(Easing.quad) }));
    }
    return () => {
      timers.forEach(clearTimeout);
      hiders.delete(hide);
    };
    // One run per greeting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  const peekStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: rise.value }, { rotate: `${nod.value}deg` }],
  }));
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.6) * (1 - leave.value) * fade.value,
    transform: [{ scale: (0.55 + 0.45 * pop.value) * (1 - 0.35 * leave.value) }],
  }));

  if (!shown) return null;
  const edge = barTop(insets.bottom) + PAW_DROP;
  const open = () => {
    setShown(null);
    router.push(`/chat/${shown.conversationId}`);
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* The clip's bottom is the bar's edge, so the mascot comes out from behind the bar. */}
      <View pointerEvents="none" style={[styles.clip, { bottom: edge }]}>
        <Animated.View style={[styles.peek, peekStyle]}>
          <Image source={BRAND.peek} style={StyleSheet.absoluteFill} contentFit="contain" />
        </Animated.View>
      </View>
      <Animated.View style={[styles.bubbleWrap, { bottom: edge + PEEK_H - 14, maxWidth: width - BUBBLE_LEFT - space.lg }, bubbleStyle]}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={t('welcomeBack.a11y', { name: shown.character.name, line: shown.line })}
          style={({ pressed }) => [styles.bubble, pressed && styles.pressed]}>
          <CharacterAvatar character={shown.character} size={38} />
          <View style={styles.words}>
            <Txt style={styles.name} lines={1}>
              {shown.character.name}
            </Txt>
            {typed ? (
              <Txt style={styles.line} lines={2}>
                {shown.line}
              </Txt>
            ) : (
              <Anim name="typing" size={30} tint={colors.textSecondary} />
            )}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', left: 26, width: PEEK_W, height: PEEK_H + 24, overflow: 'hidden' },
  peek: { position: 'absolute', left: 0, bottom: 0, width: PEEK_W, height: PEEK_H, transformOrigin: '50% 100%' },
  bubbleWrap: { position: 'absolute', left: BUBBLE_LEFT, transformOrigin: '0% 100%' },
  bubble: {
    ...glassStyle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 22,
  },
  pressed: { opacity: 0.85 },
  words: { flexShrink: 1, minHeight: 39, justifyContent: 'center' },
  // HIG Typography: Footnote 13/18 for who, Callout 16/21 for what they say.
  name: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.textSecondary },
  line: { fontSize: 16, lineHeight: 21, fontWeight: '500', color: colors.text },
});
