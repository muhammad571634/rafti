import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, PressableScale, Screen, Txt } from '@/components/ui';
import { searchMessages } from '@/lib/chat-search';
import { relativeStamp } from '@/lib/format';
import { colors, fonts, space, systemGround } from '@/theme';
import type { Message } from '@/types';

/**
 * "Search History": find a line in a chat or a group, voice-note transcripts included. iOS
 * search in the four tabs' look (0z153): a white round field and Cancel on the white ground, results
 * in one white card; `onOpen` goes back to the chat at that message.
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

  // A voice reply is a note plus the same words as text: it shows once (`searchMessages`).
  const results = useMemo(() => searchMessages(messages, needle), [messages, needle]);

  return (
    <Screen background={systemGround.ground}>
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
          <Txt style={styles.cancel} color={systemGround.label}>
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
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 23,
    backgroundColor: systemGround.card,
  },
  input: { flex: 1, padding: 0, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  cancel: { fontFamily: fonts.playfulBold, fontSize: 16 },
  count: { marginTop: 20, marginBottom: 8, marginHorizontal: space.lg + 6, fontFamily: fonts.playfulBold, fontSize: 15, color: colors.textSecondary },
  row: {
    marginHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingLeft: 16,
    paddingTop: 14,
    backgroundColor: systemGround.card,
  },
  rowFirst: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  rowLast: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  body: { flex: 1, gap: 2, paddingRight: 18, paddingBottom: 14 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, fontSize: 17, fontWeight: '600', letterSpacing: -0.4 },
  when: { fontSize: 15, color: colors.textSecondary },
  snippet: { fontSize: 15, lineHeight: 20, letterSpacing: -0.2, color: colors.textSecondary },
  hit: { fontWeight: '600', color: colors.text },
});
