import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import {
  Button,
  Divider,
  EmptyState,
  Header,
  IconButton,
  Screen,
  Sheet,
  Txt,
} from '@/components/ui';
import { relativeStamp } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space, type } from '@/theme';
import type { MemoryItem } from '@/types';

export default function MemoriesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const memories = useAppStore((s) => s.memories);
  const addMemory = useAppStore((s) => s.addMemory);
  const togglePin = useAppStore((s) => s.toggleMemoryPin);
  const deleteMemory = useAppStore((s) => s.deleteMemory);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const mine = useMemo(
    () =>
      memories
        .filter((m) => m.characterId === characterId)
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
    [memories, characterId],
  );

  const save = () => {
    if (!characterId || !draft.trim()) return;
    addMemory(characterId, draft.trim());
    setDraft('');
    setAdding(false);
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header
        title={t('memories.title')}
        subtitle={character ? t('memories.subtitle', { name: character.name }) : undefined}
        right={
          <IconButton
            icon="add"
            onPress={() => setAdding(true)}
            accessibilityLabel={t('a11y.addMemory')}
          />
        }
      />

      {mine.length === 0 ? (
        <EmptyState
          icon="jar"
          title={t('memories.empty')}
          hint={t('memories.emptyHint')}
          actionLabel={t('memories.addManual')}
          onAction={() => setAdding(true)}
        />
      ) : (
        <FlatList
          data={mine}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <Divider inset={space.lg} />}
          renderItem={({ item }) => (
            <MemoryCard
              memory={item}
              onPin={() => togglePin(item.id)}
              onDelete={() => deleteMemory(item.id)}
            />
          )}
        />
      )}

      <Sheet visible={adding} onClose={() => setAdding(false)} title={t('memories.addManual')}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('memories.addManual')}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          multiline
          autoFocus
        />
        <Button label={t('common.save')} onPress={save} full disabled={!draft.trim()} />
      </Sheet>
    </Screen>
  );
}

function MemoryCard({
  memory,
  onPin,
  onDelete,
}: {
  memory: MemoryItem;
  onPin: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.source}>
          {memory.pinned ? <Ionicons name="bookmark" size={13} color={colors.text} /> : null}
          <Txt variant="caption" color={colors.textMuted}>
            {t(`memories.sources.${memory.source}`)} {'·'} {relativeStamp(memory.createdAt)}
          </Txt>
        </View>
        <View style={styles.cardActions}>
          <IconButton
            icon={memory.pinned ? 'bookmark' : 'bookmark-outline'}
            size={17}
            color={memory.pinned ? colors.text : colors.textFaint}
            onPress={onPin}
            accessibilityLabel={memory.pinned ? t('a11y.unpin') : t('a11y.pin')}
          />
          <IconButton
            icon="trash-outline"
            size={17}
            color={colors.textFaint}
            onPress={onDelete}
            accessibilityLabel={t('a11y.deleteMemory')}
          />
        </View>
      </View>

      <Txt variant="body">{memory.text}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: space.huge },
  // Memories sit on the canvas as a plain list; the hairline between them is enough.
  card: { gap: space.xs, paddingHorizontal: space.lg, paddingVertical: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  source: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  cardActions: { flexDirection: 'row', marginRight: -space.sm },
  input: {
    minHeight: 96,
    padding: space.md,
    marginBottom: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    textAlignVertical: 'top',
    ...type.body,
  },
});
