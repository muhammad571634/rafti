import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ComponentProps, type ReactNode, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkFriendPill, InkIconButton, InkNavBar, InkSegmented, InkText } from '@/components/ink';
import { FriendAccent, useFriendAccent } from '@/components/character/kit';
import { PlanDetailSheet } from '@/components/chat/plan-detail-sheet';
import { Button, Divider, EmptyState, PressableScale, Screen, Sheet, Txt, useScrolledPast } from '@/components/ui';
import { FREE_MEMORY_LIMIT, hasFullMemory } from '@/economy/memory-limit';
import { PLANS } from '@/economy/plans';
import { count, relativeStamp, shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { countByTab, groupMemories, MEMORY_TABS, tabOf, upcomingPlans } from '@/lib/memory-groups';
import { dateFromKey, dayKeyFromToday, todayKey } from '@/mock/time';
import { memoryAccess, useAppStore } from '@/store/use-app-store';
import { bottomRoom, night, space, type } from '@/theme';
import { ink, inkFace, inkGutter, inkPeachGlass, inkRadius } from '@/theme/ink';
import type { MemoryAbout, MemoryItem, ScheduleItem } from '@/types';

const { colors, friendAccent } = night;

/** Widths of the two muted lines on a locked row, so the rows do not look stamped. */
const LOCKED_LINES: [number, number][] = [
  [78, 44],
  [64, 38],
  [72, 50],
];

const YOU_SEG_COLOR = '#B97856';
const LOCK_PILL_BG = ink.tintFill;
const LOCK_PILL_RIM = 'rgba(235,173,132,0.34)';
const BASIC_MINT = '#5FE0C4';
const FOOTER_BG = 'rgba(9,9,13,0.94)';

export default function MemoriesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const characterId = Array.isArray(id) ? id[0] : id;

  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { scrolled, onScroll } = useScrolledPast(34);

  const memories = useAppStore((s) => s.memories);
  const wallet = useAppStore((s) => s.wallet);
  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const name = character?.name ?? '';
  // "Что {{name}} рассказал / рассказала": the verb agrees with the friend (i18next context).
  const gender = character?.gender;
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
  // The plan opened from the Promises group (the same sheet the chat opens).
  const [planId, setPlanId] = useState<string | null>(null);
  const schedules = useAppStore((s) => s.schedules);

  // Without a plan 20 stay open (pinned first, then the newest); the rest are locked.
  const full = hasFullMemory(wallet.subscription, Date.now());
  const { open, locked } = useMemo(
    () => memoryAccess(memories, wallet, characterId ?? ''),
    [memories, wallet, characterId],
  );
  // What the two of them agreed: plans set with this friend from today on lead the Promises group.
  const plans = useMemo(() => upcomingPlans(schedules, characterId ?? '', todayKey()), [schedules, characterId]);
  const groups = useMemo(() => {
    const list = groupMemories(open, tab);
    if (tab !== 'story' || plans.length === 0 || list.some((g) => g.key === 'promises')) return list;
    return [{ key: 'promises' as const, items: [] as MemoryItem[] }, ...list];
  }, [open, tab, plans]);
  const lockedHere = useMemo(() => locked.filter((m) => tabOf(m) === tab), [locked, tab]);
  const counts = useMemo(() => countByTab(open), [open]);

  const short = shortName(name);
  const friendHue = characterId ? friendAccent(characterId) : null;
  const accentStrong = friendHue?.strong ?? ink.accent;

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

  // The tap that closes the plan sheet (its Delete) must not land on the row under it as it goes.
  const planClosedAt = useRef(0);
  const closePlan = () => {
    planClosedAt.current = Date.now();
    setPlanId(null);
  };

  const startEdit = (memory: MemoryItem) => {
    if (Date.now() - planClosedAt.current < 600) return;
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
    <FriendAccent value={friendHue}>
      <Screen night background={ink.ground}>
        <LinearGradient
          pointerEvents="none"
          colors={[`${accentStrong}28`, `${accentStrong}00`]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.ambient}
        />

        <InkNavBar
          backLabel={t('a11y.back')}
          onBack={() => router.back()}
          scrolled={scrolled}
          center={
            character ? (
              <InkFriendPill
                character={character}
                name={short}
                ringColor={accentStrong}
                onPress={() => router.push(`/character/${character.id}`)}
              />
            ) : undefined
          }
          right={<InkIconButton icon="add" size={22} accessibilityLabel={t('a11y.addMemory')} onPress={() => setAdding(true)} />}
        />

        <FlatList
          data={groups}
          keyExtractor={(group) => group.key}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.list, { paddingBottom: locked.length > 0 ? space.xxl : insets.bottom + space.huge }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <InkText variant="display" accessibilityRole="header" style={styles.screenTitle}>
                {t('memories.title')}
              </InkText>
              <Meter
                counts={counts}
                labels={tabLabel}
                total={open.length}
                locked={locked.length}
                full={full}
                accentColor={accentStrong}
                onOpenUnlock={locked.length > 0 ? () => setUnlocking(true) : undefined}
              />
              <View style={styles.tabs}>
                <InkSegmented
                  options={MEMORY_TABS.map((value) => ({ value, label: tabLabel[value] }))}
                  value={tab}
                  onChange={setTab}
                />
              </View>
            </>
          }
          renderItem={({ item: group }) => (
            <View>
              <Txt style={styles.groupTitle}>{t(`memories.groups.${group.key}`, { name: short, context: gender })}</Txt>
              <View style={styles.groupCard}>
                {group.key === 'promises'
                  ? plans.map((plan, index) => (
                      <PlanRow key={plan.id} plan={plan} last={index === plans.length - 1 && group.items.length === 0} onOpen={() => Date.now() - planClosedAt.current >= 600 && setPlanId(plan.id)} />
                    ))
                  : null}
                {group.items.map((memory, index) => (
                  <MemoryRow
                    key={memory.id}
                    memory={memory}
                    who={memory.quote ? (memory.quote.author === 'me' ? t('memories.you') : short) : undefined}
                    last={index === group.items.length - 1}
                    onEdit={() => startEdit(memory)}
                    onPin={() => togglePin(memory.id)}
                    onDelete={() => deleteMemory(memory.id)}
                  />
                ))}
              </View>
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
            <PressableScale
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={t('memories.unlock')}
              onPress={() => setUnlocking(true)}
              style={styles.unlockPill}>
              <LinearGradient colors={inkPeachGlass.ctaFill} style={StyleSheet.absoluteFill} pointerEvents="none" />
              <Ionicons name="lock-open" size={16} color={inkPeachGlass.ctaText} />
              <InkText variant="bodyStrong" color={inkPeachGlass.ctaText} lines={1}>
                {t('memories.unlock')}
              </InkText>
            </PressableScale>
            <Txt variant="caption" color={ink.text2} center style={styles.figure}>
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
            placeholderTextColor={ink.placeholder}
            selectionColor={accentStrong}
            style={styles.input}
            multiline
            autoFocus
          />
          <Button label={t('common.save')} onPress={save} full disabled={!draft.trim()} />
        </Sheet>

        <Sheet visible={unlocking} onClose={() => setUnlocking(false)}>
          <View style={styles.sheetHead}>
            <View style={styles.lockArt}>
              <Ionicons name="lock-open" size={26} color={ink.accent} />
            </View>
            <InkText variant="card" style={styles.sheetTitle}>
              {t('memories.lockedTitle', { name: short, count: locked.length })}
            </InkText>
          </View>
          <View style={styles.perks}>
            {[
              t('memories.allOpen'),
              t('plans.shellsMonth', { amount: count(PLANS.basic.shells) }),
            ].map((perk) => (
              <View key={perk} style={styles.perk}>
                <Ionicons name="checkmark" size={17} color={ink.accent} />
                <Txt variant="body" style={[styles.flex, styles.figure]}>
                  {perk}
                </Txt>
              </View>
            ))}
          </View>
          <View style={styles.actions}>
            <PressableScale
              scaleTo={0.97}
              accessibilityRole="button"
              onPress={unlock}
              style={styles.unlockPill}>
              <LinearGradient colors={inkPeachGlass.ctaFill} style={StyleSheet.absoluteFill} pointerEvents="none" />
              <InkText variant="bodyStrong" color={inkPeachGlass.ctaText} lines={1}>
                {t('plans.get', { plan: t('plans.name.basic'), price: PLANS.basic.price })}
              </InkText>
            </PressableScale>
            <Txt variant="caption" color={ink.text2} center>
              {t('plans.billed.basic')}
            </Txt>
            <Button label={t('plans.notNow')} variant="ghost" full onPress={() => setUnlocking(false)} />
          </View>
        </Sheet>
        <PlanDetailSheet planId={planId} onClose={closePlan} />
      </Screen>
    </FriendAccent>
  );
}

/**
 * Apple Health-style Ink Night+ memory meter: 6 pt segmented track (Story in friend hue, Them in
 * warm brand peach, You in deep terracotta), crisp hairline edge, and tappable locked badge.
 */
function Meter({
  counts,
  labels,
  total,
  locked,
  full,
  accentColor,
  onOpenUnlock,
}: {
  counts: Record<MemoryAbout, number>;
  labels: Record<MemoryAbout, string>;
  total: number;
  locked: number;
  full: boolean;
  accentColor: string;
  onOpenUnlock?: () => void;
}) {
  const { t } = useTranslation();
  const room = full ? Math.max(total, 1) : FREE_MEMORY_LIMIT;
  const segColors: Record<MemoryAbout, string> = {
    story: accentColor,
    them: ink.accent,
    you: YOU_SEG_COLOR,
  };

  return (
    <View style={styles.meter}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${accentColor}1A`, `${accentColor}00`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.meterHead}>
        <Txt style={[styles.flex, styles.meterTitle]} maxFontSizeMultiplier={1.5}>
          {full ? t('memories.allOpenCount', { count: total }) : t('memories.open', { count: total, limit: FREE_MEMORY_LIMIT })}
        </Txt>
        {locked > 0 && onOpenUnlock ? (
          <PressableScale
            scaleTo={0.94}
            accessibilityRole="button"
            onPress={onOpenUnlock}
            style={styles.lockedPill}>
            <Ionicons name="lock-closed" size={11} color={ink.accent} />
            <InkText variant="caption" color={ink.accent} style={styles.figure}>
              {t('memories.locked', { count: locked })}
            </InkText>
          </PressableScale>
        ) : full ? (
          <View style={styles.basicBadge}>
            <Ionicons name="checkmark-circle" size={14} color={BASIC_MINT} />
            <InkText variant="caption" color={BASIC_MINT}>
              {t('plans.name.basic')}
            </InkText>
          </View>
        ) : null}
      </View>

      <View style={styles.track}>
        {total > 0 ? (
          <View style={[styles.trackFilled, { width: `${Math.min(100, (total / room) * 100)}%` }]}>
            {MEMORY_TABS.filter((tab) => counts[tab] > 0).map((tab) => (
              <View
                key={tab}
                style={[styles.fill, { flex: counts[tab], backgroundColor: segColors[tab] }]}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.legend}>
        {MEMORY_TABS.map((tab) => (
          <View key={tab} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: segColors[tab] }]} />
            <Txt style={[styles.legendText, styles.figure]}>
              {labels[tab]}{' '}
              <Txt style={styles.legendCount}>{counts[tab]}</Txt>
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
        <Ionicons name="lock-closed" size={13} color={ink.text2} />
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
                  <Ionicons name="lock-closed" size={15} color={ink.text2} />
                </View>
                <View style={styles.lines}>
                  <View style={[styles.line, { width: `${first}%` }]} />
                  <View style={[styles.line, styles.lineMuted, { width: `${second}%` }]} />
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
 * One memory inside an Ink inset group: tap to edit; swipe left for Pin (friend accent) and Delete
 * (danger red). Pinned chat quotes wear a 2 pt friend-accent left rule and editorial serif italic.
 */
function MemoryRow({
  memory,
  who,
  last,
  onEdit,
  onPin,
  onDelete,
}: {
  memory: MemoryItem;
  /** Who said a quoted chat line. */
  who?: string;
  last: boolean;
  onEdit: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const accent = useFriendAccent();
  const { t, i18n } = useTranslation();
  const swipe = useRef<SwipeableMethods>(null);
  const quoted = memory.quote != null;
  const accentColor = accent?.strong ?? ink.accent;
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
  const sourceLabel = memory.source === 'board' ? t('us.publishKind.board') : t(`memories.sources.${memory.source}`);

  return (
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
            <Pressable
              onPress={act(onPin)}
              accessibilityRole="button"
              accessibilityLabel={pinLabel}
              style={[styles.swipeAction, { backgroundColor: accentColor }]}>
              <Ionicons name={memory.pinned ? 'pin-outline' : 'pin'} size={20} color={ink.ground} />
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
            {quoted ? (
              <View style={[styles.quoteRule, { borderLeftColor: accentColor }]}>
                <InkText variant="quote" color="rgba(255,255,255,0.92)">
                  {text}
                </InkText>
              </View>
            ) : (
              <Txt style={styles.memoryText}>{text}</Txt>
            )}
            <Txt style={[styles.memoryMeta, styles.figure]}>
              {quoted ? (who ? `${who} · ` : '') : `${sourceLabel} · `}
              {memory.type === 'promise' && memory.until ? dayLabel(memory.until, t, i18n.language) : relativeStamp(memory.createdAt)}
            </Txt>
          </View>
          {memory.pinned ? <Ionicons name="pin" size={15} color={accentColor} style={styles.pin} /> : null}
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

/** A day as a person says it: Today, Tomorrow, else a short weekday and date in the app's language. */
function dayLabel(key: string, t: (key: string) => string, language: string) {
  if (key === todayKey()) return t('common.today');
  if (key === dayKeyFromToday(1)) return t('common.tomorrow');
  return dateFromKey(key).toLocaleDateString(language, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** A plan set with this friend, at the top of Promises: tap opens it (who, when, the reminder, Us, Delete). */
function PlanRow({ plan, last, onOpen }: { plan: ScheduleItem; last: boolean; onOpen: () => void }) {
  const accent = useFriendAccent();
  const { t, i18n } = useTranslation();
  const when = [dayLabel(plan.date, t, i18n.language), plan.time ?? null].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${plan.title}, ${when}`}
      style={({ pressed }) => [styles.memory, pressed && styles.memoryPressed]}>
      <View style={[styles.memoryBody, !last && styles.memoryLine]}>
        <Ionicons name="calendar" size={17} color={accent?.strong ?? ink.accent} style={styles.planIcon} />
        <View style={styles.flex}>
          <Txt style={styles.memoryText}>{plan.title}</Txt>
          <Txt style={[styles.memoryMeta, styles.figure]}>{when}</Txt>
        </View>
        <Ionicons name="chevron-forward" size={16} color={ink.text3} style={styles.pin} />
      </View>
    </Pressable>
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
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  flex: { flex: 1 },
  list: { paddingTop: 2 },
  screenTitle: { marginHorizontal: inkGutter, marginTop: 2 },
  tabs: { marginHorizontal: inkGutter, marginTop: 14 },
  groupTitle: {
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: inkGutter + 6,
    ...inkFace('footnoteStrong'),
    color: ink.text2,
  },
  groupCard: {
    marginHorizontal: inkGutter,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  memory: { paddingLeft: 16, backgroundColor: ink.card },
  memoryPressed: { backgroundColor: ink.raised },
  memoryBody: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingVertical: 13, paddingRight: 16 },
  memoryLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.edge },
  quoteRule: { borderLeftWidth: 2, paddingLeft: 10 },
  memoryText: { ...inkFace('body'), fontSize: 15.5, lineHeight: 21.5, color: ink.text },
  memoryMeta: { marginTop: 5, ...inkFace('caption'), fontWeight: '400', color: ink.text2 },
  pin: { marginTop: 3 },
  planIcon: { marginTop: 2 },
  actionsRow: { flexDirection: 'row' },
  swipeAction: { width: 64, alignItems: 'center', justifyContent: 'center' },
  deleteAction: { backgroundColor: ink.danger },
  input: {
    minHeight: 100,
    padding: 14,
    marginBottom: space.lg,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: '#0E0E14',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    color: ink.text,
    textAlignVertical: 'top',
    ...type.body,
  },
  meter: {
    marginHorizontal: inkGutter,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 15,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  meterTitle: { ...inkFace('bodyStrong'), fontSize: 16, color: ink.text, fontVariant: ['tabular-nums'] },
  figure: { fontVariant: ['tabular-nums'] },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: inkRadius.pill,
    backgroundColor: LOCK_PILL_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: LOCK_PILL_RIM,
  },
  basicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  track: {
    height: 6,
    marginTop: 12,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  trackFilled: {
    flexDirection: 'row',
    gap: 2.5,
    height: '100%',
  },
  fill: { height: '100%', minWidth: 4, borderRadius: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 11 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { ...inkFace('caption'), fontWeight: '400', color: ink.text2 },
  legendCount: { fontWeight: '600', color: ink.text },
  locked: { gap: 8, paddingHorizontal: inkGutter, paddingTop: 20 },
  lockedHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6 },
  lockedTitle: { ...inkFace('footnoteStrong'), color: ink.text2, fontVariant: ['tabular-nums'] },
  lockedBox: {
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingHorizontal: 16 },
  lockTile: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(118,118,128,0.20)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lines: { flex: 1, gap: 6 },
  line: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.11)' },
  lineMuted: { backgroundColor: 'rgba(255,255,255,0.07)' },
  bar: {
    gap: 6,
    paddingHorizontal: inkGutter,
    paddingTop: 12,
    backgroundColor: FOOTER_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ink.edge,
  },
  unlockPill: {
    height: 50,
    borderRadius: 25,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: inkPeachGlass.ctaRim,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sheetHead: { alignItems: 'center', gap: space.md, marginTop: space.xs },
  sheetTitle: { textAlign: 'center' },
  lockArt: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: LOCK_PILL_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: LOCK_PILL_RIM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perks: { gap: space.sm + 2, marginTop: space.lg },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { gap: space.sm, marginTop: space.lg },
});
