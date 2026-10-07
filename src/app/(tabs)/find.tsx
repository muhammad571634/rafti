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

import { CHARACTER_ROW_AVATAR as AVATAR, CharacterRow } from '@/components/character-row';
import {
  Divider,
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
import type { Character, CharacterCategory } from '@/types';

type Tab = CharacterCategory | 'all';
const TABS: Tab[] = ['all', 'school', 'fantasy', 'idol', 'daily', 'original'];
/** Rows per page inside a world card. */
const PAGE = 3;

/**
 * Discovery: each world is a card of three, swiped page by page, with "›" for the
 * whole world. A search drops the cards and lists every match across worlds.
 */
export default function FindScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const addFriend = useAppStore((s) => s.addFriend);

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');

  const friendIds = useMemo(() => new Set(conversations.map((c) => c.characterId)), [conversations]);
  const q = query.trim().toLowerCase();

  const results = useMemo(
    () =>
      q
        ? characters.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.handle.toLowerCase().includes(q) ||
              c.series?.toLowerCase().includes(q) ||
              c.tags.some((tag) => tag.includes(q)),
          )
        : [],
    [characters, q],
  );

  const groups = useMemo(
    () => groupBySeries(characters.filter((c) => tab === 'all' || c.category === tab)),
    [characters, tab],
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
              <SectionLabel title={t('find.results', { count: results.length })} />
              {results.map((character, i) => (
                <View key={character.id}>
                  {i > 0 ? <Divider inset={space.lg + AVATAR + space.md} /> : null}
                  {row(character)}
                </View>
              ))}
            </>
          ) : (
            groups.map((group) => (
              <WorldCard
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

/** One world: its name with "›", then pages of three characters and the page dots. */
function WorldCard({
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
  const pageW = width - space.lg * 2;

  const pages = useMemo(() => {
    const out: Character[][] = [];
    for (let i = 0; i < group.characters.length; i += PAGE) out.push(group.characters.slice(i, i + PAGE));
    return out;
  }, [group.characters]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / pageW));

  return (
    <View style={styles.card}>
      <PressableScale
        style={styles.cardHead}
        scaleTo={0.98}
        accessibilityLabel={t('find.openWorld', { world: group.series })}
        onPress={onOpen}>
        <Txt variant="h3" style={styles.title} lines={1}>
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
            {list.map((character, i) => (
              <View key={character.id}>
                {i > 0 ? <Divider inset={space.lg + AVATAR + space.md} /> : null}
                {row(character)}
              </View>
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
  tabsWrap: { borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: space.sm },
  tabs: { paddingHorizontal: space.lg, gap: space.xl },
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.text },
  card: {
    marginHorizontal: space.lg,
    marginTop: space.lg,
    paddingBottom: space.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xs,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: space.xs, paddingBottom: space.xs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.text },
});
