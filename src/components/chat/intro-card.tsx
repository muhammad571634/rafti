import type { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { characterImage, PressableScale, SFIcon, Txt } from '@/components/ui';
import { phrase } from '@/i18n';
import { localCharacter } from '@/i18n/content';
import { heightLabel } from '@/lib/character-facts';
import { colors, space, systemColors } from '@/theme';
import type { ArcBeat, Character } from '@/types';

/** The card's own night: the photo fades into it, as the hero scrims do (`gradients.heroScrim`). */
const NIGHT = 'rgb(24,22,38)';
const FADE = ['rgba(24,22,38,0)', 'rgba(24,22,38,0.55)', NIGHT] as const;
const PHOTO = 280;

/** An SF Symbol on iPhone and its Ionicon elsewhere (`SFIcon`). */
type Glyph = { ios: SFSymbol; icon: keyof typeof Ionicons.glyphMap };
type Fact = Glyph & { key: string; label: string };

/**
 * Who they are, at the very top of a one-to-one chat (owner, 2026-10-27, after Character.AI shows
 * the character before its first message): their scene fading into a dark card, name, tagline,
 * who they are in their world and what the two of you are (Character.AI's tags, 2026-11-03),
 * gender, age, height and world as clear-glass chips, their story, what they love and can't
 * stand, then the story that opens with the bond: a beat's title once its level is reached, a
 * lock and the level before that (`world-story.ts`; the secret itself only comes up in the chat).
 * The facts come from `src/mock/character-profiles.ts` and `character-stories.ts` (or the
 * creator's form); a character without them still shows the photo, name and bio. A tap opens
 * the profile.
 */
export function IntroCard({
  character,
  name,
  locale,
  level = 1,
  onPress,
}: {
  character: Character;
  /** What the user calls them (nickname or name). */
  name: string;
  locale: string;
  /** The bond level, which opens their story beat by beat. */
  level?: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const shown = localCharacter(character);
  const scene = HEROES[character.id];
  // The tall scenes (owner's art, 2026-11-03) stand in for a wide one, framed from the top.
  const tall = scene == null ? PORTRAITS[character.id] : undefined;
  const photo = scene ?? tall ?? characterImage(character);
  const who: Fact[] = [];
  const role = shown.relation ?? shown.worldRole;
  if (role) who.push({ key: 'role', ios: 'person.text.rectangle', icon: 'id-card-outline', label: role });
  if (character.trope) who.push({ key: 'dynamic', ios: 'person.2', icon: 'people-outline', label: t(`world.tropes.${character.trope}`) });
  const facts: Fact[] = [];
  // One glyph for both, the word says which: SF Symbols draws a woman only from iOS 18.
  if (character.gender) facts.push({ key: 'gender', ios: 'person', icon: 'person-outline', label: t(`intro.${character.gender}`) });
  if (character.age) facts.push({ key: 'age', ios: 'birthday.cake', icon: 'gift-outline', label: t('intro.age', { count: character.age }) });
  if (character.heightCm) facts.push({ key: 'height', ios: 'ruler', icon: 'resize-outline', label: heightLabel(character.heightCm, locale) });
  if (character.series) facts.push({ key: 'world', ios: 'globe', icon: 'globe-outline', label: phrase(character.series) });

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('intro.open', { name })}
      style={styles.card}>
      {photo ? (
        <View style={styles.photo}>
          <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={tall != null ? 'top' : 'center'} transition={150} accessible={false} />
          <LinearGradient colors={FADE} locations={[0.35, 0.7, 1]} style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
      <View style={[styles.body, photo ? styles.overPhoto : null]}>
        <View style={styles.nameRow}>
          <Txt style={styles.name} color={colors.onMedia} lines={1}>
            {name}
          </Txt>
          {/* Store rule: an AI character is marked as one. */}
          <View style={styles.aiMark}>
            <Txt style={styles.aiText} color={colors.onMedia}>
              {t('safety.ai')}
            </Txt>
          </View>
        </View>
        {shown.tagline ? (
          <Txt style={styles.tagline} color={colors.onMediaSoft}>
            {shown.tagline}
          </Txt>
        ) : null}
        <Chips facts={who} />
        <Chips facts={facts} />
        <Txt style={styles.story} color={colors.onMediaMuted}>
          {shown.backstory ?? shown.bio}
        </Txt>
        <Things ios="heart.fill" icon="heart" label={t('intro.loves')} items={shown.likes} />
        <Things ios="heart.slash" icon="heart-dislike-outline" label={t('intro.cantStand')} items={shown.dislikes} />
        <Path beats={shown.arc?.beats} level={level} />
      </View>
    </PressableScale>
  );
}

/** A row of clear-glass chips, each an icon and a word or two. */
function Chips({ facts }: { facts: Fact[] }) {
  if (!facts.length) return null;
  return (
    <View style={styles.chips}>
      {facts.map((f) => (
        <View key={f.key} style={styles.chip}>
          <SFIcon ios={f.ios} icon={f.icon} size={13} color={colors.onMedia} />
          <Txt style={styles.chipText} color={colors.onMedia}>
            {f.label}
          </Txt>
        </View>
      ))}
    </View>
  );
}

/** Their story as the bond opens it: a key and the beat's title, or a lock and the level it opens at. */
function Path({ beats, level }: { beats?: ArcBeat[]; level: number }) {
  const { t } = useTranslation();
  if (!beats?.length) return null;
  return (
    <View style={styles.path}>
      <Txt variant="title" color={colors.onMedia} accessibilityRole="header">
        {t('world.story')}
      </Txt>
      {beats.map((beat) => {
        const open = level >= beat.atLevel;
        const label = open ? beat.title : t('world.level', { level: beat.atLevel });
        return (
          <View key={beat.atLevel} style={styles.beat} accessible accessibilityLabel={label}>
            <View style={styles.thingsIcon}>
              <SFIcon ios={open ? 'key.fill' : 'lock.fill'} icon={open ? 'key' : 'lock-closed'} size={14} color={open ? systemColors.pink : colors.onMediaMuted} />
            </View>
            <Txt style={[styles.beatText, open && styles.beatOpen]} color={open ? colors.onMedia : colors.onMediaMuted}>
              {label}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

/** One row of things: an icon for loves or can't stand, then each thing as a glass chip. */
function Things({ ios, icon, label, items }: Glyph & { label: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <View style={styles.things} accessible accessibilityLabel={`${label}: ${items.join(', ')}`}>
      <View style={styles.thingsIcon}>
        <SFIcon ios={ios} icon={icon} size={14} color={colors.onMediaSoft} />
      </View>
      <View style={styles.chips}>
        {items.map((item) => (
          <View key={item} style={styles.chip}>
            <Txt style={styles.chipText} color={colors.onMedia}>
              {item}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: space.md, marginTop: space.sm, marginBottom: space.lg, borderRadius: 24, overflow: 'hidden', backgroundColor: NIGHT },
  photo: { height: PHOTO },
  // The words start on the photo's dark end, so the card reads as one piece.
  body: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.lg, gap: space.sm + 2 },
  overPhoto: { marginTop: -96 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { flexShrink: 1, fontSize: 26, lineHeight: 31, fontWeight: '700', letterSpacing: 0.2 },
  aiMark: {
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 6,
    justifyContent: 'center',
    backgroundColor: colors.onMediaGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
  },
  aiText: { fontSize: 12, fontWeight: '600' },
  tagline: { fontSize: 15, lineHeight: 20, fontWeight: '500', marginTop: -4 },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  // Clear glass on the dark card (HIG Materials: the clear variant is for rich media).
  chip: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: colors.onMediaGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.onMediaHairline,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  story: { fontSize: 15, lineHeight: 21 },
  things: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  thingsIcon: { width: 20, height: 28, alignItems: 'center', justifyContent: 'center' },
  path: { marginTop: space.xs, gap: 2 },
  beat: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  beatText: { flex: 1, fontSize: 15, lineHeight: 20, paddingVertical: 4 },
  beatOpen: { fontWeight: '600' },
});
