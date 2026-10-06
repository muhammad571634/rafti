import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  CharacterAvatar,
  Divider,
  EmptyState,
  IconButton,
  ListRow,
  PressableScale,
  Screen,
  SearchBar,
  Txt,
} from '@/components/ui';
import { groupBySeries } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, space, TAB_BAR_HEIGHT } from '@/theme';
import type { Character, CharacterCategory } from '@/types';

const CATEGORIES: CharacterCategory[] = ['school', 'fantasy', 'idol', 'daily', 'original'];
const AVATAR = 48;

/** Discovery: worlds as plain lists under underline tabs; "Add" starts a chat on the spot. */
export default function FindScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const addFriend = useAppStore((s) => s.addFriend);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CharacterCategory | null>('school');

  const friendIds = useMemo(() => new Set(conversations.map((c) => c.characterId)), [conversations]);

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

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={t('find.searchPlaceholder')}
        style={styles.search}
      />

      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {CATEGORIES.map((key) => {
            const active = category === key;
            return (
              <PressableScale
                key={key}
                scaleTo={1}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setCategory((prev) => (prev === key ? null : key))}>
                <Txt variant={active ? 'bodyStrong' : 'body'} color={active ? colors.text : colors.textMuted}>
                  {t(`find.categories.${key}`)}
                </Txt>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

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
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + space.huge }}>
          {groups.map((group) => (
            <View key={group.series}>
              <Txt variant="title" style={styles.series}>
                {group.series}
              </Txt>
              {group.characters.map((character, i) => (
                <View key={character.id}>
                  {i > 0 ? <Divider inset={space.lg + AVATAR + space.md} /> : null}
                  <CharacterRow
                    character={character}
                    isFriend={friendIds.has(character.id)}
                    onOpen={() => router.push(`/character/${character.id}`)}
                    onAdd={() => addFriend(character.id)}
                  />
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function CharacterRow({
  character,
  isFriend,
  onOpen,
  onAdd,
}: {
  character: Character;
  isFriend: boolean;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();

  // The row and "Add" are siblings: a button inside a button is unreachable for
  // screen readers and invalid HTML on web.
  return (
    <View style={styles.row}>
      <ListRow
        title={character.name}
        subtitle={character.bio}
        left={<CharacterAvatar character={character} size={AVATAR} />}
        onPress={onOpen}
        style={styles.rowMain}
      />
      {isFriend ? (
        <View style={styles.friends}>
          <Ionicons name="checkmark" size={14} color={colors.textMuted} />
          <Txt variant="caption" color={colors.textMuted}>
            {t('find.friends')}
          </Txt>
        </View>
      ) : (
        <Button
          label={t('find.add')}
          size="sm"
          variant="secondary"
          onPress={onAdd}
          style={styles.add}
        />
      )}
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
  series: { paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: space.lg },
  rowMain: { flex: 1, paddingRight: space.sm },
  friends: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  add: { minWidth: 56 },
});
