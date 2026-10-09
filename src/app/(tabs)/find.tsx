import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import {
  CharacterAvatar,
  characterImage,
  EmptyState,
  PressableScale,
  Screen,
  SearchBar,
  SectionLabel,
  Segmented,
  Txt,
} from '@/components/ui';
import { groupBySeries, type CharacterGroup } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space, TAB_BAR_HEIGHT } from '@/theme';
import type { Character, CharacterCategory, CharacterGender } from '@/types';

type Tab = CharacterCategory | 'all';
const TABS: Tab[] = ['all', 'school', 'fantasy', 'idol', 'daily', 'original'];
/** Who to show; characters without a gender (some user creations) show under "Everyone" only. */
type Who = CharacterGender | 'everyone';
const WHO: Who[] = ['everyone', 'male', 'female'];
/** Characters shown per world before "See all". */
const PER_WORLD = 4;
/** Gap between the two card columns. */
const GAP = 12;

/**
 * Discovery (calm cards, docs/design-style.md): a big apricot "+" to create a character,
 * search, Everyone / Him / Her, one row of world filters, then each world as a section of
 * portrait cards (two columns) with "See all". A search lists every match across worlds.
 * Tapping a card opens the profile; the small "+" on a card adds them as a friend.
 */
export default function FindScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((Math.min(width, 520) - space.lg * 2 - GAP) / 2);
  const allCharacters = useAppStore((s) => s.characters);
  const blockedIds = useAppStore((s) => s.blockedIds);
  const characters = useMemo(
    () => allCharacters.filter((c) => !blockedIds.includes(c.id)),
    [allCharacters, blockedIds],
  );
  const conversations = useAppStore((s) => s.conversations);
  const addFriend = useAppStore((s) => s.addFriend);

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [who, setWho] = useState<Who>('everyone');

  const friendIds = useMemo(() => new Set(conversations.map((c) => c.characterId)), [conversations]);
  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => (who === 'everyone' ? characters : characters.filter((c) => c.gender === who)),
    [characters, who],
  );

  const results = useMemo(
    () =>
      q
        ? shown.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.handle.toLowerCase().includes(q) ||
              c.series?.toLowerCase().includes(q) ||
              c.tags.some((tag) => tag.includes(q)),
          )
        : [],
    [shown, q],
  );

  const groups = useMemo(
    () => groupBySeries(shown.filter((c) => tab === 'all' || c.category === tab)),
    [shown, tab],
  );

  const card = (character: Character) => (
    <CharacterCard
      key={character.id}
      character={character}
      width={cardWidth}
      isFriend={friendIds.has(character.id)}
      onOpen={() => router.push(`/character/${character.id}`)}
      onAdd={() => addFriend(character.id)}
    />
  );

  return (
    <Screen background={colors.bgPlain}>
      <View style={styles.head}>
        <Txt variant="h1" style={styles.title}>
          {t('find.title')}
        </Txt>
        {/* Create is the screen's one apricot action: big enough to hit with a thumb. */}
        <PressableScale
          scaleTo={0.92}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.createCharacter')}
          onPress={() => router.push('/create-character')}
          style={styles.create}>
          <Ionicons name="add" size={30} color={colors.textOnPrimary} />
        </PressableScale>
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder={t('find.searchPlaceholder')} style={styles.search} />

      <Segmented
        options={WHO.map((value) => ({ value, label: t(`find.who.${value}`) }))}
        value={who}
        onChange={setWho}
        style={styles.who}
      />

      {q ? null : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsWrap}
          contentContainerStyle={styles.tabs}>
          {TABS.map((key) => {
            const on = tab === key;
            return (
              <PressableScale
                key={key}
                scaleTo={0.95}
                dimOnPress={false}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setTab(key)}
                style={[styles.world, on && styles.worldOn]}>
                <Txt variant="smallStrong" color={on ? colors.text : colors.textSecondary}>
                  {t(`find.categories.${key}`)}
                </Txt>
              </PressableScale>
            );
          })}
        </ScrollView>
      )}

      {q && results.length === 0 ? (
        <EmptyState
          title={t('find.noResults')}
          actionLabel={t('find.createCharacter')}
          onAction={() => router.push('/create-character')}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + space.huge }}>
          {q ? (
            <>
              <SectionLabel tone="section" title={t('find.results', { count: results.length })} />
              <View style={styles.grid}>{results.map(card)}</View>
            </>
          ) : (
            groups.map((group) => (
              <WorldSection
                key={group.series}
                group={group}
                card={card}
                onOpen={() => router.push({ pathname: '/world/[series]', params: { series: group.series } })}
              />
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

/**
 * A character as a portrait card: picture, name, one line of bio. The add button sits
 * over the picture as a sibling of the card, never inside it (a button in a button is
 * unreachable for screen readers and invalid HTML on web).
 */
function CharacterCard({
  character,
  width,
  isFriend,
  onOpen,
  onAdd,
}: {
  character: Character;
  width: number;
  isFriend: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const source = characterImage(character);
  const imageHeight = Math.round(width * 0.92);
  return (
    <View style={{ width }}>
      <PressableScale
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel={character.name}
        onPress={onOpen}
        style={styles.card}>
        <View style={[styles.picture, { height: imageHeight }]}>
          {source ? (
            <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <CharacterAvatar character={character} size={width * 0.5} />
          )}
        </View>
        <View style={styles.cardText}>
          <Txt variant="bodyStrong" lines={1}>
            {character.name}
          </Txt>
          <Txt variant="small" color={colors.textSecondary} lines={1}>
            {character.bio}
          </Txt>
        </View>
      </PressableScale>
      {isFriend ? (
        <View style={[styles.mark, styles.friend]} accessible accessibilityLabel={t('find.friends')}>
          <Ionicons name="checkmark" size={16} color={colors.white} />
        </View>
      ) : (
        <PressableScale
          scaleTo={0.88}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${t('find.add')} ${character.name}`}
          onPress={onAdd}
          style={[styles.mark, styles.add]}>
          <Ionicons name="add" size={20} color={colors.text} />
        </PressableScale>
      )}
    </View>
  );
}

/** One world: its name as a section title with "See all", then its first few characters. */
function WorldSection({
  group,
  card,
  onOpen,
}: {
  group: CharacterGroup;
  card: (c: Character) => React.ReactNode;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <SectionLabel
        tone="section"
        title={group.series}
        right={
          group.characters.length > PER_WORLD ? (
            <PressableScale
              scaleTo={0.96}
              hitSlop={8}
              accessibilityLabel={t('find.openWorld', { world: group.series })}
              onPress={onOpen}>
              <Txt variant="bodyStrong">{t('find.seeAll')}</Txt>
            </PressableScale>
          ) : null
        }
      />
      <View style={styles.grid}>{group.characters.slice(0, PER_WORLD).map(card)}</View>
    </View>
  );
}

const CREATE = 48;
const MARK = 32;

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  title: { flex: 1 },
  create: {
    width: CREATE,
    height: CREATE,
    borderRadius: CREATE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: { marginHorizontal: space.lg, marginTop: space.md },
  who: { marginHorizontal: space.lg, marginTop: space.md },
  tabsWrap: { flexGrow: 0, flexShrink: 0, marginTop: space.md },
  tabs: { paddingHorizontal: space.lg, paddingVertical: space.xxs, gap: space.sm, alignItems: 'center' },
  // World filter chips: grey; the chosen one turns white with an ink border.
  world: {
    height: 38,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  worldOn: { backgroundColor: colors.surface, borderColor: colors.text },
  section: { paddingTop: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: space.lg },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  picture: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardText: { paddingHorizontal: space.md, paddingTop: space.sm + 2, paddingBottom: space.md, gap: 2 },
  mark: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: { backgroundColor: colors.surface },
  friend: { backgroundColor: colors.bondText },
});
