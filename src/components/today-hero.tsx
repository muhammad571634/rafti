import { useFocusEffect } from 'expo-router';
import { Image, type ImageContentPosition } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
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

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { FACE_AT, portraitOf, sceneFocus, stretchLeft } from '@/components/chat/chat-ground';
import { InkText } from '@/components/ink';
import { Anim, characterImage, PressableScale } from '@/components/ui';
import { useDayKey } from '@/hooks/use-day-key';
import { messageSpeech, plainText } from '@/lib/reply-engine';
import { lastTalkedAt } from '@/lib/talk';
import { awakeAt, freshDayNote } from '@/lib/today';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, gradients, gradientStops, space, systemColors } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';
import type { Character, Conversation, Message, Relationship } from '@/types';

/** A tall or square picture has no width to slide: it is drawn this much wider than the card instead (`FACE_AT`). */
const WIDE = 2 * FACE_AT;
/** Tall scenes (assets/portraits) keep the face in their upper third. */
const TALL_FOCUS: ImageContentPosition = { left: '50%', top: '18%' };
/** Portraits are square with the face in the upper middle. */
const PORTRAIT_FOCUS: ImageContentPosition = { left: '50%', top: '35%' };
/** Wide scenes slide to each face (`sceneFocus`); this is only their fallback. */
const FOCUS = { scene: { left: '62%', top: '30%' }, tall: TALL_FOCUS, face: PORTRAIT_FOCUS } as const;
/** Lines before theirs that a helpline card may sit in and still hold the card back. */
const BEFORE = 4;
/** Their unread line types in once a session, as if said now. */
const TYPING_MS = 1400;
const typedIn = new Set<string>();
/**
 * One slow breath of the picture each time Today comes into view (audit §8.2.1: the one living
 * thing on the screen): 1.8 % larger and a few points over, then back, and still after that. An
 * endless breath cost 12-13 ms of GPU per frame on a Galaxy A51 (0z131), so it never loops.
 */
const BREATH_MS = 4500;
const BREATH_DELAY = 700;
const BREATH_SCALE = 0.018;

/** Room for Today's top row over the picture: 44 pt plus the room the wordmark's mascot rises into. */
const BAR = 56;
const BOTTOM_RADIUS = 32;
/**
 * The picture runs from the screen's top edge (the status bar and the top row sit on it) to the
 * screen's middle, on every phone (owner, 2026-11-08).
 */
export const heroTopHeight = (windowHeight: number) => Math.round(windowHeight / 2);
/** Their line's longest run for the room under the top row, so it never climbs into that row. */
const lineCap = (room: number) => (room >= 260 ? 3 : 2);

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

type FeaturedInputs = {
  characters: Character[];
  relationships: Record<string, Relationship>;
  conversations: Conversation[];
  messages: Record<string, Message[]>;
};
let featured: { inputs: FeaturedInputs; friend: HeroFriend | undefined } | undefined;

/**
 * `featuredFriend` for a store state, worked out once per change of its four inputs however many
 * parts of Today ask (the hero, the Calls, Photos and Bond widgets). Use it as a store selector.
 */
export function featuredFriendOf(s: FeaturedInputs): HeroFriend | undefined {
  const last = featured?.inputs;
  if (
    featured &&
    last &&
    last.characters === s.characters &&
    last.relationships === s.relationships &&
    last.conversations === s.conversations &&
    last.messages === s.messages
  ) {
    return featured.friend;
  }
  const friend = featuredFriend(s.characters, s.relationships, s.conversations, s.messages);
  featured = {
    inputs: { characters: s.characters, relationships: s.relationships, conversations: s.conversations, messages: s.messages },
    friend,
  };
  return friend;
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
  const said = messageSpeech(line);
  const text = /[\p{L}\p{N}]/u.test(said) ? said : plainText(line.text);
  return text ? { text, at: line.createdAt } : undefined;
}

/**
 * The friend waiting for you, Replika's feel inside our Today (owner, 2026-11-03): about half the
 * screen of their picture, still and lit for the user's hour; their name right on their newest
 * line, which sits in dark glass, typed in first while
 * it is unread; a round reply glyph beside it. The whole card is one button that opens the chat; the
 * glyph is a cue, not a second control. Reduce Motion: no typing.
 */
export function TodayHero({
  friend,
  header,
  topInset = 0,
  onPress,
}: {
  friend: HeroFriend;
  /** Today's top row (wordmark, your capsule), laid over the picture's top like glass. */
  header?: ReactNode;
  /** The status bar's height: the picture runs up under it. */
  topInset?: number;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { character, relationship, conversation, image, framing } = friend;
  const messages = useAppStore((s) => s.messages[conversation.id]);
  const line = useMemo(() => waitingLine(messages), [messages]);
  const name = displayName(character, relationship);

  const { width, height: windowHeight } = useWindowDimensions();
  const height = heroTopHeight(windowHeight);
  const lines = lineCap(height - topInset - BAR);
  // A wide scene slides its face to FACE_AT; a tall or square one is drawn wider, centred there.
  const scene = framing === 'scene';
  // A tall painting is framed on its own face (each one puts it elsewhere), drawn only as wide as that needs.
  const tall = framing === 'tall' ? portraitOf(character, width / height, FACE_AT) : undefined;
  const position = scene ? sceneFocus(character.id, width / height, FACE_AT) : (tall?.position ?? FOCUS[framing]);
  const stretch = scene ? 1 : (tall?.stretch ?? WIDE);
  const left = stretchLeft(width, stretch, FACE_AT, tall?.faceX);

  const still = useReducedMotion();
  const [hour, setHour] = useState(() => new Date().getHours());
  // The light is read again on each visit. The picture holds still: its slow "breath" (0z107) redrew
  // half the screen every frame while Today was open, 12-13 ms of GPU per frame on a Galaxy A51 with
  // nothing moving, so scrolls and tab switches missed their frames (0z131, owner: keep it still).
  const breath = useSharedValue(0);
  useFocusEffect(
    useCallback(() => {
      setHour(new Date().getHours());
      if (!still) {
        const ease = { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) };
        breath.value = withDelay(BREATH_DELAY, withSequence(withTiming(1, ease), withTiming(0, ease)));
      }
      return () => {
        cancelAnimation(breath);
        breath.value = 0;
      };
    }, [still, breath]),
  );
  const breathing = useAnimatedStyle(() => ({
    transform: [{ translateX: -3 * breath.value }, { translateY: -2 * breath.value }, { scale: 1 + BREATH_SCALE * breath.value }],
  }));
  const light = dayLight(hour);

  // Presence (audit §8.2.1): what they said they are doing, if it is fresh; their notes are kept in
  // English (0z187), so another app language gets the plain awake / asleep line instead.
  const today = useDayKey();
  const awake = awakeAt(hour);
  const doing = useMemo(
    () => (i18n.language.startsWith('en') ? freshDayNote(relationship.ownDay, today, Date.now()) : undefined),
    // `hour` re-reads it on each visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [relationship.ownDay, today, hour, i18n.language],
  );
  const status = doing ?? t(awake ? 'home.presence.awake' : 'home.presence.asleep');

  const lineKey = line ? `${conversation.id}|${line.at}` : undefined;
  const fresh = !!lineKey && conversation.unreadCount > 0 && !still && !typedIn.has(lineKey);
  const [typing, setTyping] = useState(fresh);
  // The line fades in only after it was typed; otherwise it is simply there. A layout `entering`
  // fade here stuck at 0 on a cold start on the A51, leaving an empty gap under the name (audit §10).
  const shown = useSharedValue(fresh ? 0 : 1);
  useEffect(() => {
    if (typing) shown.value = 0;
    else shown.value = still ? 1 : withTiming(1, { duration: 220 });
  }, [typing, still, shown]);
  const fade = useAnimatedStyle(() => ({ opacity: shown.value }));
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
    <View style={[styles.card, { height }]}>
    <PressableScale
      style={StyleSheet.absoluteFill}
      scaleTo={1}
      accessibilityLabel={[
        conversation.unreadCount > 0 ? t('a11y.unreadTab', { label: t('home.hero.open', { name }), count: conversation.unreadCount }) : t('home.hero.open', { name }),
        status,
        line?.text,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}>
      <Animated.View style={[StyleSheet.absoluteFill, breathing]} renderToHardwareTextureAndroid>
        <Image
          source={typeof image === 'string' ? { uri: image } : image}
          style={stretch > 1 ? [styles.wide, { width: width * stretch, left }] : StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={position}
        />
      </Animated.View>
      {light !== 'day' ? <View style={[StyleSheet.absoluteFill, { backgroundColor: LIGHT[light] }]} /> : null}
      <LinearGradient colors={gradients.heroTopScrim} locations={gradientStops.heroTopScrim} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={gradients.heroSideScrim}
        locations={gradientStops.heroSideScrim}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Two words on the picture and no more (owner, 2026-11-16, HIG Widgets: "replacing text with
          graphics"): their name with a green dot while they are awake, and their newest line. The hour
          shows in the picture's light, the way in by the round reply glyph; the whole card is the button. */}
      <View style={styles.bottom}>
        <View style={styles.words}>
          <View style={styles.nameRow}>
            <InkText variant="title" color={colors.onMedia} lines={1} style={styles.name}>
              {name}
            </InkText>
            {awake ? <View style={styles.dot} /> : null}
          </View>
          {line && typing ? (
            <View style={styles.said}>
              <View style={[styles.bubble, styles.typing]}>
                <Anim name="typing" size={34} tint={colors.onMediaSoft} />
              </View>
            </View>
          ) : line ? (
            <Animated.View style={[styles.said, fade]}>
              <View style={styles.bubble}>
                <InkText color={colors.onMedia} lines={lines}>
                  {line.text}
                </InkText>
              </View>
            </Animated.View>
          ) : null}
        </View>
        <View style={styles.reply}>
          <Ionicons name="chatbubble" size={20} color={colors.onMedia} />
          {/* How many of their messages wait, as the app icon's badge says it: a number, no words. */}
          {conversation.unreadCount > 0 ? (
            <View style={styles.unread}>
              <InkText variant="caption" color={ink.onAccent}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </InkText>
            </View>
          ) : null}
        </View>
      </View>
    </PressableScale>
      {header ? (
        <View style={[styles.header, { top: topInset }]} pointerEvents="box-none">
          {header}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Full width from the screen's top edge, rounded only where Today's modules begin.
  card: {
    borderBottomLeftRadius: BOTTOM_RADIUS,
    borderBottomRightRadius: BOTTOM_RADIUS,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  header: { position: 'absolute', left: 0, right: 0 },
  wide: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  // The leading side: the friend keeps the trailing side clear; the name hugs their line.
  bottom: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  words: { flex: 1, minWidth: 0, gap: space.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { flexShrink: 1, maxWidth: '86%' },
  // Presence as a mark, not words (audit §8.2.1): green in their waking hours.
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: systemColors.green, borderWidth: 1.5, borderColor: colors.onMediaRim },
  typing: { paddingVertical: 2 },
  said: { alignItems: 'flex-start' },
  // Their line as the chat draws it on their picture: dark glass, the tail at the bottom left.
  bubble: {
    maxWidth: '94%',
    paddingHorizontal: 13,
    paddingVertical: space.sm,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
    backgroundColor: ink.photoGlass,
  },
  unread: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.accent,
  },
  // A round frosted glass glyph, 44 pt (HIG: touch target), where the "Message" field was.
  reply: {
    width: 44,
    height: 44,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
    backgroundColor: ink.photoGlass,
  },
});
