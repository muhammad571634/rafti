import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  Divider,
  EmptyState,
  Header,
  IconButton,
  PressableScale,
  Screen,
  Sheet,
  Txt,
} from '@/components/ui';
import { FREE_MEMORY_LIMIT, hasFullMemory } from '@/economy/memory-limit';
import { PLANS } from '@/economy/plans';
import { relativeStamp, shortName } from '@/lib/format';
import { memoryAccess, useAppStore } from '@/store/use-app-store';
import { colors, radius, space, type } from '@/theme';
import type { MemoryItem } from '@/types';

/** Widths of the two grey lines on a locked row, so the rows do not look stamped. */
const LOCKED_LINES: [number, number][] = [
  [82, 46],
  [68, 38],
  [74, 52],
];

export default function MemoriesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const memories = useAppStore((s) => s.memories);
  const wallet = useAppStore((s) => s.wallet);
  const name = useAppStore((s) => s.characters.find((c) => c.id === characterId)?.name ?? '');
  const addMemory = useAppStore((s) => s.addMemory);
  const togglePin = useAppStore((s) => s.toggleMemoryPin);
  const deleteMemory = useAppStore((s) => s.deleteMemory);
  const editMemory = useAppStore((s) => s.editMemory);
  const subscribe = useAppStore((s) => s.subscribe);

  const [adding, setAdding] = useState(false);
  // The memory being edited; the add sheet doubles as the edit sheet.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  // Without a plan 20 stay open (pinned first, then the newest); the rest are locked.
  const full = hasFullMemory(wallet.subscription, Date.now());
  const { open, locked } = useMemo(
    () => memoryAccess(memories, wallet, characterId ?? ''),
    [memories, wallet, characterId],
  );

  const closeSheet = () => {
    setAdding(false);
    setEditingId(null);
    setDraft('');
  };

  const startEdit = (memory: MemoryItem) => {
    setDraft(memory.text);
    setEditingId(memory.id);
  };

  const save = () => {
    if (!characterId || !draft.trim()) return;
    if (editingId) editMemory(editingId, draft);
    else addMemory(characterId, draft.trim());
    closeSheet();
  };

  // Real builds open the store's purchase sheet for Basic; the mock starts it at once.
  const unlock = () => {
    subscribe('basic');
    setUnlocking(false);
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header
        title={t('memories.title')}
        right={
          <IconButton
            icon="add"
            onPress={() => setAdding(true)}
            accessibilityLabel={t('a11y.addMemory')}
          />
        }
      />

      {open.length === 0 ? (
        <EmptyState
          icon="jar"
          title={t('memories.empty')}
          hint={t('memories.emptyHint')}
          actionLabel={t('memories.addManual')}
          onAction={() => setAdding(true)}
        />
      ) : (
        <FlatList
          data={open}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={full ? null : <LimitMeter open={open.length} locked={locked.length} />}
          ItemSeparatorComponent={() => <Divider inset={space.lg} />}
          renderItem={({ item }) => (
            <MemoryCard
              memory={item}
              onEdit={() => startEdit(item)}
              onPin={() => togglePin(item.id)}
              onDelete={() => deleteMemory(item.id)}
            />
          )}
          ListFooterComponent={
            locked.length > 0 ? <LockedBox memories={locked} onPress={() => setUnlocking(true)} /> : null
          }
        />
      )}

      {locked.length > 0 ? (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
          <Button label={t('memories.unlock')} size="lg" full onPress={() => setUnlocking(true)} />
          <Txt variant="caption" color={colors.textMuted} center>
            {t('memories.unlockCaption', { price: PLANS.basic.price })}
          </Txt>
        </View>
      ) : null}

      <Sheet
        visible={adding || editingId != null}
        onClose={closeSheet}
        title={editingId ? t('memories.edit') : t('memories.addManual')}>
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

      <Sheet visible={unlocking} onClose={() => setUnlocking(false)}>
        <View style={styles.sheetHead}>
          <View style={styles.lockArt}>
            <Ionicons name="lock-closed" size={28} color={colors.primary} />
          </View>
          <Txt variant="h3" center>
            {t('memories.lockedTitle', { name: shortName(name), count: locked.length })}
          </Txt>
        </View>
        <View style={styles.perks}>
          {[
            t('memories.allOpen'),
            t('plans.shellsMonth', { amount: PLANS.basic.shells.toLocaleString('en-US') }),
          ].map((perk) => (
            <View key={perk} style={styles.perk}>
              <Ionicons name="checkmark" size={17} color={colors.text} />
              <Txt variant="body" style={styles.flex}>
                {perk}
              </Txt>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <Button
            label={t('plans.get', { plan: t('plans.name.basic'), price: PLANS.basic.price })}
            size="lg"
            full
            onPress={unlock}
          />
          <Txt variant="caption" color={colors.textMuted} center>
            {t('plans.billed.basic')}
          </Txt>
          <Button label={t('plans.notNow')} variant="ghost" full onPress={() => setUnlocking(false)} />
        </View>
      </Sheet>
    </Screen>
  );
}

/** Free plan only: how many of the 20 open places are used, and how many are locked. */
function LimitMeter({ open, locked }: { open: number; locked: number }) {
  const { t } = useTranslation();
  const share = Math.min(1, open / FREE_MEMORY_LIMIT);
  return (
    <View style={styles.meter}>
      <View style={styles.meterHead}>
        <Txt variant="bodyStrong" style={[styles.flex, styles.figure]}>
          {t('memories.open', { count: open, limit: FREE_MEMORY_LIMIT })}
        </Txt>
        {locked > 0 ? (
          <Txt variant="small" color={colors.textSecondary} style={styles.figure}>
            {t('memories.locked', { count: locked })}
          </Txt>
        ) : null}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
      </View>
    </View>
  );
}

/** The locked memories: rows with no text, each one opens the unlock sheet. */
function LockedBox({ memories, onPress }: { memories: MemoryItem[]; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.locked}>
      <View style={styles.lockedHead}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.text} />
        <Txt variant="h3">{t('memories.locked', { count: memories.length })}</Txt>
      </View>
      <View style={styles.lockedBox}>
        {memories.map((memory, i) => {
          const [first, second] = LOCKED_LINES[i % LOCKED_LINES.length];
          return (
            <View key={memory.id}>
              {i > 0 ? <Divider /> : null}
              <PressableScale
                onPress={onPress}
                scaleTo={0.98}
                accessibilityLabel={t('a11y.lockedMemory')}
                style={styles.lockedRow}>
                <View style={styles.lockTile}>
                  <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                </View>
                <View style={styles.lines}>
                  <View style={[styles.line, { width: `${first}%` }]} />
                  <View style={[styles.line, { width: `${second}%` }]} />
                </View>
              </PressableScale>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MemoryCard({
  memory,
  onEdit,
  onPin,
  onDelete,
}: {
  memory: MemoryItem;
  /** A tap on the text opens it for editing (the icons stay separate buttons). */
  onEdit: () => void;
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

      <PressableScale onPress={onEdit} scaleTo={0.99} accessibilityRole="button" accessibilityLabel={t('memories.edit')}>
        <Txt variant="body">{memory.text}</Txt>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  meter: { gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.md },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  figure: { fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.text },
  locked: { gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.xl },
  lockedHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  lockedBox: {
    borderRadius: radius.xl - 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingHorizontal: space.md },
  lockTile: {
    width: 36,
    height: 36,
    borderRadius: radius.sm + 1,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lines: { flex: 1, gap: space.xs + 2 },
  line: { height: 9, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  bar: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  sheetHead: { alignItems: 'center', gap: space.md, marginTop: space.xs },
  lockArt: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perks: { gap: space.sm + 2, marginTop: space.lg },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { gap: space.sm, marginTop: space.lg },
});
