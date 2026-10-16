import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  Divider,
  EmptyState,
  GlassBar,
  GlassButton,
  LargeTitle,
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
    // iOS look (approved prototype `Memories.dc.html`): grey ground, glass bar, large title, inset rows.
    <Screen background={colors.bg}>
      <GlassBar right={<GlassButton icon="add" accessibilityLabel={t('a11y.addMemory')} onPress={() => setAdding(true)} />} />
      <LargeTitle>{t('memories.title')}</LargeTitle>

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
          renderItem={({ item, index }) => (
            <MemoryRow
              memory={item}
              first={index === 0}
              last={index === open.length - 1}
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
        <Ionicons name="lock-closed" size={12} color={colors.textSecondary} />
        <Txt style={styles.lockedTitle}>{t('memories.locked', { count: memories.length })}</Txt>
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

/**
 * One memory in the inset group: tap to edit; swipe left for Pin and Delete (also offered as
 * screen-reader actions). A pinned memory carries a peach bookmark.
 */
function MemoryRow({
  memory,
  first,
  last,
  onEdit,
  onPin,
  onDelete,
}: {
  memory: MemoryItem;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const swipe = useRef<SwipeableMethods>(null);
  const pinLabel = memory.pinned ? t('a11y.unpin') : t('a11y.pin');
  const act = (run: () => void) => () => {
    swipe.current?.close();
    run();
  };
  // A tap on an open row (or the release that ends a drag) closes it instead of editing.
  const opened = useRef(false);
  const draggedAt = useRef(0);
  const press = () => {
    if (Date.now() - draggedAt.current < 400) return;
    if (opened.current) swipe.current?.close();
    else onEdit();
  };

  return (
    <View style={[styles.rowWrap, first && styles.rowFirst, last && styles.rowLast]}>
      <ReanimatedSwipeable
        ref={swipe}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        // Both fire on release, just before the click a mouse drag ends with on web.
        onSwipeableWillOpen={() => {
          opened.current = true;
          draggedAt.current = Date.now();
        }}
        onSwipeableWillClose={() => {
          opened.current = false;
          draggedAt.current = Date.now();
        }}
        renderRightActions={() => (
          <View style={styles.actionsRow}>
            <Pressable onPress={act(onPin)} accessibilityRole="button" accessibilityLabel={pinLabel} style={[styles.swipeAction, styles.pinAction]}>
              <Ionicons name={memory.pinned ? 'bookmark-outline' : 'bookmark'} size={20} color={colors.textOnPrimary} />
            </Pressable>
            <Pressable
              onPress={act(onDelete)}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.deleteMemory')}
              style={[styles.swipeAction, styles.deleteAction]}>
              <Ionicons name="trash" size={20} color={colors.white} />
            </Pressable>
          </View>
        )}>
        <Pressable
          onPress={press}
          accessibilityRole="button"
          accessibilityLabel={`${memory.text}, ${t('memories.edit')}`}
          accessibilityActions={[
            { name: 'pin', label: pinLabel },
            { name: 'delete', label: t('a11y.deleteMemory') },
          ]}
          onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'pin' ? onPin() : onDelete())}
          style={({ pressed }) => [styles.memory, pressed && styles.memoryPressed]}>
          <View style={[styles.memoryBody, !last && styles.memoryLine]}>
            <View style={styles.flex}>
              <Txt style={styles.memoryText}>{memory.text}</Txt>
              <Txt style={styles.memoryMeta}>
                {t(`memories.sources.${memory.source}`)} {'·'} {relativeStamp(memory.createdAt)}
              </Txt>
            </View>
            {memory.pinned ? <Ionicons name="bookmark" size={16} color={colors.primary} style={styles.pin} /> : null}
          </View>
        </Pressable>
      </ReanimatedSwipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingTop: 14, paddingBottom: space.huge },
  // Rows share one white card: the first rounds its top, the last its bottom.
  rowWrap: { marginHorizontal: space.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  rowFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  rowLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  memory: { paddingLeft: space.lg, backgroundColor: colors.surface },
  memoryPressed: { backgroundColor: colors.surfaceAlt },
  memoryBody: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingVertical: space.md, paddingRight: space.lg },
  memoryLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  memoryText: { fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.text },
  memoryMeta: { marginTop: 2, fontSize: 13, color: colors.textSecondary },
  pin: { marginTop: 3 },
  actionsRow: { flexDirection: 'row' },
  swipeAction: { width: 66, alignItems: 'center', justifyContent: 'center' },
  pinAction: { backgroundColor: colors.primaryFill },
  deleteAction: { backgroundColor: colors.danger },
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
  meter: { gap: space.sm + 2, marginHorizontal: space.lg, marginBottom: 22, padding: space.lg, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.surface },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  figure: { fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  locked: { gap: 6, paddingHorizontal: space.lg, paddingTop: 22 },
  lockedHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: space.lg },
  lockedTitle: { fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase' },
  lockedBox: { borderRadius: 14, backgroundColor: colors.surface, overflow: 'hidden' },
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
  bar: { gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: colors.bg },
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
