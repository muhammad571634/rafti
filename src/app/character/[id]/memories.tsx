import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { type ComponentProps, type ReactNode, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
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
  SystemSegmented,
  Txt,
  useScrolledPast,
} from '@/components/ui';
import { FREE_MEMORY_LIMIT, hasFullMemory } from '@/economy/memory-limit';
import { PLANS } from '@/economy/plans';
import { relativeStamp, shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { aboutOf, countByTab, groupMemories, MEMORY_TABS } from '@/lib/memory-groups';
import { memoryAccess, useAppStore } from '@/store/use-app-store';
import { bottomRoom, colors, isDark, radius, space, type } from '@/theme';
import type { MemoryAbout, MemoryItem } from '@/types';

/** Widths of the two grey lines on a locked row, so the rows do not look stamped. */
const LOCKED_LINES: [number, number][] = [
  [82, 46],
  [68, 38],
  [74, 52],
];

/** Each tab's colour in the bar and its legend: three mints, darkest first (canvas `MemTabs.dc.html`). */
const TAB_COLORS: Record<MemoryAbout, string> = isDark
  ? { story: colors.bondOnMedia, them: colors.bondText, you: colors.accent }
  : { story: colors.bondText, them: colors.bond, you: colors.bondOnMedia };

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

  // Story (moments and pinned chat lines), what they told you, and what they know about you.
  const [tab, setTab] = useState<MemoryAbout>('you');
  const [adding, setAdding] = useState(false);
  // The memory being edited; the add sheet doubles as the edit sheet.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  // Past the large title, the bar shows it (iOS scroll edge).
  const { scrolled, onScroll } = useScrolledPast(44);

  // Without a plan 20 stay open (pinned first, then the newest); the rest are locked.
  const full = hasFullMemory(wallet.subscription, Date.now());
  const { open, locked } = useMemo(
    () => memoryAccess(memories, wallet, characterId ?? ''),
    [memories, wallet, characterId],
  );
  const groups = useMemo(() => groupMemories(open, tab), [open, tab]);
  const lockedHere = useMemo(() => locked.filter((m) => aboutOf(m) === tab), [locked, tab]);
  const counts = useMemo(() => countByTab(open), [open]);

  const short = shortName(name);
  const tabLabel: Record<MemoryAbout, string> = {
    story: t('memories.tabStory'),
    them: short,
    you: t('memories.tabYou'),
  };

  const closeSheet = () => {
    setAdding(false);
    setEditingId(null);
    setDraft('');
  };

  const startEdit = (memory: MemoryItem) => {
    setDraft(memory.text);
    setEditingId(memory.id);
  };

  // A memory added by hand lands in the tab you are on.
  const save = () => {
    if (!characterId || !draft.trim()) return;
    if (editingId) editMemory(editingId, draft);
    else addMemory(characterId, draft.trim(), 'manual', tab);
    closeSheet();
  };

  // Real builds open the store's purchase sheet for Basic; the mock starts it at once.
  const unlock = () => {
    subscribe('basic');
    haptic.success();
    setUnlocking(false);
  };

  const empty: { symbol: ComponentProps<typeof EmptyState>['symbol']; title: string; hint: string } =
    tab === 'story'
      ? { symbol: { ios: 'pin.fill', icon: 'pin' }, title: t('memories.emptyStory'), hint: t('memories.emptyStoryHint') }
      : tab === 'them'
        ? { symbol: { ios: 'person.fill', icon: 'person' }, title: t('memories.emptyThem'), hint: t('memories.emptyThemHint', { name: short }) }
        : { symbol: { ios: 'bookmark.fill', icon: 'bookmark' }, title: t('memories.empty'), hint: t('memories.emptyHint') };

  return (
    // iOS look (approved prototype `MemTabs.dc.html`): grey ground, glass bar, large title, a bar
    // of the three tabs, then the chosen tab's memories under grey headings.
    <Screen background={colors.bg}>
      <GlassBar
        title={t('memories.title')}
        scrolled={scrolled}
        right={<GlassButton icon="add" accessibilityLabel={t('a11y.addMemory')} onPress={() => setAdding(true)} />}
      />

      <FlatList
        data={groups}
        keyExtractor={(group) => group.key}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <>
            <LargeTitle>{t('memories.title')}</LargeTitle>
            <View style={styles.listTop} />
            <Meter
              counts={counts}
              labels={tabLabel}
              total={open.length}
              locked={locked.length}
              full={full}
            />
            <SystemSegmented
              options={MEMORY_TABS.map((value) => ({ value, label: tabLabel[value] }))}
              value={tab}
              onChange={setTab}
              style={styles.tabs}
            />
          </>
        }
        renderItem={({ item: group }) => (
          <View>
            <Txt style={styles.groupTitle}>{t(`memories.groups.${group.key}`, { name: short })}</Txt>
            {group.items.map((memory, index) => (
              <MemoryRow
                key={memory.id}
                memory={memory}
                who={memory.quote ? (memory.quote.author === 'me' ? t('memories.you') : short) : undefined}
                first={index === 0}
                last={index === group.items.length - 1}
                onEdit={() => startEdit(memory)}
                onPin={() => togglePin(memory.id)}
                onDelete={() => deleteMemory(memory.id)}
              />
            ))}
          </View>
        )}
        ListEmptyComponent={
          lockedHere.length > 0 ? undefined : (
            <EmptyState
              compact
              symbol={empty.symbol}
              title={empty.title}
              hint={empty.hint}
              actionLabel={tab === 'you' ? t('memories.addManual') : undefined}
              onAction={tab === 'you' ? () => setAdding(true) : undefined}
            />
          )
        }
        ListFooterComponent={
          lockedHere.length > 0 ? <LockedBox memories={lockedHere} onPress={() => setUnlocking(true)} /> : undefined
        }
      />

      {locked.length > 0 ? (
        <View style={[styles.bar, { paddingBottom: bottomRoom(insets.bottom, space.md) }]}>
          <Button label={t('memories.unlock')} size="lg" full onPress={() => setUnlocking(true)} />
          <Txt variant="caption" color={colors.textMuted} center>
            {t('memories.unlockCaption', { price: PLANS.basic.price })}
          </Txt>
        </View>
      ) : null}

      <Sheet
        visible={adding || editingId != null}
        onClose={closeSheet}
        title={editingId ? t('memories.edit') : t('memories.addManual')}
        avoidKeyboard>
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
            <Ionicons name="lock-closed" size={28} color={colors.textSecondary} />
          </View>
          <Txt variant="h3" center>
            {t('memories.lockedTitle', { name: short, count: locked.length })}
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

/**
 * How full the memory is, split by tab. Free plan: the share of the 20 open places each tab
 * takes, and how many are locked. With a plan the bar is the whole memory.
 */
function Meter({
  counts,
  labels,
  total,
  locked,
  full,
}: {
  counts: Record<MemoryAbout, number>;
  labels: Record<MemoryAbout, string>;
  total: number;
  locked: number;
  full: boolean;
}) {
  const { t } = useTranslation();
  const room = full ? Math.max(total, 1) : FREE_MEMORY_LIMIT;
  return (
    <View style={styles.meter}>
      <View style={styles.meterHead}>
        <Txt variant="bodyStrong" style={[styles.flex, styles.figure]}>
          {full ? t('memories.allOpenCount', { count: total }) : t('memories.open', { count: total, limit: FREE_MEMORY_LIMIT })}
        </Txt>
        {locked > 0 ? (
          <Txt variant="small" color={colors.textSecondary} style={styles.figure}>
            {t('memories.locked', { count: locked })}
          </Txt>
        ) : null}
      </View>
      <View style={styles.track}>
        {MEMORY_TABS.filter((tab) => counts[tab] > 0).map((tab) => (
          <View
            key={tab}
            style={[styles.fill, { width: `${(counts[tab] / room) * 100}%`, backgroundColor: TAB_COLORS[tab] }]}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {MEMORY_TABS.map((tab) => (
          <View key={tab} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: TAB_COLORS[tab] }]} />
            <Txt style={[styles.legendText, styles.figure]}>
              {labels[tab]} {counts[tab]}
            </Txt>
          </View>
        ))}
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
 * One memory in an inset group: tap to edit; swipe left for Pin and Delete (also offered as
 * screen-reader actions). A pinned memory carries a grey pin. A line pinned from the chat is
 * quoted as it was said, with who said it: it is not edited, and Delete takes it back out.
 */
function MemoryRow({
  memory,
  who,
  first,
  last,
  onEdit,
  onPin,
  onDelete,
}: {
  memory: MemoryItem;
  /** Who said a quoted chat line. */
  who?: string;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const swipe = useRef<SwipeableMethods>(null);
  const quoted = memory.quote != null;
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
    else if (!quoted) onEdit();
  };
  const text = quoted ? `“${memory.text}”` : memory.text;

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
        renderRightActions={(progress) => (
          <SwipeActions progress={progress}>
            {quoted ? null : (
              <Pressable onPress={act(onPin)} accessibilityRole="button" accessibilityLabel={pinLabel} style={[styles.swipeAction, styles.pinAction]}>
                <Ionicons name={memory.pinned ? 'pin-outline' : 'pin'} size={20} color={colors.textOnPrimary} />
              </Pressable>
            )}
            <Pressable
              onPress={act(onDelete)}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.deleteMemory')}
              style={[styles.swipeAction, styles.deleteAction]}>
              <Ionicons name="trash" size={20} color={colors.white} />
            </Pressable>
          </SwipeActions>
        )}>
        <Pressable
          onPress={press}
          accessibilityRole="button"
          accessibilityLabel={quoted ? `${text}, ${who}` : `${memory.text}, ${t('memories.edit')}`}
          accessibilityActions={
            quoted
              ? [{ name: 'delete', label: t('a11y.deleteMemory') }]
              : [
                  { name: 'pin', label: pinLabel },
                  { name: 'delete', label: t('a11y.deleteMemory') },
                ]
          }
          onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'pin' ? onPin() : onDelete())}
          style={({ pressed }) => [styles.memory, pressed && !quoted && styles.memoryPressed]}>
          <View style={[styles.memoryBody, !last && styles.memoryLine]}>
            <View style={styles.flex}>
              <Txt style={[styles.memoryText, quoted && styles.quote]}>{text}</Txt>
              <Txt style={styles.memoryMeta}>
                {who ? `${who} · ` : ''}
                {relativeStamp(memory.createdAt)}
              </Txt>
            </View>
            {memory.pinned ? <Ionicons name="pin" size={16} color={colors.textSecondary} style={styles.pin} /> : null}
          </View>
        </Pressable>
      </ReanimatedSwipeable>
    </View>
  );
}

/**
 * The swipe buttons sit under the row; they stay hidden until it moves, so the red of Delete
 * never shows along the row's rounded edge.
 */
function SwipeActions({ progress, children }: { progress: SharedValue<number>; children: ReactNode }) {
  const shown = useAnimatedStyle(() => ({ opacity: progress.value > 0 ? 1 : 0 }));
  return <Animated.View style={[styles.actionsRow, shown]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingBottom: space.huge },
  listTop: { height: 14 },
  tabs: { marginHorizontal: space.lg, marginTop: space.lg },
  groupTitle: {
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: space.xxxl,
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  // Rows share one white card: the first rounds its top, the last its bottom.
  rowWrap: { marginHorizontal: space.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  rowFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  rowLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  memory: { paddingLeft: space.lg, backgroundColor: colors.surface },
  memoryPressed: { backgroundColor: colors.surfaceAlt },
  memoryBody: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingVertical: space.md, paddingRight: space.lg },
  memoryLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  memoryText: { fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.text },
  quote: { fontStyle: 'italic' },
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
  meter: { marginHorizontal: space.lg, padding: space.lg, paddingTop: 14, paddingBottom: space.md, borderRadius: 14, backgroundColor: colors.surface },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  figure: { fontVariant: ['tabular-nums'] },
  // The tabs' shares sit side by side with a hairline gap, on the grey track.
  track: { flexDirection: 'row', gap: 2, height: 8, marginTop: 10, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 9 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13, color: colors.textSecondary },
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
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perks: { gap: space.sm + 2, marginTop: space.lg },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { gap: space.sm, marginTop: space.lg },
});
