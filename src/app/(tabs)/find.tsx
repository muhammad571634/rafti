import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

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
import { colors, space, TAB_BAR_HEIGHT } from '@/theme';
import type { Character, CharacterCategory, CharacterGender } from '@/types';

type Tab = CharacterCategory | 'all';
const TABS: Tab[] = ['all', 'school', 'fantasy', 'idol', 'daily', 'original'];
/** Who to show; characters without a gender (some user creations) show under "Everyone" only. */
type Who = CharacterGender | 'everyone';
const WHO: Who[] = ['everyone', 'male', 'female'];
/** Rows per page inside a world card. */
const PAGE = 3;

/**
 * Discovery: each world is a bold heading with "›" for the whole world, then its
 * characters three at a time, swiped page by page. No cards or lines: plain rows on
 * the canvas, like Today. A search lists every match across worlds.
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
          size={26}
          accessibilityLabel={t('a11y.createCharacter')}
          onPress={() => router.push('/create-character')}
        />
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder={t('find.searchPlaceholder')} style={styles.search} />

      <View style={styles.who}>
        {WHO.map((key) => (
          <Chip key={key} label={t(`find.who.${key}`)} active={who === key} onPress={() => setWho(key)} />
        ))}
      </View>

      {q ? null : (
        <View style={styles.tabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {TABS.map((key) => {
              const active = tab === key;
              return (
                <PressableScale
                  key={key}
                  scaleTo={1}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setTab(key)}>
                  <Txt variant={active ? 'bodyStrong' : 'body'} color={active ? colors.text : colors.textMuted}>
                    {t(`find.categories.${key}`)}
                  </Txt>
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>
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
              <SectionLabel tone="title" title={t('find.results', { count: results.length })} />
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

/** One world: its name as a heading with "›", then pages of three characters and the page dots. */
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
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const pageW = width;

  const pages = useMemo(() => {
    const out: Character[][] = [];
    for (let i = 0; i < group.characters.length; i += PAGE) out.push(group.characters.slice(i, i + PAGE));
    return out;
  }, [group.characters]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / pageW));

  return (
    <View style={styles.world}>
      <PressableScale
        style={styles.worldHead}
        scaleTo={0.98}
        accessibilityLabel={t('find.openWorld', { world: group.series })}
        onPress={onOpen}>
        <Txt variant="h2" accessibilityRole="header" style={styles.title} lines={1}>
          {group.series}
        </Txt>
        <Txt variant="smallStrong" color={colors.textMuted}>
          {group.characters.length}
        </Txt>
        <Ionicons name="chevron-forward" size={20} color={colors.text} />
      </PressableScale>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onScroll={onScroll}
        scrollEventThrottle={64}>
        {pages.map((list, p) => (
          <View key={p} style={{ width: pageW }}>
            {list.map((character) => (
              <View key={character.id}>{row(character)}</View>
            ))}
          </View>
        ))}
      </ScrollView>

      {pages.length > 1 ? (
        <View style={styles.dots}>
          {pages.map((_, p) => (
            <View key={p} style={[styles.dot, p === page && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.lg,
    paddingRight: space.sm,
    paddingTop: space.sm,
  },
  title: { flex: 1 },
  search: { marginHorizontal: space.lg, marginTop: space.sm },
  who: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.md },
  // Only the active tab is underlined; no full-width rule under the row.
  tabsWrap: { marginTop: space.sm },
  tabs: { paddingHorizontal: space.lg, gap: space.xl },
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.text },
  world: { paddingTop: space.xl },
  worldHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.xs,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: space.xs, paddingBottom: space.xs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.text },
});
