import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutRectangle, ScrollView, StyleSheet, View } from 'react-native';
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
import { featuredFriend, TodayHero } from '@/components/today-hero';
import { useWidgetModels, WIDGET_HEIGHT, WIDGET_KINDS, WIDGET_MODULE, WidgetView, type WidgetModel } from '@/components/today/widgets';
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
  type ClayIconName,
} from '@/components/ui';
import { shortName } from '@/lib/format';
import { FREE_SPINS_PER_DAY } from '@/mock';
import { checkInStatus, displayName, useAppStore } from '@/store/use-app-store';
import { aurora, colors, hitSlop, moduleTiles, space, TAB_BAR_HEIGHT } from '@/theme';
import type { WidgetKind } from '@/types';

/** Every module as an app-icon tile; the ones a widget stands in for step aside. */
const TILES: { key: string; icon: ClayIconName; route: string }[] = [
  { key: 'calls', icon: 'calls', route: '/call-history' },
  { key: 'diary', icon: 'diary', route: '/diary' },
  { key: 'date', icon: 'date', route: '/dating' },
  { key: 'sleep', icon: 'bedtime', route: '/bedtime' },
  { key: 'store', icon: 'store', route: '/store/shell' },
  { key: 'photo', icon: 'camera', route: '/photo-booth' },
  { key: 'contacts', icon: 'contacts', route: '/contacts' },
  { key: 'gifts', icon: 'gift', route: '/gifts' },
  { key: 'radio', icon: 'radio', route: '/radio' },
  { key: 'board', icon: 'board', route: '/board' },
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

/**
 * The Today hub on the aurora ground, built from HIG Widgets ("prefer dynamic information that
 * changes throughout the day"; "choose between automatically displaying content and letting
 * people customize"): the date and a large title with glass wallet and profile, the friend you
 * talked with last, one "Waiting for you" row while chats are unread, the user's four widgets,
 * a sealed note when one is ready, then every module no widget stands in for as an app-icon
 * tile, so all ten stay one tap away.
 *
 * Edit like the iPhone Home Screen: a long press on a widget or "Edit" makes the widgets jiggle
 * (still under Reduce Motion), "−" empties a slot, "+" or an empty slot opens the widget
 * gallery, a tap on a widget swaps it for another, and dragging one onto another trades places.
 */
export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

  const dateLine = new Date()
    .toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();

  return (
    <Screen background="aurora">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xxl }}>
        <View style={styles.head}>
          <View style={styles.flex}>
            <Txt style={styles.date} lines={1}>
              {dateLine}
            </Txt>
            <Txt style={styles.title} accessibilityRole="header">
              {t('home.today')}
            </Txt>
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
                <Txt style={styles.doneText}>{t('home.widget.done')}</Txt>
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
                  <Txt style={styles.walletText}>{wallet.shells}</Txt>
                </AuroraGlass>
              </PressableScale>
              <PressableScale
                scaleTo={0.92}
                hitSlop={hitSlop}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.profile')}
                onPress={() => router.push('/profile')}>
                <AuroraGlass style={styles.profile}>
                  <UserAvatar user={user} size={34} />
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
              <Txt style={styles.rowTitle}>{t('home.waiting')}</Txt>
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
                style={[styles.slot, styles.empty]}>
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
                <LinearGradient colors={moduleTiles[tile.key]} style={styles.tile}>
                  <ClayIcon name={tile.icon} size={38} tile={false} />
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
          <View style={styles.galleryGrid}>
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
                  style={[styles.galleryItem, used && styles.used]}>
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
  model,
  editing,
  onLayout,
  onStartEditing,
  onReplace,
  onRemove,
  onDrop,
}: {
  index: number;
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
      <Animated.View style={[styles.slot, moving]} onLayout={(e) => onLayout(e.nativeEvent.layout)}>
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
  head: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  date: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4, color: aurora.textMuted },
  // iOS large title: 34pt bold.
  title: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.4, color: colors.text },
  wallet: { height: 40, paddingHorizontal: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  walletText: { fontSize: 15, fontWeight: '700', color: colors.text },
  profile: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
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
  // Two to a row: half the width less half the gap.
  slot: { width: '48.3%', flexGrow: 1, height: WIDGET_HEIGHT },
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
  // iOS app-icon squircle: ~22% corner radius.
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassLine,
  },
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
  galleryItem: { width: '48%', flexGrow: 1, gap: space.sm },
  used: { opacity: 0.45 },
  galleryLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
});
