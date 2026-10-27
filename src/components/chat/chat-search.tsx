import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, PressableScale, Screen, Txt } from '@/components/ui';
import { relativeStamp } from '@/lib/format';
import { colors, space } from '@/theme';
import type { Message } from '@/types';

/**
 * "Search History": find a line in a chat or a group, voice-note transcripts included. iOS
 * search (approved prototype `Search.dc.html`): the field and Cancel on top, results in an
 * inset group; `onOpen` goes back to the chat at that message.
 */
export function ChatSearch({
  messages,
  who,
  onOpen,
}: {
  messages: Message[] | undefined;
  /** Who said it: the name and avatar on the result row. */
  who: (message: Message) => { name: string; avatar: React.ReactNode };
  onOpen: (message: Message) => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const needle = query.trim();

  const results = useMemo(() => {
    const q = needle.toLowerCase();
    if (q.length < 2 || !messages) return [];
    return messages
      .filter((m) => (m.text ?? m.transcript ?? '').toLowerCase().includes(q))
      .slice()
      .reverse();
  }, [messages, needle]);

  return (
    <Screen background={colors.bg}>
      <View style={styles.top}>
        <View style={styles.field}>
          <Ionicons name="search" size={17} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            returnKeyType="search"
            autoCorrect={false}
            autoFocus
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('a11y.clearSearch')}>
              <Ionicons name="close-circle" size={17} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
          <Txt style={styles.cancel} color={colors.brandText}>
            {t('common.cancel')}
          </Txt>
        </Pressable>
      </View>

      {results.length === 0 ? (
        needle.length >= 2 ? <EmptyState compact title={t('search.empty')} /> : null
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}
          ListHeaderComponent={<Txt style={styles.count}>{t('search.count', { count: results.length })}</Txt>}
          renderItem={({ item, index }) => {
            const author = who(item);
            return (
              <ResultRow
                message={item}
                query={needle}
                first={index === 0}
                last={index === results.length - 1}
                avatar={author.avatar}
                name={author.name}
                onPress={() => onOpen(item)}
              />
            );
          }}
        />
      )}
    </Screen>
  );
}

/** One hit: who said it and when, the line with the match in bold ink. */
function ResultRow({
  message,
  query,
  avatar,
  name,
  first,
  last,
  onPress,
}: {
  message: Message;
  query: string;
  avatar: React.ReactNode;
  name: string;
  first: boolean;
  last: boolean;
  onPress: () => void;
}) {
  const text = message.text ?? message.transcript ?? '';
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  const before = text.slice(0, at);
  const hit = text.slice(at, at + query.length);
  const after = text.slice(at + query.length);

  return (
    // Rows share one white card: the first rounds its top, the last its bottom.
    <PressableScale
      style={[styles.row, first && styles.rowFirst, last && styles.rowLast]}
      onPress={onPress}
      scaleTo={0.99}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${relativeStamp(message.createdAt)}, ${text}`}>
      {avatar}
      <View style={[styles.body, !last && styles.line]}>
        <View style={styles.head}>
          <Txt style={styles.name} lines={1}>
            {name}
          </Txt>
          <Txt style={styles.when}>{relativeStamp(message.createdAt)}</Txt>
          <Ionicons name="chevron-forward" size={13} color={colors.textFaint} />
        </View>
        <Txt style={styles.snippet} lines={2}>
          {before.length > 40 ? `…${before.slice(-40)}` : before}
          <Txt style={[styles.snippet, styles.hit]}>{hit}</Txt>
          {after}
        </Txt>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.sm },
  field: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
  },
  input: { flex: 1, padding: 0, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  cancel: { fontSize: 17, letterSpacing: -0.4 },
  count: { marginTop: 18, marginBottom: 6, marginHorizontal: space.lg * 2, fontSize: 13, color: colors.textSecondary },
  row: {
    marginHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingLeft: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.surface,
  },
  rowFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  rowLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  body: { flex: 1, gap: 2, paddingRight: space.lg, paddingBottom: space.md },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, fontSize: 17, fontWeight: '600', letterSpacing: -0.4 },
  when: { fontSize: 15, color: colors.textSecondary },
  snippet: { fontSize: 15, lineHeight: 20, letterSpacing: -0.2, color: colors.textSecondary },
  hit: { fontWeight: '600', color: colors.text },
});
