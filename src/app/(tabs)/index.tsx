import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutRectangle, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
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

import { BRAND } from '@/assets/brand/registry';
import { DailyRewardSheet } from '@/components/daily-reward-sheet';
import { featuredFriend, TodayHero } from '@/components/today-hero';
import {
  MODULE_ICON,
  useWidgetModels,
  WIDGET_HEIGHT,
  WIDGET_KINDS,
  WIDGET_MODULE,
  WidgetView,
  type WidgetModel,
} from '@/components/today/widgets';
import { useDayKey } from '@/hooks/use-day-key';
import {
  AuroraGlass,
  CharacterAvatar,
  ClayIcon,
  PressableScale,
  Screen,
  Sheet,
  ShellIcon,
  Txt,
  UserAvatar,
} from '@/components/ui';
import { clipName, shortName } from '@/lib/format';
import { FREE_SPINS_PER_DAY } from '@/mock';
import { checkInStatus, displayName, useAppStore } from '@/store/use-app-store';
import { aurora, colors, hitSlop, moduleColors, space, TAB_BAR_HEIGHT } from '@/theme';
import type { WidgetKind } from '@/types';

/** Every module as an app-icon tile; the ones a widget stands in for step aside. */
const TILES: { key: string; route: string }[] = [
  { key: 'calls', route: '/call-history' },
  { key: 'diary', route: '/diary' },
  { key: 'date', route: '/dating' },
  { key: 'sleep', route: '/bedtime' },
  { key: 'store', route: '/store/shell' },
  { key: 'photo', route: '/photo-booth' },
  { key: 'contacts', route: '/contacts' },
  { key: 'gifts', route: '/gifts' },
  { key: 'radio', route: '/radio' },
  { key: 'board', route: '/board' },
];
const TILE_LABEL: Record<string, string> = {
  calls: 'home.short.calls',
  diary: 'home.short.diary',
  date: 'home.short.dating',
  sleep: 'home.short.bedtime',
  store: 'home.short.store',
  photo: 'home.short.photo',
  contacts: 'home.short.contacts',
  gifts: 'home.short.gifts',
  radio: 'home.short.radio',
  board: 'home.short.board',
};
const TILE = 52;
const GALLERY_HEIGHT = 150;
/** The wordmark's tallest size; on narrower phones it shrinks to what the row leaves beside the buttons. */
const LOGO_MAX = 44;

/**
 * The Today hub on the aurora ground, built from HIG Widgets ("prefer dynamic information that
 * changes throughout the day"; "choose between automatically displaying content and letting
 * people customize"): one top row with the Sigmazam wordmark, the glass wallet and your mascot
 * with your name (six letters, the profile shows it whole), the friend you
 * talked with last, one "Waiting for you" row while chats are unread, the user's four widgets,
 * a sealed note when one is ready, then every module no widget stands in for as an app-icon
 * tile, so all ten stay one tap away.
 *
 * Edit like the iPhone Home Screen: a long press on a widget or "Edit" makes the widgets jiggle
 * (still under Reduce Motion), "−" empties a slot, "+" or an empty slot opens the widget
 * gallery, a tap on a widget swaps it for another, and dragging one onto another trades places.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Two widgets to a row on every phone width; percentages plus a fixed gap overflow on narrow Androids.
  const half = Math.floor((width - space.lg * 2 - space.md) / 2);
  const [galleryWidth, setGalleryWidth] = useState(0);
  const galleryHalf = galleryWidth ? Math.floor((galleryWidth - space.md) / 2) : undefined;

  const user = useAppStore((s) => s.user);
  const wallet = useAppStore((s) => s.wallet);
  const conversations = useAppStore((s) => s.conversations);
  const messages = useAppStore((s) => s.messages);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const notes = useAppStore((s) => s.notes);
  const writeDuePages = useAppStore((s) => s.writeDueDiaryPages);
  const slots = useAppStore((s) => s.todayWidgets);
  const setSlots = useAppStore((s) => s.setTodayWidgets);
  const today = useDayKey();
  const spinReady = useAppStore((s) => s.daily.spinDay !== today || s.daily.spinsUsed < FREE_SPINS_PER_DAY);
  const giftWaiting = useAppStore((s) => !checkInStatus(s.daily, today).claimed);
  const models = useWidgetModels();

  const [editing, setEditing] = useState(false);
  /** The slot the gallery fills; null while it is closed. */
  const [gallerySlot, setGallerySlot] = useState<number | null>(null);
  const rects = useRef<LayoutRectangle[]>([]);

  const charactersById = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  const hero = useMemo(
    () => featuredFriend(characters, relationships, conversations, messages),
    [characters, relationships, conversations, messages],
  );

  // Coming back in the morning: pages written overnight should be waiting here.
  useFocusEffect(useCallback(() => writeDuePages(), [writeDuePages]));

  const unread = [...conversations]
    .filter((c) => c.unreadCount > 0)
    .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt))
    .flatMap((c) => {
      const character = charactersById.get(c.characterId);
      return character ? [{ conversation: c, character }] : [];
    });
  const unreadCount = unread.reduce((sum, f) => sum + f.conversation.unreadCount, 0);
  const names = unread.slice(0, 3).map((f) => shortName(displayName(f.character, relationships[f.character.id])));
  const namesLine =
    names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} ${t('home.and')} ${names[names.length - 1]}`;

  const note = notes.find((n) => n.status === 'ready' && charactersById.has(n.characterId));
  const noteFrom = note ? charactersById.get(note.characterId) : undefined;
  const noteName = noteFrom ? shortName(displayName(noteFrom, relationships[noteFrom.id])) : '';

  const covered = new Set(slots.flatMap((k) => (k && WIDGET_MODULE[k] ? [WIDGET_MODULE[k]] : [])));
  const tiles = TILES.filter((tile) => !covered.has(tile.key));
  const firstEmpty = slots.indexOf(null);

  const remove = (i: number) => setSlots(slots.map((k, j) => (j === i ? null : k)));
  const place = (kind: WidgetKind) => {
    if (gallerySlot === null) return;
    setSlots(slots.map((k, j) => (j === gallerySlot ? kind : k)));
    setGallerySlot(null);
  };
  /** A widget dropped with its centre over another slot trades places with it. */
  const drop = (from: number, dx: number, dy: number) => {
    const r = rects.current[from];
    if (!r) return;
    const cx = r.x + r.width / 2 + dx;
    const cy = r.y + r.height / 2 + dy;
    const to = rects.current.findIndex((o) => o && cx >= o.x && cx <= o.x + o.width && cy >= o.y && cy <= o.y + o.height);
    if (to < 0 || to === from) return;
    const next = [...slots];
    [next[from], next[to]] = [next[to], next[from]];
    setSlots(next);
  };

  return (
    <Screen background="aurora">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xxl }}>
        {/* One row: the wordmark takes what the buttons leave, so it fits from the smallest Android to a Pro Max. */}
        <View style={styles.bar}>
          <View style={styles.logo} accessible accessibilityRole="header" accessibilityLabel="Sigmazam">
            <Image source={BRAND.logo} style={styles.fill} contentFit="contain" contentPosition="left" />
          </View>
          {editing ? (
            <>
              {firstEmpty >= 0 ? (
                <PressableScale
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.widget.add')}
                  onPress={() => setGallerySlot(firstEmpty)}>
                  <AuroraGlass style={styles.round}>
                    <Ionicons name="add" size={24} color={colors.text} />
                  </AuroraGlass>
                </PressableScale>
              ) : null}
              <PressableScale scaleTo={0.94} accessibilityRole="button" onPress={() => setEditing(false)} style={styles.done}>
                <Txt style={styles.doneText} maxFontSizeMultiplier={1.3}>
                  {t('home.widget.done')}
                </Txt>
              </PressableScale>
            </>
          ) : (
            <>
              <PressableScale
                scaleTo={0.92}
                hitSlop={hitSlop}
                accessibilityRole="button"
                accessibilityLabel={`${wallet.shells} ${t('common.shells')}`}
                onPress={() => router.push('/store/shell?tab=shells')}>
                <AuroraGlass style={styles.wallet}>
                  <ShellIcon size={18} />
                  <Txt style={styles.walletText} maxFontSizeMultiplier={1.3}>
                    {wallet.shells}
                  </Txt>
                </AuroraGlass>
              </PressableScale>
              <PressableScale
                scaleTo={0.92}
                hitSlop={hitSlop}
                accessibilityRole="button"
                accessibilityLabel={`${t('a11y.profile')}, ${user.displayName}`}
                onPress={() => router.push('/profile')}>
                <AuroraGlass style={styles.me}>
                  <UserAvatar user={user} size={34} />
                  {user.displayName.trim() ? (
                    <Txt style={styles.meName} lines={1} maxFontSizeMultiplier={1.3}>
                      {clipName(user.displayName)}
                    </Txt>
                  ) : null}
                </AuroraGlass>
              </PressableScale>
            </>
          )}
        </View>

        {hero ? <TodayHero friend={hero} onPress={() => router.push(`/chat/${hero.conversation.id}`)} /> : null}

        {unread.length > 0 ? (
          <PressableScale
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={`${t('home.waiting')}, ${namesLine}, ${unreadCount}`}
            onPress={() => router.navigate('/(tabs)/chat')}
            style={[styles.card, styles.waiting]}>
            <View style={styles.faces}>
              {unread.slice(0, 3).map((f, i) => (
                <CharacterAvatar
                  key={f.character.id}
                  character={f.character}
                  size={36}
                  ring
                  ringColor={colors.surface}
                  style={i > 0 && styles.overlap}
                />
              ))}
            </View>
            <View style={styles.flex}>
              <Txt style={styles.rowTitle} lines={1}>
                {t('home.waiting')}
              </Txt>
              <Txt variant="caption" color={aurora.textMuted} lines={1}>
                {namesLine}
              </Txt>
            </View>
            <View style={styles.count}>
              <Txt variant="caption" color={colors.white}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={16} color={aurora.textMuted} />
          </PressableScale>
        ) : null}

        <View style={styles.widgets}>
          {slots.map((kind, i) =>
            kind ? (
              <Slot
                key={`${kind}-${i}`}
                index={i}
                width={half}
                model={models[kind]}
                editing={editing}
                onLayout={(r) => (rects.current[i] = r)}
                onStartEditing={() => setEditing(true)}
                onReplace={() => setGallerySlot(i)}
                onRemove={() => remove(i)}
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
                style={[styles.slot, styles.empty, { width: half }]}>
                <AuroraGlass style={styles.round}>
                  <Ionicons name="add" size={24} color={colors.text} />
                </AuroraGlass>
              </PressableScale>
            ) : null,
          )}
        </View>

        {note && noteFrom ? (
          <PressableScale
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={t('home.todo.note', { name: noteName })}
            onPress={() => router.push(`/secret-note/${noteFrom.id}`)}
            style={[styles.card, styles.noteRow]}>
            <ClayIcon name="secretNote" size={46} tile={false} />
            <View style={styles.flex}>
              <Txt style={styles.rowTitle} lines={1}>
                {t('home.todo.note', { name: noteName })}
              </Txt>
              <Txt variant="caption" color={aurora.textMuted}>
                {t('home.widget.sealed')}
              </Txt>
            </View>
            <CharacterAvatar character={noteFrom} size={34} />
          </PressableScale>
        ) : null}

        <View style={styles.tiles}>
          {tiles.map((tile) => {
            const badge = tile.key === 'gifts' && (spinReady || giftWaiting);
            return (
              <PressableScale
                key={tile.key}
                scaleTo={0.92}
                accessibilityRole="button"
                accessibilityLabel={t(TILE_LABEL[tile.key])}
                onPress={() => router.push(tile.route as never)}
                style={styles.tileCell}>
                <LinearGradient colors={moduleColors[tile.key]} style={styles.tile}>
                  <Ionicons name={MODULE_ICON[tile.key]} size={28} color={colors.white} />
                </LinearGradient>
                {badge ? (
                  <View style={styles.badge}>
                    <Txt style={styles.badgeText}>1</Txt>
                  </View>
                ) : null}
                <Txt style={styles.tileLabel} lines={1}>
                  {t(TILE_LABEL[tile.key])}
                </Txt>
              </PressableScale>
            );
          })}
        </View>

        {editing ? null : (
          <PressableScale scaleTo={0.94} accessibilityRole="button" onPress={() => setEditing(true)} style={styles.editWrap}>
            <AuroraGlass style={styles.edit}>
              <Txt style={styles.editText}>{t('home.widget.edit')}</Txt>
            </AuroraGlass>
          </PressableScale>
        )}
      </ScrollView>

      <Sheet visible={gallerySlot !== null} onClose={() => setGallerySlot(null)} title={t('home.widget.gallery')}>
        <ScrollView style={styles.gallery} showsVerticalScrollIndicator={false}>
          <View style={styles.galleryGrid} onLayout={(e) => setGalleryWidth(e.nativeEvent.layout.width)}>
            {WIDGET_KINDS.map((kind) => {
              const used = slots.includes(kind);
              return (
                <PressableScale
                  key={kind}
                  scaleTo={0.96}
                  disabled={used}
                  accessibilityRole="button"
                  accessibilityLabel={models[kind].label}
                  accessibilityState={{ disabled: used }}
                  onPress={() => place(kind)}
                  style={[styles.galleryItem, { width: galleryHalf }, used && styles.used]}>
                  <WidgetView model={models[kind]} height={GALLERY_HEIGHT} preview />
                  <View style={styles.galleryLabel}>
                    <Txt variant="smallStrong">{models[kind].label}</Txt>
                    {used ? <Ionicons name="checkmark" size={15} color={colors.success} /> : null}
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </ScrollView>
      </Sheet>

      {/* The day's check-in shows here only, never over a chat or another tab. */}
      <DailyRewardSheet />
    </Screen>
  );
}

/**
 * One filled slot. In edit mode it jiggles, wears a "−", opens the gallery on a tap and can be
 * dragged onto another slot; out of it, the widget works as itself and a long press starts
 * editing.
 */
function Slot({
  index,
  width,
  model,
  editing,
  onLayout,
  onStartEditing,
  onReplace,
  onRemove,
  onDrop,
}: {
  index: number;
  width: number;
  model: WidgetModel;
  editing: boolean;
  onLayout: (r: LayoutRectangle) => void;
  onStartEditing: () => void;
  onReplace: () => void;
  onRemove: () => void;
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
      <Animated.View style={[styles.slot, { width }, moving]} onLayout={(e) => onLayout(e.nativeEvent.layout)}>
        <WidgetView model={model} onPress={editing ? onReplace : undefined} onLongPress={editing ? undefined : onStartEditing} />
        {editing ? (
          <PressableScale
            scaleTo={0.88}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('home.widget.remove', { name: model.label })}
            onPress={onRemove}
            style={styles.minus}>
            <Ionicons name="remove" size={16} color={colors.text} />
          </PressableScale>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  // The top row: wordmark, wallet and your capsule, 44pt tall like an iOS bar.
  bar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
  },
  logo: { flex: 1, minWidth: 0, height: LOGO_MAX },
  fill: { width: '100%', height: '100%' },
  wallet: { height: 40, paddingHorizontal: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  walletText: { fontSize: 15, fontWeight: '700', color: colors.text },
  // Your mascot and name in one capsule; the name is cut to six letters (clipName).
  me: { height: 40, paddingLeft: 3, paddingRight: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 7 },
  meName: { fontSize: 15, fontWeight: '600', color: colors.text },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  done: { height: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: 'center', backgroundColor: colors.text },
  doneText: { fontSize: 17, fontWeight: '600', color: colors.textOnInk },
  card: { backgroundColor: colors.surface },
  waiting: {
    marginHorizontal: space.lg,
    marginTop: space.lg,
    height: 64,
    borderRadius: 20,
    paddingLeft: space.md,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  faces: { flexDirection: 'row' },
  overlap: { marginLeft: -12 },
  rowTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  count: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
  },
  widgets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingHorizontal: space.lg, marginTop: space.lg },
  // The width comes from the screen (`half`), so two always fit.
  slot: { height: WIDGET_HEIGHT },
  empty: {
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // iOS's grey remove badge in the corner of a jiggling widget.
  minus: {
    position: 'absolute',
    left: -7,
    top: -7,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  noteRow: {
    marginHorizontal: space.lg,
    marginTop: space.md,
    height: 76,
    borderRadius: 22,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg, paddingHorizontal: space.sm, marginTop: space.xl },
  // Six to a row; more modules (fewer widgets) wrap onto a second row.
  tileCell: { width: `${100 / 6}%`, alignItems: 'center', gap: 6 },
  // iOS app-icon squircle: ~22% corner radius, a white glyph on the module's colour.
  tile: { width: TILE, height: TILE, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -4,
    right: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: aurora.base,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  tileLabel: { fontSize: 11, fontWeight: '500', color: colors.text },
  editWrap: { alignSelf: 'center', marginTop: space.xl },
  edit: { height: 40, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center' },
  editText: { fontSize: 15, fontWeight: '600', color: colors.text },
  gallery: { maxHeight: 560 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingBottom: space.lg },
  galleryItem: { width: '47%', gap: space.sm },
  used: { opacity: 0.45 },
  galleryLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
});
