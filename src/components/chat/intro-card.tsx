import type { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { HEROES } from '@/assets/heroes/registry';
import { characterImage, PressableScale, SFIcon, Txt } from '@/components/ui';
import { phrase } from '@/i18n';
import { localCharacter } from '@/i18n/content';
import { heightLabel } from '@/lib/character-facts';
import { colors, space } from '@/theme';
import type { Character } from '@/types';

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
 * age, height and world as clear-glass chips, their story, then what they love and can't stand.
 * The facts come from `src/mock/character-profiles.ts` (or the creator's form); a character
 * without them still shows the photo, name and bio. A tap opens the profile.
 */
export function IntroCard({
  character,
  name,
  locale,
  onPress,
}: {
  character: Character;
  /** What the user calls them (nickname or name). */
  name: string;
  locale: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const shown = localCharacter(character);
  const photo = HEROES[character.id] ?? characterImage(character);
  const facts: Fact[] = [];
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
          <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessible={false} />
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
        {facts.length ? (
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
        ) : null}
        <Txt style={styles.story} color={colors.onMediaMuted}>
          {shown.backstory ?? shown.bio}
        </Txt>
        <Things ios="heart.fill" icon="heart" label={t('intro.loves')} items={shown.likes} />
        <Things ios="heart.slash" icon="heart-dislike-outline" label={t('intro.cantStand')} items={shown.dislikes} />
      </View>
    </PressableScale>
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
});
