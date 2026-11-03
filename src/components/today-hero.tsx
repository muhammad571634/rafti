import { useFocusEffect } from 'expo-router';
import { Image, type ImageContentPosition } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { MicrophoneIcon } from 'phosphor-react-native/src/icons/Microphone';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { sceneFocus } from '@/components/chat/chat-ground';
import { Anim, characterImage, PressableScale, Txt } from '@/components/ui';
import { daysBetween, relativeStamp } from '@/lib/format';
import { plainText, speechOnly } from '@/lib/reply-engine';
import { lastTalkedAt } from '@/lib/talk';
import { levelForIntimacy } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, gradients, gradientStops, radius, space } from '@/theme';
import type { Character, Conversation, Message, Relationship } from '@/types';

/** About half the screen (owner, 2026-11-03: bigger, like Replika), so the modules still start on it. */
const SHARE = 0.54;
const MIN_HEIGHT = 380;
const MAX_HEIGHT = 520;
/** Tall scenes (assets/portraits) keep the face in their upper third. */
const TALL_FOCUS: ImageContentPosition = { left: '50%', top: '18%' };
/** Portraits are square with the face in the upper middle. */
const PORTRAIT_FOCUS: ImageContentPosition = { left: '50%', top: '35%' };
/** Wide scenes slide to each face (`sceneFocus`); this is only their fallback. */
const FOCUS = { scene: { left: '62%', top: '30%' }, tall: TALL_FOCUS, face: PORTRAIT_FOCUS } as const;
/** Lines before theirs that a helpline card may sit in and still hold the card back. */
const BEFORE = 4;
/** One slow breath of the picture, in and then out: the friend is there, not a poster. */
const BREATH_MS = 7000;
const BREATH_SCALE = 1.045;
/** Their unread line types in once a session, as if said now. */
const TYPING_MS = 1400;
const typedIn = new Set<string>();

/** The card's height for a screen this tall. */
export const heroHeight = (windowHeight: number) => Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, windowHeight * SHARE)));

/** The light over their picture follows the user's hour, the way Replika's room does. */
export function dayLight(hour: number): 'dawn' | 'day' | 'evening' | 'night' {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}
const LIGHT = { dawn: colors.heroDawn, evening: colors.heroEvening, night: colors.heroNight } as const;

export interface HeroFriend {
  character: Character;
  relationship: Relationship;
  conversation: Conversation;
  /** A wide scene from assets/heroes, a tall one from assets/portraits, else the portrait. */
  image: string | number;
  framing: keyof typeof FOCUS;
}

/**
 * The friend the Today hero features: the one you talked with last (docs/today-hero.md).
 * Before your first conversation it is the closest bond. A friend is a character you
 * have a bond and a chat with, the same rule as the Us tab. The picture is their wide
 * scene, else their tall one, else their portrait. Undefined when there is no one to show.
 */
export function featuredFriend(
  characters: Character[],
  relationships: Record<string, Relationship>,
  conversations: Conversation[],
  messages: Record<string, Message[]>,
): HeroFriend | undefined {
  const friends = characters
    .flatMap((character) => {
      const relationship = relationships[character.id];
      const conversation = conversations.find((c) => c.characterId === character.id);
      if (!relationship || !conversation) return [];
      return [{ character, relationship, conversation, talkedAt: lastTalkedAt(messages[conversation.id]) }];
    })
    .sort((a, b) => b.talkedAt - a.talkedAt || b.relationship.intimacy - a.relationship.intimacy);

  for (const { talkedAt: _, ...friend } of friends) {
    const scene = HEROES[friend.character.id];
    if (scene != null) return { ...friend, image: scene, framing: 'scene' };
    const tall = PORTRAITS[friend.character.id];
    if (tall != null) return { ...friend, image: tall, framing: 'tall' };
    const portrait = characterImage(friend.character);
    if (portrait != null) return { ...friend, image: portrait, framing: 'face' };
  }
  return undefined;
}

/**
 * Their newest written line for the card, as said out loud (narration only when there is nothing
 * else), and when it came. None when a helpline card sits near it or after it: a hard moment does
 * not belong on the home screen.
 */
export function waitingLine(messages: readonly Message[] | undefined): { text: string; at: string } | undefined {
  const list = messages ?? [];
  // A muted line is an echo of the user's own words, not theirs.
  const at = list.findLastIndex((m) => m.author === 'them' && m.kind === 'text' && !m.card && !m.muted && !!m.text?.trim());
  const line = list[at];
  if (!line?.text) return undefined;
  if (list.slice(Math.max(0, at - BEFORE)).some((m) => m.card === 'helpline')) return undefined;
  // "*smiles* ..." says nothing aloud: then the narration, without its asterisks.
  const said = speechOnly(line.text);
  const text = /[\p{L}\p{N}]/u.test(said) ? said : plainText(line.text);
  return text ? { text, at: line.createdAt } : undefined;
}

/**
 * The friend waiting for you, Replika's feel inside our Today (owner, 2026-11-03): about half the
 * screen of their picture, breathing slowly and lit for the user's hour; name with days and level
 * (the bond's progress as a line under it); their newest line in dark glass, typed in first while
 * it is unread; a "Message" field under it. The whole card is one button that opens the chat; the
 * field is a cue, not a second control. Reduce Motion: no breath, no typing.
 */
export function TodayHero({
  friend,
  onPress,
}: {
  friend: HeroFriend;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { character, relationship, conversation, image, framing } = friend;
  const messages = useAppStore((s) => s.messages[conversation.id]);
  const line = useMemo(() => waitingLine(messages), [messages]);
  const name = displayName(character, relationship);
  // Counted like the Us tab: the day you met is day 1.
  const days = daysBetween(relationship.anniversary) + 1;
  const together = `${days} ${t('home.hero.days', { count: days })}`;
  const level = t('home.hero.level', { level: relationship.level });
  const progress = levelForIntimacy(relationship.intimacy).progress;

  const { width, height: windowHeight } = useWindowDimensions();
  const height = heroHeight(windowHeight);
  const position = framing === 'scene' ? sceneFocus(character.id, (width - space.lg * 2) / height) : FOCUS[framing];

  const still = useReducedMotion();
  const breath = useSharedValue(0);
  const [hour, setHour] = useState(() => new Date().getHours());
  // Breathes only while Today is on screen; the light is read again on each visit.
  useFocusEffect(
    useCallback(() => {
      setHour(new Date().getHours());
      if (still) return;
      breath.value = withRepeat(withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }), -1, true);
      return () => cancelAnimation(breath);
    }, [still, breath]),
  );
  const breathing = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * (BREATH_SCALE - 1) }] }));
  const light = dayLight(hour);

  const lineKey = line ? `${conversation.id}|${line.at}` : undefined;
  const fresh = !!lineKey && conversation.unreadCount > 0 && !still && !typedIn.has(lineKey);
  const [typing, setTyping] = useState(fresh);
  useEffect(() => {
    if (!fresh || !lineKey) return;
    setTyping(true);
    const timer = setTimeout(() => {
      typedIn.add(lineKey);
      setTyping(false);
    }, TYPING_MS);
    return () => clearTimeout(timer);
  }, [fresh, lineKey]);

  return (
    <PressableScale
      style={[styles.card, { height }]}
      scaleTo={0.985}
      accessibilityLabel={[t('home.hero.open', { name }), t('home.hero.together', { count: days }), level, line?.text]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}>
      <Animated.View style={[StyleSheet.absoluteFill, breathing]}>
        <Image
          source={typeof image === 'string' ? { uri: image } : image}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={position}
        />
      </Animated.View>
      {light !== 'day' ? <View style={[StyleSheet.absoluteFill, { backgroundColor: LIGHT[light] }]} /> : null}
      <LinearGradient colors={gradients.portraitCardScrim} locations={gradientStops.portraitCardScrim} style={StyleSheet.absoluteFill} />

      <View style={styles.top}>
        <Txt variant="bodyStrong" color={colors.onMedia} lines={1} style={styles.shrink}>
          {name}
        </Txt>
        <View style={styles.chip}>
          <Txt variant="chip" color={colors.onMedia} lines={1}>
            {together}
          </Txt>
          <View style={styles.dot} />
          <HeartIcon size={12} color={colors.bondOnMedia} weight="fill" />
          <Txt variant="chip" color={colors.onMedia} lines={1}>
            {level}
          </Txt>
          {/* How far to the next level, Replika's bar in a hairline. */}
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.bottom}>
        {line && typing ? (
          <View style={styles.said}>
            <View style={[styles.bubble, styles.typing]}>
              <Anim name="typing" size={34} tint={colors.onMediaSoft} />
            </View>
          </View>
        ) : line ? (
          <Animated.View entering={FadeIn.duration(220)} style={styles.said}>
            <Txt variant="caption" color={colors.onMediaMuted} style={styles.when}>
              {relativeStamp(line.at)}
            </Txt>
            <View style={styles.bubble}>
              <Txt style={styles.lineText} color={colors.onMedia} lines={4}>
                {line.text}
              </Txt>
            </View>
          </Animated.View>
        ) : null}
        <View style={styles.field}>
          <Txt style={styles.fieldText} color={colors.onMediaMuted} lines={1}>
            {t('chat.inputPlaceholder')}
          </Txt>
          <MicrophoneIcon size={19} color={colors.onMediaSoft} />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.lg,
    marginTop: space.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  shrink: { flexShrink: 1 },
  top: {
    position: 'absolute',
    top: space.md + 2,
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  // Clear glass on the photo (HIG Materials: the clear variant is for rich media).
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: 26,
    paddingHorizontal: space.sm + 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
    backgroundColor: colors.onMediaGlass,
    overflow: 'hidden',
  },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.onMediaSoft },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.onMediaHairline,
  },
  fill: { height: 2, backgroundColor: colors.bondOnMedia },
  typing: { paddingVertical: 2 },
  bottom: { position: 'absolute', left: space.md, right: space.md, bottom: space.md, gap: space.sm },
  said: { alignItems: 'flex-start', gap: 3 },
  when: { paddingLeft: space.xs, textShadowColor: colors.onMediaShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  // Their line as the chat draws it on their picture: dark glass, the tail at the bottom left.
  bubble: {
    maxWidth: '86%',
    paddingHorizontal: 13,
    paddingVertical: space.sm,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
    backgroundColor: colors.onMediaBubble,
  },
  lineText: { fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  field: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: space.lg,
    paddingRight: space.md,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
    backgroundColor: colors.onMediaField,
  },
  fieldText: { flex: 1, fontSize: 15 },
});
