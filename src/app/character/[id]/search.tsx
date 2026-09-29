import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { CharacterAvatar, EmptyState, Header, PressableScale, Screen, SearchBar, Txt, UserAvatar } from '@/components/ui';
import { relativeStamp } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { Message } from '@/types';

/** "Search History": find a line in this chat — text, transcripts of voice notes included. */
export default function SearchHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const router = useRouter();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const conversation = useAppStore((s) => s.conversations.find((c) => c.characterId === characterId));
  const messages = useAppStore((s) => (conversation ? s.messages[conversation.id] : undefined));
  const user = useAppStore((s) => s.user);

  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2 || !messages) return [];
    return messages
      .filter((m) => (m.text ?? m.transcript ?? '').toLowerCase().includes(q))
      .slice()
      .reverse();
  }, [messages, query]);

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('search.title')} />

      <View style={styles.searchWrap}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          tone="light"
          autoFocus
        />
      </View>

      {results.length === 0 ? (
        <EmptyState
          compact
          title={query.trim().length >= 2 ? t('search.empty') : t('search.title')}
          hint={t('search.hint')}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ResultRow
              message={item}
              query={query.trim()}
              avatar={
                item.author === 'me' ? (
                  <UserAvatar user={user} size={34} />
                ) : character ? (
                  <CharacterAvatar character={character} size={34} />
                ) : null
              }
              name={item.author === 'me' ? user.displayName : (character?.name ?? '')}
              onPress={() => conversation && router.push(`/chat/${conversation.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

function ResultRow({
  message,
  query,
  avatar,
  name,
  onPress,
}: {
  message: Message;
  query: string;
  avatar: React.ReactNode;
  name: string;
  onPress: () => void;
}) {
  const text = message.text ?? message.transcript ?? '';
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  const before = text.slice(0, at);
  const hit = text.slice(at, at + query.length);
  const after = text.slice(at + query.length);

  return (
    <PressableScale style={styles.row} onPress={onPress} scaleTo={0.99}>
      {avatar}
      <View style={styles.body}>
        <View style={styles.head}>
          <Txt variant="smallStrong">{name}</Txt>
          <Txt variant="tiny" color={colors.textFaint}>
            {relativeStamp(message.createdAt)}
          </Txt>
        </View>
        <Txt variant="small" color={colors.textSecondary} lines={2}>
          {before.length > 40 ? `…${before.slice(-40)}` : before}
          <Txt variant="smallStrong" color={colors.primary}>
            {hit}
          </Txt>
          {after}
        </Txt>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: space.lg, paddingBottom: space.md },
  list: { paddingHorizontal: space.lg, paddingBottom: space.huge, gap: space.sm },
  row: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  body: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
