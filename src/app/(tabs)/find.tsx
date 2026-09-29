import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  CharacterAvatar,
  Card,
  Chip,
  EmptyState,
  PressableScale,
  Screen,
  SearchBar,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { groupBySeries } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, gradients, radius, shadows, space, TAB_BAR_HEIGHT } from '@/theme';
import type { Character, CharacterCategory } from '@/types';

const CATEGORIES: CharacterCategory[] = ['school', 'fantasy', 'idol', 'daily', 'original'];
const PER_PAGE = 3;

export default function FindScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const characters = useAppStore((s) => s.characters);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CharacterCategory | null>('school');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = characters.filter((c) => {
      const matchesCategory = !category || c.category === category;
      const matchesQuery =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        c.series?.toLowerCase().includes(q) ||
        c.tags.some((tag) => tag.includes(q));
      return matchesCategory && matchesQuery;
    });
    return groupBySeries(filtered);
  }, [characters, category, query]);

  return (
    <Screen background={colors.bgPlain}>
      <View style={styles.head}>
        <Txt variant="h1">{t('find.title')}</Txt>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('find.searchPlaceholder')}
          style={styles.search}
          tone="light"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipRow}>
        {CATEGORIES.map((key) => (
          <Chip
            key={key}
            label={t(`find.categories.${key}`)}
            active={category === key}
            onPress={() => setCategory((prev) => (prev === key ? null : key))}
          />
        ))}
      </ScrollView>

      {groups.length === 0 ? (
        <EmptyState
          title={t('find.noResults')}
          hint={t('find.noResultsHint')}
          actionLabel={t('find.createCharacter')}
          onAction={() => router.push('/create-character')}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + space.huge }]}>
          {groups.map((group) => (
            <SeriesCard
              key={group.series}
              series={group.series}
              characters={group.characters}
              onOpen={(c) => router.push(`/character/${c.id}`)}
            />
          ))}
        </ScrollView>
      )}

      <PressableScale
        style={[styles.fab, shadows.fab]}
        scaleTo={0.9}
        haptic
        accessibilityLabel={t('a11y.createCharacter')}
        onPress={() => router.push('/create-character')}>
        <LinearGradient colors={gradients.fab} style={styles.fabFill}>
          <Ionicons name="add" size={30} color={colors.white} />
        </LinearGradient>
      </PressableScale>
    </Screen>
  );
}

function SeriesCard({
  series,
  characters,
  onOpen,
}: {
  series: string;
  characters: Character[];
  onOpen: (c: Character) => void;
}) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);

  const pageWidth = width - space.lg * 2 - space.lg * 2;
  const pages: Character[][] = [];
  for (let i = 0; i < characters.length; i += PER_PAGE) {
    pages.push(characters.slice(i, i + PER_PAGE));
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
  };

  return (
    <Card style={styles.group}>
      <SectionHeader title={series} onPress={() => onOpen(characters[0])} />

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.pager}>
        {pages.map((chunk, i) => (
          <View key={i} style={{ width: pageWidth }}>
            {chunk.map((character) => (
              <CharacterRow key={character.id} character={character} onPress={() => onOpen(character)} />
            ))}
          </View>
        ))}
      </ScrollView>

      {pages.length > 1 ? (
        <View style={styles.dots}>
          {pages.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function CharacterRow({ character, onPress }: { character: Character; onPress: () => void }) {
  return (
    <PressableScale style={styles.row} onPress={onPress} scaleTo={0.985}>
      <CharacterAvatar character={character} size={50} verified={character.voiceReady} />
      <View style={styles.rowBody}>
        <View style={styles.rowTitle}>
          <Txt variant="bodyStrong" lines={1}>
            {character.name}
          </Txt>
          <Txt variant="small" color={colors.textFaint} lines={1}>
            {character.handle}
          </Txt>
        </View>
        <Txt variant="small" color={colors.textMuted} lines={2}>
          {character.bio}
        </Txt>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.md },
  search: { marginTop: space.xs, ...shadows.card },
  chipRow: { flexGrow: 0, marginTop: space.md },
  chips: { paddingHorizontal: space.lg, gap: space.sm, paddingVertical: space.xs },
  list: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.lg },
  group: { paddingBottom: space.md },
  pager: { marginTop: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingVertical: space.md,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: space.xs,
    marginTop: space.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.textSecondary },
  fab: {
    position: 'absolute',
    right: space.xl,
    bottom: TAB_BAR_HEIGHT + space.xl,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fabFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
