import { useFocusEffect } from 'expo-router';
import { Image, type ImageContentPosition } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MicrophoneIcon } from 'phosphor-react-native/src/icons/Microphone';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { FACE_AT, sceneFocus } from '@/components/chat/chat-ground';
import { Anim, characterImage, PressableScale, Txt } from '@/components/ui';
import { plainText, speechOnly } from '@/lib/reply-engine';
import { lastTalkedAt } from '@/lib/talk';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, gradients, gradientStops, space } from '@/theme';
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

/** Room for Today's top row over the picture: 44 pt plus the room the wordmark's mascot rises into. */
const BAR = 56;
const BOTTOM_RADIUS = 32;
/**
 * The picture runs from the screen's top edge (the status bar and the top row sit on it) to the
 * screen's middle, on every phone (owner, 2026-11-08).
 */
export const heroTopHeight = (windowHeight: number) => Math.round(windowHeight / 2);
/** Their line's longest run for the room under the top row, so it never climbs into that row. */
const lineCap = (room: number) => (room >= 300 ? 4 : room >= 260 ? 3 : 2);

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
  const said = speechOnly(line.text);
  const text = /[\p{L}\p{N}]/u.test(said) ? said : plainText(line.text);
  return text ? { text, at: line.createdAt } : undefined;
}

/**
 * The friend waiting for you, Replika's feel inside our Today (owner, 2026-11-03): about half the
 * screen of their picture, still and lit for the user's hour; their name right on their newest
 * line, which sits in dark glass, typed in first while
 * it is unread; a "Message" field under it. The whole card is one button that opens the chat; the
 * field is a cue, not a second control. Reduce Motion: no typing.
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
  const { t } = useTranslation();
  const { character, relationship, conversation, image, framing } = friend;
  const messages = useAppStore((s) => s.messages[conversation.id]);
  const line = useMemo(() => waitingLine(messages), [messages]);
  const name = displayName(character, relationship);

  const { width, height: windowHeight } = useWindowDimensions();
  const height = heroTopHeight(windowHeight);
  const lines = lineCap(height - topInset - BAR);
  // A wide scene slides its face to FACE_AT; a tall or square one is drawn wider, centred there.
  const scene = framing === 'scene';
  const position = scene ? sceneFocus(character.id, width / height, FACE_AT) : FOCUS[framing];

  const still = useReducedMotion();
  const [hour, setHour] = useState(() => new Date().getHours());
  // The light is read again on each visit. The picture holds still: its slow "breath" (0z107) redrew
  // half the screen every frame while Today was open, 12-13 ms of GPU per frame on a Galaxy A51 with
  // nothing moving, so scrolls and tab switches missed their frames (0z131, owner: keep it still).
  useFocusEffect(useCallback(() => setHour(new Date().getHours()), []));
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
    <View style={[styles.card, { height }]}>
    <PressableScale
      style={StyleSheet.absoluteFill}
      scaleTo={1}
      accessibilityLabel={[t('home.hero.open', { name }), line?.text]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}>
      <Image
        source={typeof image === 'string' ? { uri: image } : image}
        style={scene ? StyleSheet.absoluteFill : [styles.wide, { width: width * WIDE }]}
        contentFit="cover"
        contentPosition={position}
      />
      {light !== 'day' ? <View style={[StyleSheet.absoluteFill, { backgroundColor: LIGHT[light] }]} /> : null}
      <LinearGradient colors={gradients.heroTopScrim} locations={gradientStops.heroTopScrim} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={gradients.heroSideScrim}
        locations={gradientStops.heroSideScrim}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.bottom}>
        {/* The name sits right on their line, the way a message is signed (owner, 2026-11-08: no days,
            level or time here). */}
        <Txt color={colors.onMedia} lines={1} style={styles.name}>
          {name}
        </Txt>
        {line && typing ? (
          <View style={styles.said}>
            <View style={[styles.bubble, styles.typing]}>
              <Anim name="typing" size={34} tint={colors.onMediaSoft} />
            </View>
          </View>
        ) : line ? (
          <Animated.View entering={FadeIn.duration(220)} style={styles.said}>
            <View style={styles.bubble}>
              <Txt style={styles.lineText} color={colors.onMedia} lines={lines}>
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
  name: { maxWidth: '72%', marginBottom: -2, fontSize: 30, lineHeight: 35, fontWeight: '800', letterSpacing: -0.6 },
  typing: { paddingVertical: 2 },
  bottom: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, gap: space.sm },
  said: { alignItems: 'flex-start' },
  // Their line as the chat draws it on their picture: dark glass, the tail at the bottom left.
  bubble: {
    maxWidth: '76%',
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
