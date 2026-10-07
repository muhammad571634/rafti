import { Image, type ImageContentPosition } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ChatCircleDotsIcon } from 'phosphor-react-native/src/icons/ChatCircleDots';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { HEROES } from '@/assets/heroes/registry';
import { characterImage, PressableScale, Txt } from '@/components/ui';
import { daysBetween } from '@/lib/format';
import { displayName } from '@/store/use-app-store';
import { colors, gradients, gradientStops, radius, space } from '@/theme';
import type { Character, Conversation, Relationship } from '@/types';

const HEIGHT = 204;
const ACTION = 44;
/** Hero scenes are framed with the face up and to the right of centre. */
const SCENE_FOCUS: ImageContentPosition = { left: '62%', top: '30%' };
/** Portraits are square with the face in the upper middle. */
const PORTRAIT_FOCUS: ImageContentPosition = { left: '50%', top: '35%' };

export interface HeroFriend {
  character: Character;
  relationship: Relationship;
  conversation: Conversation;
  /** A wide scene from assets/heroes, else the portrait. */
  image: string | number;
  scene: boolean;
}

/**
 * The friend the Today hero features: the closest bond that has a hero scene, else
 * the closest bond with a portrait. A friend is a character you have a bond and a
 * chat with, the same rule as the Us tab. Undefined when there is no one to show.
 */
export function featuredFriend(
  characters: Character[],
  relationships: Record<string, Relationship>,
  conversations: Conversation[],
): HeroFriend | undefined {
  const friends = characters
    .flatMap((character) => {
      const relationship = relationships[character.id];
      const conversation = conversations.find((c) => c.characterId === character.id);
      return relationship && conversation ? [{ character, relationship, conversation }] : [];
    })
    .sort((a, b) => b.relationship.intimacy - a.relationship.intimacy);

  const withScene = friends.find((f) => HEROES[f.character.id] != null);
  if (withScene) return { ...withScene, image: HEROES[withScene.character.id], scene: true };

  for (const friend of friends) {
    const portrait = characterImage(friend.character);
    if (portrait != null) return { ...friend, image: portrait, scene: false };
  }
  return undefined;
}

/**
 * The closest friend in their own world: name, days together and bond level, nothing
 * more. The whole card is one button that opens the chat; the round
 * chat mark is a visual cue inside it, not a second control.
 */
export function TodayHero({
  friend,
  onPress,
}: {
  friend: HeroFriend;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { character, relationship, image, scene } = friend;
  const name = displayName(character, relationship);
  // Counted like the Us tab: the day you met is day 1.
  const days = daysBetween(relationship.anniversary) + 1;
  const level = t('home.hero.level', { level: relationship.level });

  return (
    <PressableScale
      style={styles.card}
      scaleTo={0.985}
      accessibilityLabel={[t('home.hero.open', { name }), t('home.hero.together', { count: days }), level].join(', ')}
      onPress={onPress}>
      <Image
        source={typeof image === 'string' ? { uri: image } : image}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={scene ? SCENE_FOCUS : PORTRAIT_FOCUS}
      />
      <LinearGradient
        colors={gradients.heroScrim}
        locations={gradientStops.heroScrim}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.copy}>
        <Txt variant="smallStrong" color={colors.onMediaSoft} lines={1}>
          {name}
        </Txt>
        <View style={styles.daysLine}>
          <Txt variant="heroFigure" color={colors.onMedia}>
            {days}
          </Txt>
          <Txt variant="heroUnit" color={colors.onMedia}>
            {t('home.hero.days', { count: days })}
          </Txt>
        </View>
        <View style={[styles.glass, styles.level]}>
          <HeartIcon size={13} color={colors.bondOnMedia} weight="fill" />
          <Txt variant="chip" color={colors.onMedia} lines={1} style={styles.shrink}>
            {level}
          </Txt>
        </View>
      </View>

      <View style={styles.action}>
        <ChatCircleDotsIcon size={22} color={colors.text} weight="regular" />
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
  glass: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs + 1,
    height: 26,
    paddingHorizontal: space.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.onMediaHairline,
    backgroundColor: colors.onMediaGlass,
  },
  shrink: { flexShrink: 1 },
  copy: {
    position: 'absolute',
    left: space.lg + 2,
    bottom: space.lg,
    // Leaves the round chat mark its own corner.
    right: space.lg + ACTION + space.md,
    gap: 2,
  },
  daysLine: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  level: { marginTop: space.sm, maxWidth: '100%' },
  action: {
    position: 'absolute',
    right: space.md + 2,
    bottom: space.md + 2,
    width: ACTION,
    height: ACTION,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.onMediaButton,
  },
});
