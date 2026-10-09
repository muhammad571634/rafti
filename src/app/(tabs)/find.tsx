import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CharacterRow } from '@/components/character-row';
import {
  Chip,
  EmptyState,
  IconButton,
  PressableScale,
  Screen,
  SearchBar,
  SectionLabel,
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

/**
 * Discovery (calm cards, docs/design-style.md): search with a who-to-show button
 * beside it, one row of world filters, then each world as a section of plain rows with
 * "See all". A search lists every match across worlds.
 */
export default function FindScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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

  const row = (character: Character) => (
    <CharacterRow
      character={character}
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
        <IconButton
          icon="add"
          size={22}
          background={colors.surfaceAlt}
          accessibilityLabel={t('a11y.createCharacter')}
          onPress={() => router.push('/create-character')}
        />
      </View>

      <View style={styles.searchRow}>
        <SearchBar value={query} onChangeText={setQuery} placeholder={t('find.searchPlaceholder')} style={styles.flex} />
        {/* Everyone, Him, Her: one tap moves to the next. */}
        <PressableScale
          scaleTo={0.96}
          onPress={() => setWho(WHO[(WHO.indexOf(who) + 1) % WHO.length])}
          accessibilityRole="button"
          accessibilityLabel={t('find.whoLabel', { who: t(`find.who.${who}`) })}
          style={styles.whoButton}>
          <Txt variant="bodyStrong">{t(`find.who.${who}`)}</Txt>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </PressableScale>
      </View>

      {q ? null : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsWrap}
          contentContainerStyle={styles.tabs}>
          {TABS.map((key) => (
            <Chip key={key} label={t(`find.categories.${key}`)} active={tab === key} onPress={() => setTab(key)} />
          ))}
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
              {results.map((character) => (
                <View key={character.id}>{row(character)}</View>
              ))}
            </>
          ) : (
            groups.map((group) => (
              <WorldSection
                key={group.series}
                group={group}
                row={row}
                onOpen={() => router.push({ pathname: '/world/[series]', params: { series: group.series } })}
              />
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

/** One world: its name as a section title with "See all", then its first few characters. */
function WorldSection({
  group,
  row,
  onOpen,
}: {
  group: CharacterGroup;
  row: (c: Character) => React.ReactNode;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.world}>
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
      {group.characters.slice(0, PER_WORLD).map((character) => (
        <View key={character.id}>{row(character)}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.lg,
    paddingRight: space.lg,
    paddingTop: space.sm,
  },
  title: { flex: 1 },
  searchRow: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.sm },
  whoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingLeft: space.md + 2,
    paddingRight: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabsWrap: { flexGrow: 0, flexShrink: 0, marginTop: space.md },
  tabs: { paddingHorizontal: space.lg, paddingVertical: space.xxs, gap: space.sm, alignItems: 'center' },
  world: { paddingTop: space.xs },
});
