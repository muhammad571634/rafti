import { Image, type ImageContentPosition } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { MicrophoneIcon } from 'phosphor-react-native/src/icons/Microphone';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { characterImage, PressableScale, Txt } from '@/components/ui';
import { daysBetween, relativeStamp } from '@/lib/format';
import { plainText, speechOnly } from '@/lib/reply-engine';
import { lastTalkedAt } from '@/lib/talk';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, gradients, gradientStops, radius, space } from '@/theme';
import type { Character, Conversation, Message, Relationship } from '@/types';

const HEIGHT = 300;
/** Hero scenes are framed with the face up and to the right of centre. */
const SCENE_FOCUS: ImageContentPosition = { left: '62%', top: '30%' };
/** Tall scenes (assets/portraits) keep the face in their upper third. */
const TALL_FOCUS: ImageContentPosition = { left: '50%', top: '18%' };
/** Portraits are square with the face in the upper middle. */
const PORTRAIT_FOCUS: ImageContentPosition = { left: '50%', top: '35%' };
const FOCUS = { scene: SCENE_FOCUS, tall: TALL_FOCUS, face: PORTRAIT_FOCUS } as const;
/** How far back their line may sit and still show: after a helpline card it waits a while. */
const RECENT = 8;

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
 * else), and when it came. None while a helpline card is among the last lines: a hard moment does
 * not belong on the home screen.
 */
export function waitingLine(messages: readonly Message[] | undefined): { text: string; at: string } | undefined {
  const list = messages ?? [];
  if (list.slice(-RECENT).some((m) => m.card === 'helpline')) return undefined;
  const line = list.findLast((m) => m.author === 'them' && m.kind === 'text' && !m.card && !!m.text?.trim());
  if (!line?.text) return undefined;
  const text = speechOnly(line.text) || plainText(line.text);
  return text ? { text, at: line.createdAt } : undefined;
}

/**
 * The friend waiting for you, Replika's feel inside our Today (owner, 2026-11-03): their picture,
 * name with days and level, their newest line in dark glass and a "Message" field under it. The
 * whole card is one button that opens the chat; the field is a cue, not a second control.
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

  return (
    <PressableScale
      style={styles.card}
      scaleTo={0.985}
      accessibilityLabel={[t('home.hero.open', { name }), t('home.hero.together', { count: days }), level, line?.text]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}>
      <Image
        source={typeof image === 'string' ? { uri: image } : image}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={FOCUS[framing]}
      />
      <LinearGradient colors={gradients.portraitCardScrim} locations={gradientStops.portraitCardScrim} style={StyleSheet.absoluteFill} />

      <View style={styles.top}>
        <Txt variant="smallStrong" color={colors.onMedia} lines={1} style={styles.shrink}>
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
        </View>
      </View>

      <View style={styles.bottom}>
        {line ? (
          <View style={styles.said}>
            <Txt variant="caption" color={colors.onMediaMuted} style={styles.when}>
              {relativeStamp(line.at)}
            </Txt>
            <View style={styles.bubble}>
              <Txt style={styles.lineText} color={colors.onMedia} lines={3}>
                {line.text}
              </Txt>
            </View>
          </View>
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
    height: HEIGHT,
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
    height: 24,
    paddingHorizontal: space.sm + 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
    backgroundColor: colors.onMediaGlass,
  },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.onMediaSoft },
  bottom: { position: 'absolute', left: space.md, right: space.md, bottom: space.md, gap: space.sm },
  said: { alignItems: 'flex-start', gap: 3 },
  when: { paddingLeft: space.xs },
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
  lineText: { fontSize: 15, lineHeight: 20, letterSpacing: -0.2 },
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
