import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter, useScrollToTop } from 'expo-router';
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutRectangle, ScrollView, type ScrollViewInstance, type StyleProp, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
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
import { featuredFriendOf, heroTopHeight, TodayHero } from '@/components/today-hero';
import { TodayMoreSheet } from '@/components/today/more-apps';
import { hideWelcome, WelcomeBack } from '@/components/today/welcome-back';
import { LiveWidget } from '@/components/today/widget-models';
import { WIDGET_HEIGHT, WIDGET_KINDS, WIDGET_MODULE, widgetLabel } from '@/components/today/widgets';
import { useDayKey } from '@/hooks/use-day-key';
import { useReorderOnly } from '@/hooks/use-reorder-only';
import { CharacterAvatar, ModuleLine, PressableScale, Screen, Sheet, SymbolTile, UserAvatar, type ModuleKey } from '@/components/ui';
import { InkText, listReorder } from '@/components/ink';
import { helplineToday } from '@/lib/daily-note';
import { shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { TODAY_SLOTS } from '@/lib/today';
import { FREE_SPINS_PER_DAY } from '@/mock';
import { checkInStatus, displayName, useAppStore } from '@/store/use-app-store';
import { useFirstSteps } from '@/hooks/use-first-steps';
import { colors, hitSlop, night, space, systemColors, TAB_BAR_HEIGHT } from '@/theme';
import { ink, inkRadius, inkTints } from '@/theme/ink';
import type { Character, Conversation, WidgetKind } from '@/types';

/** The sealed note: the sun's deep tint, its light for the envelope. */
const SUN_WASH = inkTints[2][0];
const SUN_LIGHT = systemColors.yellow;
/** "Waiting for you" lists three chats; more than that ends in one "All chats" row (Chats on Unread). */
const WAITING_ROWS = 3;
/** The gallery shows each widget at its real size, so its words sit as they will on Today. */
const GALLERY_HEIGHT = WIDGET_HEIGHT;
/** The shortest a widget on Today gets (HIG Widgets: an iOS small widget is 158 pt on a 390 pt iPhone). */
const WIDGET_FLOOR = 158;
/** The wordmark's tallest size; on narrower phones it shrinks to what the row leaves beside your capsule. */
const LOGO_MAX = 48;
/** The letters of `sigmazam-logo.png` fill rows 154-351 of 356; this is their middle's height above the art's bottom. */
const LOGO_BELOW_MID = LOGO_MAX * (1 - 252.5 / 356);
/** Your capsule's height; the logo's glass capsule matches it. */
const CAPSULE = 40;
/** A waiting face and the gap after it: the separators start where the words do (iOS inset rows). */
const FACE = 44;
const noop = () => {};

/**
 * The calm Today (design audit 2026-11-15 §6.1, approved prototype `docs/prototypes/today-calm.html`):
 * the friend you talked with last, full bleed to the screen's middle, lit for the hour; "Waiting for
 * you" as one card (each unread chat, then the day's sealed note); four widgets in a 2x2 grid with no
 * title over them (owner, 2026-11-16), the user's pick; and one More row that opens every other module as a deep-tinted icon, with "Choose widgets" under them.
 * Before it was a launcher: a yellow bubble, a note, four widgets and six bright app icons.
 *
 * Edit like the iPhone Home Screen: a long press on a widget or "Choose widgets" makes the widgets
 * jiggle (still under Reduce Motion), "−" empties a slot, "+" or an empty slot opens the widget
 * gallery, a tap on a widget swaps it for another, and dragging one onto the other trades places.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  // Tapping this tab again while it is open scrolls back to the top, as on iOS (the tab bar emits
  // tabPress on the current tab too).
  const scrollRef = useRef<ScrollViewInstance>(null);
  useScrollToTop(scrollRef);
  // Two widgets to a row on every phone width; percentages plus a fixed gap overflow on narrow Androids.
  const half = Math.floor((width - space.lg * 2 - space.md) / 2);
  // Never taller than wide: iOS small widgets are square (HIG Widgets: 158x158 on a 390 pt iPhone), so on
  // narrow phones the four come down a little instead of standing as tall rectangles. 158 is the floor:
  // the contact widget (face, name, line, two buttons) needs ~154 pt, so 360 pt Androids stay at 158.
  const tile = Math.min(WIDGET_HEIGHT, Math.max(half, WIDGET_FLOOR));
  const [galleryWidth, setGalleryWidth] = useState(0);
  /** The picture has scrolled away from under the status bar. */
  const [pastHero, setPastHero] = useState(false);
  /** Anything has scrolled under the status bar: its edge then gets a scrim (`TopEdge`). */
  const [scrolled, setScrolled] = useState(false);
  const galleryHalf = galleryWidth ? Math.floor((galleryWidth - space.md) / 2) : undefined;

  const user = useAppStore((s) => s.user);
  const conversations = useAppStore((s) => s.conversations);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const notes = useAppStore((s) => s.notes);
  const leaveDailyNote = useAppStore((s) => s.leaveDailyNote);
  const writeDuePages = useAppStore((s) => s.writeDueDiaryPages);
  const stored = useAppStore((s) => s.todayWidgets);
  const setSlots = useAppStore((s) => s.setTodayWidgets);
  const today = useDayKey();
  const spinReady = useAppStore((s) => s.daily.spinDay !== today || s.daily.spinsUsed < FREE_SPINS_PER_DAY);
  const giftWaiting = useAppStore((s) => !checkInStatus(s.daily, today).claimed);
  // A first step done and not yet paid lights the gift dot too (0z294).
  const stepWaiting = useFirstSteps().ready;

  // Four slots; older saves are filled to four by the store's v18 migration.
  const slots = useMemo(() => {
    const two = stored.slice(0, TODAY_SLOTS);
    return two.length < TODAY_SLOTS ? [...two, ...Array<null>(TODAY_SLOTS - two.length).fill(null)] : two;
  }, [stored]);

  const [editing, setEditing] = useState(false);
  /** The slot the gallery fills; null while it is closed. */
  const [gallerySlot, setGallerySlot] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const rects = useRef<LayoutRectangle[]>([]);
  /** Where the widgets begin in the scroll, so "Choose widgets" can bring them into view. */
  const widgetsY = useRef(0);

  const charactersById = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  // Worked out once per store change and shared with the widgets that show the same friend.
  const hero = useAppStore(featuredFriendOf);

  // Coming back in the morning: pages written overnight should be waiting here.
  useFocusEffect(useCallback(() => writeDuePages(), [writeDuePages]));
  // And the day's sealed note from the friend on the card (`dailyNoteStep`), once the chats have
  // loaded, and again after midnight if Today stays open.
  const heroId = hero?.character.id;
  const hydrated = useAppStore((s) => s.hydrated);
  useFocusEffect(
    useCallback(() => {
      if (hydrated && heroId && today) leaveDailyNote(heroId);
    }, [hydrated, heroId, today, leaveDailyNote]),
  );

  // Sorted once per change of the chats, not on every render (scrolling sets state). The friend on the
  // picture is left out: their line and count are already on it, so nothing is said twice.
  const heroChat = hero?.conversation.id;
  const unread = useMemo(
    () =>
      conversations
        .filter((c) => c.unreadCount > 0 && c.id !== heroChat)
        .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt))
        .flatMap((c) => {
          const character = charactersById.get(c.characterId);
          return character ? [{ conversation: c, character }] : [];
        }),
    [conversations, charactersById, heroChat],
  );
  // Three rows, or two and an "All chats" row when more wait, so the card never grows past four rows.
  const listed = unread.length > WAITING_ROWS ? unread.slice(0, WAITING_ROWS - 1) : unread;
  const others = unread.slice(listed.length);
  const reorderOnly = useReorderOnly(listed.map((f) => f.conversation.id));

  // The first ready note whose friend is not on a helpline day. Picked in the selector, so Today
  // re-renders when that answer changes, not on every line of every chat (brief Step 3.8).
  const noteId = useAppStore((s) =>
    s.notes.find((n) => {
      if (n.status !== 'ready' || !s.characters.some((c) => c.id === n.characterId)) return false;
      const chatId = s.conversations.find((c) => c.characterId === n.characterId)?.id;
      return !helplineToday((chatId && s.messages[chatId]) || []);
    })?.id,
  );
  const note = useMemo(() => notes.find((n) => n.id === noteId), [notes, noteId]);
  const noteFrom = note ? charactersById.get(note.characterId) : undefined;
  const noteName = noteFrom ? shortName(displayName(noteFrom, relationships[noteFrom.id])) : '';
  const waiting = unread.length > 0 || !!noteFrom;

  // Modules a widget on Today stands in for leave the More sheet.
  const covered = useMemo(
    () => new Set(slots.flatMap((k) => (k && WIDGET_MODULE[k] ? [WIDGET_MODULE[k] as ModuleKey] : []))),
    [slots],
  );
  // A gift waiting marks Gifts in More, and More itself, unless the Gifts widget shows it.
  const giftBadge = (spinReady || giftWaiting || stepWaiting) && !covered.has('gifts');
  const firstEmpty = slots.indexOf(null);
  const anyWidget = firstEmpty < 0 || slots.some(Boolean);

  // Stable handlers, so a filled slot (memo) re-renders only when its own widget or edit mode changes,
  // never because Today re-rendered for an unread chat or the scroll.
  const remove = useCallback((i: number) => setSlots(slots.map((k, j) => (j === i ? null : k))), [slots, setSlots]);
  const place = (kind: WidgetKind) => {
    if (gallerySlot === null) return;
    setSlots(slots.map((k, j) => (j === gallerySlot ? kind : k)));
    setGallerySlot(null);
  };
  /** A widget dropped with its centre over the other slot trades places with it. */
  const drop = useCallback(
    (from: number, dx: number, dy: number) => {
      const r = rects.current[from];
      if (!r) return;
      const cx = r.x + r.width / 2 + dx;
      const cy = r.y + r.height / 2 + dy;
      const to = rects.current.findIndex((o) => o && cx >= o.x && cx <= o.x + o.width && cy >= o.y && cy <= o.y + o.height);
      if (to < 0 || to === from) return;
      const next = [...slots];
      [next[from], next[to]] = [next[to], next[from]];
      setSlots(next);
    },
    [slots, setSlots],
  );
  const keepRect = useCallback((i: number, r: LayoutRectangle) => {
    rects.current[i] = r;
  }, []);
  const startEditing = useCallback(() => setEditing(true), []);
  // From More: the widgets jiggle and come into view under the top row.
  const chooseWidgets = () => {
    setEditing(true);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, widgetsY.current - insets.top - 64), animated: true }));
  };
  const openChat = useCallback((id: string) => router.push(`/chat/${id}`), [router]);

  // With a friend on the card, their picture runs from the screen's top, under the status bar or the
  // Dynamic Island, and this row sits on it as clear glass just below that safe area (owner,
  // 2026-11-03, prototype B); the status bar turns dark again once the picture has scrolled away.
  const onPhoto = !!hero;
  const Glass = onPhoto ? PhotoGlass : SoftGlass;
  const heroBottom = hero ? heroTopHeight(windowHeight) : 0;
  // One row: the mascot in its circle on the leading edge, your face on the trailing one; no words on
  // the picture here (owner, 2026-11-16: the hour shows in its light, your name is in your profile).
  const bar = (
    <View style={styles.bar}>
      {/* No mascot on Today (owner, 2026-11-18): the friend's picture is the face of the screen. */}
      <View style={styles.logo} />
      <PressableScale
        scaleTo={0.92}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={`${t('a11y.profile')}, ${user.displayName}`}
        onPress={() => router.push('/profile')}>
        {/* Your photo in its glass ring, or your initials in clear glass, so the friend's picture shows through. */}
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
            onPress={() => router.push(`/chat/${hero.conversation.id}`)}
          />
        ) : (
          <>
            {bar}
            {/* No friend yet: one way on, to Find (nothing else on Today has anyone to show). */}
            <PressableScale
              scaleTo={0.98}
              accessibilityRole="button"
              onPress={() => router.navigate('/(tabs)/find')}
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
          <>
            {/* No title or count over the card (owner, 2026-11-16): the faces and blue counts say it. */}
            <View style={[styles.card, styles.firstCard]}>
              {listed.map((f, i) => (
                <WaitingRow
                  key={f.conversation.id}
                  conversation={f.conversation}
                  character={f.character}
                  name={displayName(f.character, relationships[f.character.id])}
                  first={i === 0}
                  slide={reorderOnly}
                  onOpen={openChat}
                />
              ))}
              {others.length > 0 ? (
                <PressableScale
                  scaleTo={0.98}
                  accessibilityRole="button"
                  accessibilityLabel={t('a11y.unreadTab', { label: t('home.allChats'), count: others.length })}
                  onPress={() => router.navigate({ pathname: '/(tabs)/chat', params: { filter: 'unread' } })}
                  style={styles.row}>
                  <View style={styles.faces}>
                    {others.slice(0, 2).map((f, i) => (
                      <CharacterAvatar key={f.character.id} character={f.character} size={i ? 30 : 32} style={i > 0 && styles.overlap} />
                    ))}
                  </View>
                  <View style={[styles.rowBody, styles.line]}>
                    <InkText variant="bodyStrong" lines={1} style={styles.flex}>
                      {t('home.allChats')}
                    </InkText>
                    <View style={styles.count}>
                      <InkText variant="caption" color={ink.onAccent}>
                        +{others.length}
                      </InkText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={ink.text3} />
                  </View>
                </PressableScale>
              ) : null}
              {note && noteFrom ? (
                <PressableScale
                  scaleTo={0.98}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('home.todo.note', { name: noteName })}, ${t('home.widget.sealed')}`}
                  onPress={() => router.push(`/secret-note/${noteFrom.id}`)}
                  style={styles.row}>
                  <View style={styles.noteIcon}>
                    <ModuleLine name="note" size={24} color={SUN_LIGHT} />
                  </View>
                  <View style={[styles.rowBody, unread.length > 0 && styles.line]}>
                    <View style={styles.flex}>
                      <InkText variant="bodyStrong" lines={1}>
                        {t('home.todo.note', { name: noteName })}
                      </InkText>
                      <InkText variant="sub" lines={1}>
                        {t('home.widget.sealed')}
                      </InkText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={ink.text3} />
                  </View>
                </PressableScale>
              ) : null}
            </View>
          </>
        ) : null}

        {anyWidget || editing ? (
          <View style={styles.widgetBlock} onLayout={(e) => (widgetsY.current = e.nativeEvent.layout.y)}>
            {/* No title over the widgets (owner, 2026-11-16): they speak for themselves. */}
            <View style={styles.widgets}>
              {slots.map((kind, i) =>
                kind ? (
                  <Slot
                    key={`${kind}-${i}`}
                    index={i}
                    width={half}
                    height={tile}
                    kind={kind}
                    editing={editing}
                    onLayout={keepRect}
                    onStartEditing={startEditing}
                    onReplace={setGallerySlot}
                    onRemove={remove}
                    onDrop={drop}
                  />
                ) : editing ? (
                  <PressableScale
                    key={`empty-${i}`}
                    scaleTo={0.97}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.widget.addHere')}
                    onPress={() => setGallerySlot(i)}
                    onLayout={(e) => (rects.current[i] = e.nativeEvent.layout)}
                    style={[styles.empty, { width: half, height: tile }]}>
                    <SoftGlass style={styles.round}>
                      <Ionicons name="add" size={24} color={ink.text} />
                    </SoftGlass>
                  </PressableScale>
                ) : null,
              )}
            </View>
            {/* Done sits under the widgets it finishes: above them it would push the grid down under
                the finger that just started editing. */}
            {editing ? (
              <PressableScale scaleTo={0.94} accessibilityRole="button" onPress={() => setEditing(false)} style={styles.done}>
                <InkText variant="bodyStrong" color={ink.onPill}>
                  {t('home.widget.done')}
                </InkText>
              </PressableScale>
            ) : null}
          </View>
        ) : null}

        {/* Everything else, one step deeper (audit §6.1); a gift waiting rides on this row. */}
        <PressableScale
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={giftBadge ? t('a11y.unreadTab', { label: t('more.title'), count: 1 }) : t('more.title')}
          onPress={() => setMoreOpen(true)}
          style={[styles.card, styles.row, styles.moreRow, !waiting && !anyWidget && !editing && !!hero && styles.firstCard]}>
          <View style={styles.moreIcon}>
            <Ionicons name="apps" size={19} color={ink.text} />
          </View>
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
          {/* Live previews only while the gallery is open: each one reads the store like a widget. */}
          {gallerySlot !== null &&
            WIDGET_KINDS.map((kind) => {
              const used = slots.includes(kind);
              const label = widgetLabel(kind, t);
              return (
                <PressableScale
                  key={kind}
                  scaleTo={0.96}
                  disabled={used}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ disabled: used }}
                  onPress={() => place(kind)}
                  style={[styles.galleryItem, { width: galleryHalf }, used && styles.used]}>
                  <LiveWidget kind={kind} height={GALLERY_HEIGHT} preview />
                  <View style={styles.galleryLabel}>
                    <InkText variant="subStrong">{label}</InkText>
                    {used ? <Ionicons name="checkmark" size={15} color={colors.success} /> : null}
                  </View>
                </PressableScale>
              );
            })}
        </View>
      </Sheet>

      {/* The day's check-in shows here only, never over a chat or another tab. */}
      <DailyRewardSheet />
      <WelcomeBack />
    </Screen>
  );
}

/**
 * One unread chat in "Waiting for you": their face in a peach ring, their name, the last line, the
 * count in blue; a tap opens that chat. Memo, so a new line in one chat redraws only its own row.
 */
const WaitingRow = memo(function WaitingRow({
  conversation,
  character,
  name,
  first,
  slide,
  onOpen,
}: {
  conversation: Conversation;
  character: Character;
  name: string;
  first: boolean;
  /** The same rows as before, only reordered: this one may slide to its new place. */
  slide: boolean;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  const count = conversation.unreadCount;
  // A friend who writes again moves up the card by sliding, not jumping (§8.2.3).
  return (
    <Animated.View layout={slide ? listReorder : undefined}>
      <PressableScale
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={[t('a11y.unreadTab', { label: name, count }), conversation.lastMessagePreview].filter(Boolean).join(', ')}
        onPress={() => onOpen(conversation.id)}
        style={styles.row}>
        <CharacterAvatar character={character} size={FACE} ring ringColor={night.friendAccent(character.id).strong} />
        <View style={[styles.rowBody, !first && styles.line]}>
          <View style={styles.flex}>
            <InkText variant="bodyStrong" lines={1}>
              {name}
            </InkText>
            {conversation.lastMessagePreview ? (
              <InkText variant="sub" lines={1}>
                {conversation.lastMessagePreview}
              </InkText>
            ) : null}
          </View>
          <View style={styles.count}>
            <InkText variant="caption" color={ink.onAccent}>
              {count > 99 ? '99+' : count}
            </InkText>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
});

/**
 * The scroll edge under the status bar (iOS 26 scroll edge effect, as a gradient: a live blur on
 * Android redraws the whole screen each frame on a Galaxy A51). Without it the hero's line, its
 * "Message" field and then the widgets ran straight under the clock and battery glyphs (owner's
 * screenshots, 2026-11-11). Over the picture it is a dark veil that keeps the light glyphs legible;
 * once the picture is gone it is the ground, under the dark glyphs. Not drawn at rest.
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
// Opaque under the status bar, then a short fade: at 0.96 the hero's name and line still showed as a
// ghost behind the clock once scrolled (A51, design-audit §10).
const TOP_EDGE_PHOTO = ['rgba(10,12,20,1)', 'rgba(10,12,20,1)', 'rgba(10,12,20,0)'] as const;
const TOP_EDGE_GROUND = ['rgba(9,9,13,1)', 'rgba(9,9,13,1)', 'rgba(9,9,13,0)'] as const;

/** Clear glass on the friend's picture (HIG Materials: the clear variant is for rich media). */
function PhotoGlass({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return <View style={[style, styles.photoGlass]}>{children}</View>;
}

/** Apple's fill on the white ground: the round buttons and pills off the picture. */
function SoftGlass({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return <View style={[style, styles.softGlass]}>{children}</View>;
}

/**
 * One filled slot. In edit mode it jiggles, wears a "−", opens the gallery on a tap and can be
 * dragged onto another slot; out of it, the widget works as itself and a long press starts
 * editing. Memo: Today's handlers are stable and take the slot's index.
 */
const Slot = memo(function Slot({
  index,
  width,
  height,
  kind,
  editing,
  onLayout,
  onStartEditing,
  onReplace,
  onRemove,
  onDrop,
}: {
  index: number;
  width: number;
  height: number;
  kind: WidgetKind;
  editing: boolean;
  onLayout: (index: number, r: LayoutRectangle) => void;
  onStartEditing: () => void;
  onReplace: (index: number) => void;
  onRemove: (index: number) => void;
  onDrop: (from: number, dx: number, dy: number) => void;
}) {
  const { t } = useTranslation();
  const still = useReducedMotion();
  const tilt = useSharedValue(0);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const lifted = useSharedValue(0);

  useEffect(() => {
    if (editing && !still) {
      const way = index % 2 ? -1 : 1;
      tilt.value = withRepeat(
        withSequence(withTiming(1.1 * way, { duration: 130 }), withTiming(-1.1 * way, { duration: 130 })),
        -1,
        true,
      );
    } else {
      cancelAnimation(tilt);
      tilt.value = withTiming(0, { duration: 120 });
    }
  }, [editing, still, index, tilt]);

  const drag = Gesture.Pan()
    .enabled(editing)
    .activateAfterLongPress(150)
    .onStart(() => {
      lifted.value = 1;
    })
    .onUpdate((e) => {
      dx.value = e.translationX;
      dy.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(onDrop)(index, e.translationX, e.translationY);
    })
    .onFinalize(() => {
      dx.value = withSpring(0);
      dy.value = withSpring(0);
      lifted.value = 0;
    });

  const moving = useAnimatedStyle(() => ({
    zIndex: lifted.value ? 10 : 0,
    transform: [
      { translateX: dx.value },
      { translateY: dy.value },
      { scale: withTiming(lifted.value ? 1.05 : 1, { duration: 120 }) },
      { rotate: `${tilt.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={drag}>
      <Animated.View style={[{ width, height }, moving]} onLayout={(e) => onLayout(index, e.nativeEvent.layout)}>
        {/* In edit mode a long press still has a handler: without one, the finger that just started
            editing would also open the gallery as it lifts (A51 2026-11-05). */}
        <LiveWidget
          kind={kind}
          height={height}
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
        {editing ? (
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
  topEdge: { position: 'absolute', top: 0, left: 0, right: 0 },
  flex: { flex: 1, minWidth: 0 },
  // The top row under the Dynamic Island: the mascot on the leading edge, your face
  // on the trailing one, 44pt tall like an iOS bar. The top padding is the room the mascot's hair rises into.
  bar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: Math.ceil(LOGO_MAX - LOGO_BELOW_MID - 44 / 2),
  },
  // As tall as the capsule; the wordmark hangs from it so its letters centre on the capsule.
  logo: { flex: 1, minWidth: 0, height: CAPSULE },
  // Your face in a glass circle, as iOS account buttons are (your name is in your profile).
  me: { width: CAPSULE, height: CAPSULE, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'center' },
  photoGlass: { backgroundColor: ink.photoGlass, borderWidth: StyleSheet.hairlineWidth, borderColor: ink.photoGlassRim },
  softGlass: { backgroundColor: ink.raised },
  round: { width: 44, height: 44, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'center' },
  done: {
    alignSelf: 'flex-end',
    height: 44,
    marginTop: space.md,
    marginRight: space.lg,
    paddingHorizontal: 18,
    borderRadius: inkRadius.pill,
    justifyContent: 'center',
    backgroundColor: ink.pill,
  },

  // One card on the night ground, its rows inset like Apple's grouped lists.
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
  // The words and what trails them; its top edge is the separator, so it starts after the face.
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
  count: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.accent,
  },
  noteIcon: { width: FACE, height: FACE, borderRadius: 14, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: SUN_WASH },
  // Same gap as the other cards' rhythm; no title above, so the grid keeps the section's spacing.
  widgetBlock: { marginTop: space.xl },
  // Two to a row: the width comes from the screen (`half`), so two always fit.
  widgets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingHorizontal: space.lg },
  empty: {
    borderRadius: inkRadius.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: ink.text3,
    backgroundColor: ink.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The remove badge in the corner of a jiggling widget.
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
  moreIcon: {
    width: 36,
    height: 36,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.hairlineFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
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
  used: { opacity: 0.45 },
  galleryLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
});
