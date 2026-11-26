import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter, useScrollToTop } from 'expo-router';
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, type ScrollViewInstance, type StyleProp, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyRewardSheet } from '@/components/daily-reward-sheet';
import { GroupAvatar } from '@/components/group-avatar';
import { InkText, listReorder } from '@/components/ink';
import { MoodGlyph } from '@/components/mood/mood-glyph';
import { MoodSheet } from '@/components/mood/mood-sheet';
import { featuredFriendOf, heroTopHeight, lastTalkedFriendOf, TodayHero } from '@/components/today-hero';
import { moreModules, TodayMoreSheet } from '@/components/today/more-apps';
import { hideWelcome, WelcomeBack } from '@/components/today/welcome-back';
import { LiveWidget } from '@/components/today/widget-models';
import { WIDGET_HEIGHT, WIDGET_KINDS, WIDGET_MODULE, widgetLabel } from '@/components/today/widgets';
import { CharacterAvatar, IconStack, ModuleLine, moduleTile, PressableScale, Screen, Sheet, SymbolTile, UserAvatar, type ModuleKey } from '@/components/ui';
import { useDayKey } from '@/hooks/use-day-key';
import { useFirstSteps } from '@/hooks/use-first-steps';
import { useInboxUnread } from '@/hooks/use-inbox-unread';
import { useReorderOnly } from '@/hooks/use-reorder-only';
import { helplineToday } from '@/lib/daily-note';
import { shortName } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { haptic } from '@/lib/haptics';
import { previewSlideForSlot, swapWidgetSlots, TODAY_SLOTS } from '@/lib/today';
import { waitingThreadsFirst } from '@/lib/waiting';
import { FREE_SPINS_PER_DAY } from '@/mock';
import { checkInStatus, displayName, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, night, space, systemColors, TAB_BAR_HEIGHT } from '@/theme';
import { ink, inkPeachGlass, inkRadius, inkTints } from '@/theme/ink';
import type { Character, Conversation, GroupChat, WidgetKind } from '@/types';

/** The sealed note: the sun's deep tint, its light for the envelope. */
const SUN_WASH = inkTints[2][0];
const SUN_LIGHT = systemColors.yellow;
/** "Waiting for you" lists three threads; more than that ends in one "All chats" row (Chats on Unread). */
const WAITING_ROWS = 3;
/** The gallery shows each widget at its real size, so its words sit as they will on Today. */
const GALLERY_HEIGHT = WIDGET_HEIGHT;
/** The shortest a widget on Today gets (HIG Widgets: an iOS small widget is 158 pt on a 390 pt iPhone). */
const WIDGET_FLOOR = 158;
/** The wordmark's tallest size; on narrower phones it shrinks to what the row leaves beside your capsule. */
const LOGO_MAX = 48;
/** The letters of `sigmazam-logo.png` fill rows 154-351 of 356; this is their middle's height above the art's bottom. */
const LOGO_BELOW_MID = LOGO_MAX * (1 - 252.5 / 356);
/** Your capsule's height; the bell's glass circle matches it. */
const CAPSULE = 40;
/** A waiting face and the gap after it: the separators start where the words do (iOS inset rows). */
const FACE = 44;
/** The Today row's shape: a warm band, an invitation rather than a guess at how they feel. */
const MOOD_INVITE = 5;
const noop = () => {};

/** Apple interactive springs for lifting a widget and sliding neighbours into place. */
const LIFT_SPRING = { damping: 18, stiffness: 220, mass: 0.8 } as const;
const SLIDE_SPRING = { damping: 22, stiffness: 210, mass: 0.85 } as const;

type WaitingEntry =
  | { kind: 'chat'; id: string; conversation: Conversation; character: Character; name: string }
  | { kind: 'group'; id: string; group: GroupChat; members: Character[]; name: string };

/**
 * The calm Today (design audit 2026-11-15 §6.1, simplify plan 2026-11-25 §1):
 * - Top bar: Notifications bell + Profile avatar in clear photo glass (or soft raised glass without a hero).
 * - Hero: the friend who needs you (newest unread unmuted line, else last talked, else closest bond),
 *   full bleed to the screen's middle, lit for the hour.
 * - "Waiting for you": unread one-to-one and group chats (excluding the hero's chat so nobody shows
 *   twice), plus the day's sealed note.
 * - Four widgets in a 2x2 grid with contextual Apple deep-links, live timeline refresh, and fluid
 *   iPhone Home Screen jiggle + live drag-to-swap physics.
 * - One More row with deep-tinted module tiles and "Choose widgets".
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  useScrollToTop(scrollRef);

  const half = Math.floor((width - space.lg * 2 - space.md) / 2);
  const tile = Math.min(WIDGET_HEIGHT, Math.max(half, WIDGET_FLOOR));
  const [galleryWidth, setGalleryWidth] = useState(0);
  const [pastHero, setPastHero] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const galleryHalf = galleryWidth ? Math.floor((galleryWidth - space.md) / 2) : undefined;

  const user = useAppStore((s) => s.user);
  const conversations = useAppStore((s) => s.conversations);
  const groups = useAppStore((s) => s.groups);
  const characters = useAppStore((s) => s.characters);
  const blockedIds = useAppStore((s) => s.blockedIds);
  const relationships = useAppStore((s) => s.relationships);
  const notes = useAppStore((s) => s.notes);
  const leaveDailyNote = useAppStore((s) => s.leaveDailyNote);
  const writeDuePages = useAppStore((s) => s.writeDueDiaryPages);
  const stored = useAppStore((s) => s.todayWidgets);
  const setSlots = useAppStore((s) => s.setTodayWidgets);
  const today = useDayKey();
  const inboxUnread = useInboxUnread();
  const spinReady = useAppStore((s) => s.daily.spinDay !== today || s.daily.spinsUsed < FREE_SPINS_PER_DAY);
  const giftWaiting = useAppStore((s) => !checkInStatus(s.daily, today).claimed);
  const stepWaiting = useFirstSteps().ready;
  // Once a day: "How are you?" until the mood went to a friend today.
  const moodShared = useAppStore((s) => s.daily.moodDay === today);
  const [moodOpen, setMoodOpen] = useState(false);

  const slots = useMemo(() => {
    const two = stored.slice(0, TODAY_SLOTS);
    return two.length < TODAY_SLOTS ? [...two, ...Array<null>(TODAY_SLOTS - two.length).fill(null)] : two;
  }, [stored]);

  const [editing, setEditing] = useState(false);
  const [activeDrag, setActiveDrag] = useState<number | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const dragCommitted = useRef(false);
  const [gallerySlot, setGallerySlot] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const widgetsY = useRef(0);

  const charactersById = useMemo(() => {
    const blocked = new Set(blockedIds);
    const map = new Map<string, Character>();
    for (const c of characters) {
      if (!blocked.has(c.id)) map.set(c.id, c);
    }
    return map;
  }, [characters, blockedIds]);

  const hero = useAppStore(featuredFriendOf);

  // Coming back in the morning: pages written overnight should be waiting here; leaving Today exits jiggle mode cleanly.
  useFocusEffect(
    useCallback(() => {
      writeDuePages();
      return () => {
        setEditing(false);
        setActiveDrag(null);
        setHoverSlot(null);
      };
    }, [writeDuePages]),
  );

  const noteFriendId = useAppStore((s) => lastTalkedFriendOf(s)?.character.id);
  const hydrated = useAppStore((s) => s.hydrated);
  useFocusEffect(
    useCallback(() => {
      if (hydrated && noteFriendId && today) leaveDailyNote(noteFriendId);
    }, [hydrated, noteFriendId, today, leaveDailyNote]),
  );

  // Unread one-to-one chats (excluding the hero's chat) and unread group chats, newest message first.
  const heroChat = hero?.conversation.id;
  const unread = useMemo<WaitingEntry[]>(() => {
    const oneToOne = conversations.filter((c) => c.id !== heroChat && charactersById.has(c.characterId));
    const rooms = groups.filter((g) => g.memberIds.filter((id) => charactersById.has(id)).length >= 2);
    return waitingThreadsFirst(oneToOne, rooms).flatMap((entry): WaitingEntry[] => {
      if (entry.kind === 'chat') {
        const character = charactersById.get(entry.item.characterId);
        if (!character) return [];
        return [
          {
            kind: 'chat',
            id: entry.item.id,
            conversation: entry.item,
            character,
            name: displayName(character, relationships[character.id]),
          },
        ];
      }
      const members = entry.item.memberIds.flatMap((id) => charactersById.get(id) ?? []);
      if (members.length < 2) return [];
      const name = entry.item.name || groupTitle(members.map((m) => shortName(displayName(m, relationships[m.id]))));
      return [{ kind: 'group', id: entry.item.id, group: entry.item, members, name }];
    });
  }, [conversations, groups, charactersById, relationships, heroChat]);

  const listed = unread.length > WAITING_ROWS ? unread.slice(0, WAITING_ROWS - 1) : unread;
  const others = unread.slice(listed.length);
  const reorderOnly = useReorderOnly(listed.map((f) => `${f.kind}:${f.id}`));

  // The first ready note whose friend is unblocked and not on a helpline day.
  const noteId = useAppStore((s) =>
    s.notes.find((n) => {
      if (n.status !== 'ready' || s.blockedIds.includes(n.characterId) || !s.characters.some((c) => c.id === n.characterId)) return false;
      const chatId = s.conversations.find((c) => c.characterId === n.characterId)?.id;
      return !helplineToday((chatId && s.messages[chatId]) || []);
    })?.id,
  );
  const note = useMemo(() => notes.find((n) => n.id === noteId), [notes, noteId]);
  const noteFrom = note ? charactersById.get(note.characterId) : undefined;
  const noteName = noteFrom ? shortName(displayName(noteFrom, relationships[noteFrom.id])) : '';
  const waiting = unread.length > 0 || !!noteFrom;

  const covered = useMemo(
    () => new Set(slots.flatMap((k) => (k && WIDGET_MODULE[k] ? [WIDGET_MODULE[k] as ModuleKey] : []))),
    [slots],
  );
  const giftBadge = (spinReady || giftWaiting || stepWaiting) && !covered.has('gifts');
  const firstEmpty = slots.indexOf(null);
  const anyWidget = firstEmpty < 0 || slots.some(Boolean);

  const remove = useCallback(
    (i: number) => {
      haptic.selection();
      setSlots(slots.map((k, j) => (j === i ? null : k)));
    },
    [slots, setSlots],
  );

  const place = (kind: WidgetKind) => {
    if (gallerySlot === null) return;
    if (slots[gallerySlot] === kind) {
      setGallerySlot(null);
      return;
    }
    haptic.selection();
    setSlots(slots.map((k, j) => (j === gallerySlot ? kind : k)));
    setGallerySlot(null);
  };

  const handleDragStart = useCallback((from: number) => {
    dragCommitted.current = false;
    haptic.lift();
    setActiveDrag(from);
    setHoverSlot(null);
  }, []);

  const handleDragHover = useCallback((nextHover: number | null) => {
    setHoverSlot((prev) => {
      if (prev !== nextHover && nextHover !== null) haptic.selection();
      return nextHover;
    });
  }, []);

  const handleDragCommit = useCallback(
    (from: number, to: number) => {
      dragCommitted.current = true;
      setActiveDrag(null);
      setHoverSlot(null);
      setSlots(swapWidgetSlots(slots, from, to));
    },
    [slots, setSlots],
  );

  const handleDragEnd = useCallback(() => {
    setActiveDrag(null);
    setHoverSlot(null);
  }, []);

  const startEditing = useCallback(() => setEditing(true), []);
  const finishEditing = useCallback(() => {
    haptic.tap();
    setEditing(false);
    setActiveDrag(null);
    setHoverSlot(null);
  }, []);

  const chooseWidgets = () => {
    setEditing(true);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, widgetsY.current - insets.top - 64), animated: true }));
  };

  const openWaiting = useCallback(
    (entry: WaitingEntry) => {
      if (editing) {
        finishEditing();
        return;
      }
      router.push(entry.kind === 'chat' ? `/chat/${entry.id}` : `/group/${entry.id}`);
    },
    [editing, finishEditing, router],
  );

  const onPhoto = !!hero;
  const Glass = onPhoto ? PhotoGlass : SoftGlass;
  const heroBottom = hero ? heroTopHeight(windowHeight) : 0;

  const bar = (
    <View style={styles.bar}>
      <View style={styles.logo} />
      <PressableScale
        scaleTo={0.92}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={inboxUnread > 0 ? t('us.notificationsNew', { count: inboxUnread }) : t('notifications.title')}
        onPress={() => {
          if (editing) setEditing(false);
          router.push('/notifications');
        }}>
        <View>
          <Glass style={styles.me}>
            <Ionicons name="notifications-outline" size={20} color={onPhoto ? colors.onMedia : ink.text} />
          </Glass>
          {inboxUnread > 0 ? (
            <View style={styles.bellBadge} pointerEvents="none">
              <InkText variant="caption" color={ink.onBadge}>
                {inboxUnread > 99 ? '99+' : inboxUnread}
              </InkText>
            </View>
          ) : null}
        </View>
      </PressableScale>
      <PressableScale
        scaleTo={0.92}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={`${t('a11y.profile')}, ${user.displayName}`}
        onPress={() => {
          if (editing) setEditing(false);
          router.push('/profile');
        }}>
        {user.avatarUri ? (
          <Glass style={styles.me}>
            <UserAvatar user={user} size={34} />
          </Glass>
        ) : (
          <UserAvatar user={user} size={CAPSULE} glass />
        )}
      </PressableScale>
    </View>
  );

  return (
    <Screen background={ink.ground} edgeToEdge={onPhoto} statusBarStyle={onPhoto && !pastHero ? 'light' : undefined}>
      <ScrollView
        ref={scrollRef}
        scrollEnabled={activeDrag === null}
        showsVerticalScrollIndicator={false}
        onTouchStart={hideWelcome}
        scrollEventThrottle={32}
        onScroll={
          onPhoto
            ? (e) => {
                const y = e.nativeEvent.contentOffset.y;
                setScrolled(y > space.xs);
                setPastHero(y > heroBottom - insets.top - space.md);
              }
            : undefined
        }
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xxl }}>
        {hero ? (
          <TodayHero
            friend={hero}
            header={bar}
            topInset={insets.top}
            onPress={() => {
              if (editing) {
                finishEditing();
                return;
              }
              router.push(`/chat/${hero.conversation.id}`);
            }}
          />
        ) : (
          <>
            {bar}
            <PressableScale
              scaleTo={0.98}
              accessibilityRole="button"
              onPress={() => {
                if (editing) {
                  finishEditing();
                  return;
                }
                router.navigate('/(tabs)/find');
              }}
              style={[styles.card, styles.row, styles.solo, styles.firstCard]}>
              <SymbolTile fill={systemColors.orange} ios="sparkles" icon="sparkles" size={FACE} deep />
              <InkText variant="bodyStrong" lines={2} style={styles.flex}>
                {t('home.todo.meet')}
              </InkText>
              <Ionicons name="chevron-forward" size={18} color={ink.text3} />
            </PressableScale>
          </>
        )}

        {waiting ? (
          <View style={[styles.card, styles.firstCard]}>
            {listed.map((entry, i) => (
              <WaitingRow
                key={`${entry.kind}:${entry.id}`}
                entry={entry}
                first={i === 0}
                slide={reorderOnly}
                onOpen={openWaiting}
              />
            ))}
            {others.length > 0 ? (
              <PressableScale
                scaleTo={0.98}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.unreadTab', { label: t('home.allChats'), count: others.length })}
                onPress={() => {
                  if (editing) {
                    finishEditing();
                    return;
                  }
                  router.navigate({ pathname: '/(tabs)/chat', params: { filter: 'unread' } });
                }}
                style={styles.row}>
                <View style={styles.faces}>
                  {others.slice(0, 2).map((entry, i) => {
                    const face = entry.kind === 'chat' ? entry.character : entry.members[0];
                    return face ? (
                      <CharacterAvatar key={`${entry.kind}:${entry.id}`} character={face} size={i ? 30 : 32} style={i > 0 && styles.overlap} />
                    ) : null;
                  })}
                </View>
                <View style={[styles.rowBody, styles.line]}>
                  <InkText variant="bodyStrong" lines={1} style={styles.flex}>
                    {t('home.allChats')}
                  </InkText>
                  <InkText variant="body" color={ink.text3} style={styles.tabular}>
                    {others.length}
                  </InkText>
                  <Ionicons name="chevron-forward" size={18} color={ink.text3} />
                </View>
              </PressableScale>
            ) : null}
            {note && noteFrom ? (
              <PressableScale
                scaleTo={0.98}
                accessibilityRole="button"
                accessibilityLabel={`${t('home.todo.note', { name: noteName })}, ${note.depth ? t('secretNote.depthKicker', { n: note.depth }) : t('home.widget.sealed')}`}
                onPress={() => {
                  if (editing) {
                    finishEditing();
                    return;
                  }
                  router.push(`/secret-note/${noteFrom.id}`);
                }}
                style={styles.row}>
                <View style={styles.noteIcon}>
                  <ModuleLine name="note" size={24} color={SUN_LIGHT} />
                </View>
                <View style={[styles.rowBody, unread.length > 0 && styles.line]}>
                  <View style={styles.flex}>
                    <InkText variant="bodyStrong" lines={1}>
                      {t('home.todo.note', { name: noteName })}
                    </InkText>
                    {note.depth ? (
                      <View style={styles.keepsake}>
                        <Ionicons name="sparkles" size={13} color={SUN_LIGHT} />
                        <InkText variant="sub" lines={1} color={SUN_LIGHT} style={styles.flex}>
                          {t('secretNote.depthKicker', { n: note.depth })}
                        </InkText>
                      </View>
                    ) : (
                      <InkText variant="sub" lines={1}>
                        {t('home.widget.sealed')}
                      </InkText>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={ink.text3} />
                </View>
              </PressableScale>
            ) : null}
          </View>
        ) : null}

        {hero && !moodShared ? (
          <PressableScale
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={t('mood.ask')}
            onPress={() => {
              if (editing) {
                finishEditing();
                return;
              }
              haptic.tap();
              setMoodOpen(true);
            }}
            style={[styles.card, styles.row, styles.moodRow, waiting ? styles.moodAfter : styles.firstCard]}>
            <View style={styles.moodIcon}>
              <MoodGlyph band={MOOD_INVITE} size={30} />
            </View>
            <InkText variant="bodyStrong" lines={2} style={styles.flex}>
              {t('mood.ask')}
            </InkText>
            <Ionicons name="chevron-forward" size={18} color={ink.text3} />
          </PressableScale>
        ) : null}

        {anyWidget || editing ? (
          <View style={styles.widgetBlock} onLayout={(e) => (widgetsY.current = e.nativeEvent.layout.y)}>
            <View style={styles.widgets}>
              {slots.map((kind, i) => {
                const slide = previewSlideForSlot(i, activeDrag, hoverSlot, half, tile, space.md);
                if (kind) {
                  return (
                    <Slot
                      key={kind}
                      index={i}
                      width={half}
                      height={tile}
                      gap={space.md}
                      kind={kind}
                      editing={editing}
                      dragging={activeDrag === i}
                      slideX={slide.x}
                      slideY={slide.y}
                      committedRef={dragCommitted}
                      onStartEditing={startEditing}
                      onReplace={setGallerySlot}
                      onRemove={remove}
                      onDragStart={handleDragStart}
                      onDragHover={handleDragHover}
                      onDragCommit={handleDragCommit}
                      onDragEnd={handleDragEnd}
                    />
                  );
                }
                if (editing) {
                  return (
                    <EmptySlot
                      key={`empty-${i}`}
                      index={i}
                      width={half}
                      height={tile}
                      slideX={slide.x}
                      slideY={slide.y}
                      committedRef={dragCommitted}
                      activeDrag={activeDrag}
                      label={t('home.widget.addHere')}
                      onPress={setGallerySlot}
                    />
                  );
                }
                return null;
              })}
            </View>
            {editing ? (
              <PressableScale scaleTo={0.94} accessibilityRole="button" onPress={finishEditing} style={styles.done}>
                <InkText variant="bodyStrong" color={inkPeachGlass.ctaText}>
                  {t('home.widget.done')}
                </InkText>
              </PressableScale>
            ) : null}
          </View>
        ) : null}

        <PressableScale
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={giftBadge ? t('a11y.unreadTab', { label: t('more.title'), count: 1 }) : t('more.title')}
          onPress={() => {
            if (editing) setEditing(false);
            setMoreOpen(true);
          }}
          style={[styles.card, styles.row, styles.moreRow, !waiting && moodShared && !anyWidget && !editing && !!hero && styles.firstCard]}>
          <IconStack items={moreModules(covered).map((m) => moduleTile(m.key))} size={30} max={4} />
          <InkText variant="bodyStrong" lines={1} style={styles.flex}>
            {t('more.title')}
          </InkText>
          {giftBadge ? (
            <View style={styles.badge}>
              <InkText variant="caption" color={colors.white}>
                1
              </InkText>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={ink.text3} />
        </PressableScale>
      </ScrollView>

      {onPhoto ? <TopEdge mode={pastHero ? 'ground' : scrolled ? 'photo' : 'none'} solid={insets.top} height={insets.top + space.xl} /> : null}

      <TodayMoreSheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        covered={covered}
        badge={giftBadge ? 'gifts' : undefined}
        onChooseWidgets={chooseWidgets}
      />

      <Sheet visible={gallerySlot !== null} onClose={() => setGallerySlot(null)} title={t('home.widget.gallery')} scroll>
        <View style={styles.galleryGrid} onLayout={(e) => setGalleryWidth(e.nativeEvent.layout.width)}>
          {gallerySlot !== null &&
            WIDGET_KINDS.map((kind) => {
              const current = slots[gallerySlot] === kind;
              const usedElsewhere = !current && slots.includes(kind);
              const label = widgetLabel(kind, t);
              return (
                <PressableScale
                  key={kind}
                  scaleTo={0.96}
                  disabled={usedElsewhere}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ disabled: usedElsewhere, selected: current }}
                  onPress={() => place(kind)}
                  style={[styles.galleryItem, { width: galleryHalf }, usedElsewhere && styles.used]}>
                  <View style={[styles.galleryFrame, current && styles.galleryCurrent]}>
                    <LiveWidget kind={kind} height={GALLERY_HEIGHT} preview />
                  </View>
                  <View style={styles.galleryLabel}>
                    <InkText variant="subStrong" color={current ? ink.accent : ink.text}>
                      {label}
                    </InkText>
                    {current ? (
                      <Ionicons name="checkmark-circle" size={16} color={ink.accent} />
                    ) : usedElsewhere ? (
                      <Ionicons name="checkmark" size={15} color={colors.success} />
                    ) : null}
                  </View>
                </PressableScale>
              );
            })}
        </View>
      </Sheet>

      {hero ? <MoodSheet visible={moodOpen} onClose={() => setMoodOpen(false)} characterId={hero.character.id} /> : null}
      <DailyRewardSheet />
      <WelcomeBack />
    </Screen>
  );
}

/**
 * One unread one-to-one or group chat in "Waiting for you": face (or group mosaic), name, last
 * line, unread count; a tap opens that chat or group.
 */
const WaitingRow = memo(function WaitingRow({
  entry,
  first,
  slide,
  onOpen,
}: {
  entry: WaitingEntry;
  first: boolean;
  slide: boolean;
  onOpen: (entry: WaitingEntry) => void;
}) {
  const { t } = useTranslation();
  const count = entry.kind === 'chat' ? entry.conversation.unreadCount : entry.group.unreadCount;
  const preview = entry.kind === 'chat' ? entry.conversation.lastMessagePreview : entry.group.lastMessagePreview;
  return (
    <Animated.View layout={slide ? listReorder : undefined}>
      <PressableScale
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={[t('a11y.unreadTab', { label: entry.name, count }), preview].filter(Boolean).join(', ')}
        onPress={() => onOpen(entry)}
        style={styles.row}>
        {entry.kind === 'chat' ? (
          <CharacterAvatar character={entry.character} size={FACE} ring ringColor={night.friendAccent(entry.character.id).strong} />
        ) : (
          <GroupAvatar members={entry.members} size={FACE} ringColor={ink.card} />
        )}
        <View style={[styles.rowBody, !first && styles.line]}>
          <View style={styles.flex}>
            <InkText variant="bodyStrong" lines={1}>
              {entry.name}
            </InkText>
            {preview ? (
              <InkText variant="sub" lines={1}>
                {preview}
              </InkText>
            ) : null}
          </View>
          <View style={styles.count}>
            <InkText variant="caption" color={ink.onBadge}>
              {count > 99 ? '99+' : count}
            </InkText>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
});

/**
 * Empty dashed "+" slot shown during widget edit mode; slides smoothly out of the way when a
 * dragged widget hovers over it.
 */
const EmptySlot = memo(function EmptySlot({
  index,
  width,
  height,
  slideX,
  slideY,
  committedRef,
  activeDrag,
  label,
  onPress,
}: {
  index: number;
  width: number;
  height: number;
  slideX: number;
  slideY: number;
  committedRef: React.MutableRefObject<boolean>;
  activeDrag: number | null;
  label: string;
  onPress: (index: number) => void;
}) {
  const still = useReducedMotion();
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);

  useEffect(() => {
    if (activeDrag === null && committedRef.current) {
      sx.value = 0;
      sy.value = 0;
      return;
    }
    sx.value = still ? slideX : withSpring(slideX, SLIDE_SPRING);
    sy.value = still ? slideY : withSpring(slideY, SLIDE_SPRING);
  }, [slideX, slideY, activeDrag, committedRef, still, sx, sy]);

  const animStyle = useAnimatedStyle(() => ({
    zIndex: 1,
    transform: [{ translateX: sx.value }, { translateY: sy.value }],
  }));

  return (
    <Animated.View entering={still ? undefined : FadeIn.duration(160)} style={animStyle}>
      <PressableScale
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => onPress(index)}
        style={[styles.empty, { width, height }]}>
        <SoftGlass style={styles.round}>
          <Ionicons name="add" size={24} color={ink.text} />
        </SoftGlass>
      </PressableScale>
    </Animated.View>
  );
});

/**
 * The scroll edge under the status bar (iOS 26 scroll edge effect, as a gradient: a live blur on
 * Android redraws the whole screen each frame on a Galaxy A51).
 */
function TopEdge({ mode, solid, height }: { mode: 'none' | 'photo' | 'ground'; solid: number; height: number }) {
  const still = useReducedMotion();
  const shown = useSharedValue(0);
  useEffect(() => {
    const to = mode === 'none' ? 0 : 1;
    shown.value = still ? to : withTiming(to, { duration: 160 });
  }, [mode, still, shown]);
  const fade = useAnimatedStyle(() => ({ opacity: shown.value }));
  const veil = mode === 'ground' ? TOP_EDGE_GROUND : TOP_EDGE_PHOTO;
  return (
    <Animated.View pointerEvents="none" style={[styles.topEdge, { height }, fade]}>
      <LinearGradient colors={veil} locations={[0, solid / height, 1]} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}
const TOP_EDGE_PHOTO = ['rgba(10,12,20,1)', 'rgba(10,12,20,1)', 'rgba(10,12,20,0)'] as const;
const TOP_EDGE_GROUND = ['rgba(9,9,13,1)', 'rgba(9,9,13,1)', 'rgba(9,9,13,0)'] as const;

function PhotoGlass({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return <View style={[style, styles.photoGlass]}>{children}</View>;
}

function SoftGlass({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return <View style={[style, styles.softGlass]}>{children}</View>;
}

/**
 * One filled widget slot. In edit mode it jiggles, wears a "−", opens the replacement gallery on a
 * quick tap, and lifts on hold-drag so neighbours slide into its vacated cell live under the finger
 * before release (60-120 FPS pure UI-thread worklets, elevated zIndex so Row 1 never slips under Row 2).
 */
const Slot = memo(function Slot({
  index,
  width,
  height,
  gap,
  kind,
  editing,
  dragging,
  slideX,
  slideY,
  committedRef,
  onStartEditing,
  onReplace,
  onRemove,
  onDragStart,
  onDragHover,
  onDragCommit,
  onDragEnd,
}: {
  index: number;
  width: number;
  height: number;
  gap: number;
  kind: WidgetKind;
  editing: boolean;
  dragging: boolean;
  slideX: number;
  slideY: number;
  committedRef: React.MutableRefObject<boolean>;
  onStartEditing: () => void;
  onReplace: (index: number) => void;
  onRemove: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragHover: (hover: number | null) => void;
  onDragCommit: (from: number, to: number) => void;
  onDragEnd: () => void;
}) {
  const { t } = useTranslation();
  const still = useReducedMotion();
  const tilt = useSharedValue(0);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const liftScale = useSharedValue(1);
  const elevated = useSharedValue(0);
  const hover = useSharedValue(-1);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);

  useEffect(() => {
    if (editing && !still && !dragging) {
      const way = index % 2 ? -1 : 1;
      tilt.value = withRepeat(
        withSequence(withTiming(1.1 * way, { duration: 130 }), withTiming(-1.1 * way, { duration: 130 })),
        -1,
        true,
      );
    } else {
      cancelAnimation(tilt);
      tilt.value = withTiming(0, { duration: 110 });
    }
  }, [editing, still, dragging, index, tilt]);

  useEffect(() => {
    if (!dragging && committedRef.current && slideX === 0 && slideY === 0) {
      sx.value = 0;
      sy.value = 0;
      return;
    }
    sx.value = still ? slideX : withSpring(slideX, SLIDE_SPRING);
    sy.value = still ? slideY : withSpring(slideY, SLIDE_SPRING);
  }, [slideX, slideY, dragging, committedRef, still, sx, sy]);

  const drag = Gesture.Pan()
    .enabled(editing)
    .activateAfterLongPress(130)
    .onStart(() => {
      'worklet';
      hover.value = -1;
      elevated.value = 1;
      liftScale.value = still ? 1.03 : withSpring(1.06, LIFT_SPRING);
      runOnJS(onDragStart)(index);
    })
    .onUpdate((e) => {
      'worklet';
      dx.value = e.translationX;
      dy.value = e.translationY;
      const fromX = (index % 2) * (width + gap);
      const fromY = Math.floor(index / 2) * (height + gap);
      const cx = fromX + width / 2 + e.translationX;
      const cy = fromY + height / 2 + e.translationY;
      let found = -1;
      for (let i = 0; i < TODAY_SLOTS; i++) {
        if (i === index) continue;
        const ox = (i % 2) * (width + gap);
        const oy = Math.floor(i / 2) * (height + gap);
        if (cx >= ox && cx <= ox + width && cy >= oy && cy <= oy + height) {
          found = i;
          break;
        }
      }
      if (found !== hover.value) {
        hover.value = found;
        runOnJS(onDragHover)(found >= 0 ? found : null);
      }
    })
    .onEnd((e) => {
      'worklet';
      const target = hover.value;
      if (target >= 0 && target !== index) {
        const fromX = (index % 2) * (width + gap);
        const fromY = Math.floor(index / 2) * (height + gap);
        const toX = (target % 2) * (width + gap);
        const toY = Math.floor(target / 2) * (height + gap);
        dx.value = e.translationX - (toX - fromX);
        dy.value = e.translationY - (toY - fromY);
        dx.value = still ? 0 : withSpring(0, SLIDE_SPRING);
        dy.value = still ? 0 : withSpring(0, SLIDE_SPRING);
        runOnJS(onDragCommit)(index, target);
      } else {
        dx.value = still ? 0 : withSpring(0, SLIDE_SPRING);
        dy.value = still ? 0 : withSpring(0, SLIDE_SPRING);
        runOnJS(onDragEnd)();
      }
    })
    .onFinalize(() => {
      'worklet';
      hover.value = -1;
      liftScale.value = still
        ? 1
        : withSpring(1, LIFT_SPRING, (finished) => {
            if (finished) elevated.value = 0;
          });
      if (still) elevated.value = 0;
    });

  const moving = useAnimatedStyle(() => ({
    zIndex: elevated.value ? 30 : 1,
    transform: [
      { translateX: dx.value + sx.value },
      { translateY: dy.value + sy.value },
      { scale: liftScale.value },
      { rotate: `${tilt.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={drag}>
      <Animated.View entering={still ? undefined : FadeIn.duration(160)} style={[{ width, height }, moving]}>
        <LiveWidget
          kind={kind}
          height={height}
          editing={editing}
          onPress={editing ? () => onReplace(index) : undefined}
          onLongPress={
            editing
              ? noop
              : () => {
                  haptic.lift();
                  onStartEditing();
                }
          }
        />
        {editing && !dragging ? (
          <PressableScale
            scaleTo={0.88}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('home.widget.remove', { name: widgetLabel(kind, t) })}
            onPress={() => onRemove(index)}
            style={styles.minus}>
            <Ionicons name="remove" size={16} color={ink.text} />
          </PressableScale>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  keepsake: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  topEdge: { position: 'absolute', top: 0, left: 0, right: 0 },
  flex: { flex: 1, minWidth: 0 },
  bar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: Math.ceil(LOGO_MAX - LOGO_BELOW_MID - 44 / 2),
  },
  logo: { flex: 1, minWidth: 0, height: CAPSULE },
  me: { width: CAPSULE, height: CAPSULE, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'center' },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.badge,
  },
  photoGlass: { backgroundColor: ink.photoGlass, borderWidth: StyleSheet.hairlineWidth, borderColor: ink.photoGlassRim },
  softGlass: { backgroundColor: ink.raised },
  round: { width: 44, height: 44, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'center' },
  done: {
    alignSelf: 'flex-end',
    height: 44,
    marginTop: space.md,
    marginRight: space.lg,
    paddingHorizontal: 18,
    borderRadius: 22,
    justifyContent: 'center',
    backgroundColor: inkPeachGlass.ctaSolid,
    borderWidth: 1,
    borderColor: inkPeachGlass.ctaRim,
  },
  card: {
    marginHorizontal: space.lg,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  firstCard: { marginTop: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: space.lg, minHeight: 64 },
  rowBody: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingRight: space.lg,
    paddingVertical: 10,
    minHeight: 64,
  },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ink.line },
  faces: { width: FACE, flexDirection: 'row', alignItems: 'center' },
  overlap: { marginLeft: -18 },
  tabular: { fontVariant: ['tabular-nums'] },
  count: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.badge,
  },
  noteIcon: { width: FACE, height: FACE, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: SUN_WASH },
  widgetBlock: { marginTop: space.xl },
  widgets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingHorizontal: space.lg },
  empty: {
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: ink.text3,
    backgroundColor: ink.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minus: {
    position: 'absolute',
    left: -7,
    top: -7,
    width: 26,
    height: 26,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.card,
    borderWidth: 1,
    borderColor: ink.line,
  },
  solo: { paddingRight: space.lg, paddingVertical: 10, minHeight: 72 },
  moreRow: { marginTop: space.md, minHeight: 60, paddingRight: space.lg },
  moodRow: { minHeight: 60, paddingRight: space.lg },
  moodAfter: { marginTop: space.md },
  moodIcon: { width: FACE, height: FACE, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: ink.raised },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: inkRadius.pill,
    paddingHorizontal: 6,
    backgroundColor: ink.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingBottom: space.lg },
  galleryItem: { width: '47%', gap: space.sm },
  galleryFrame: { borderRadius: inkRadius.card, borderCurve: 'continuous', overflow: 'hidden' },
  galleryCurrent: { borderWidth: 2, borderColor: inkPeachGlass.rim },
  used: { opacity: 0.42 },
  galleryLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
});
