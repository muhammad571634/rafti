import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BRAND } from '@/assets/brand/registry';
import {
  Anim,
  CharacterAvatar,
  EmptyState,
  Header,
  IconButton,
  PressableScale,
  Screen,
  Sheet,
  Txt,
} from '@/components/ui';
import { diaryDate, relativeStamp } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { avatarGradients, colors, gradients, radius, shadows, space } from '@/theme';
import type { DiaryEntry } from '@/types';

const MOOD_EMOJI: Record<DiaryEntry['mood'], string> = {
  happy: '\u{1F60A}',
  soft: '\u{1F338}',
  blue: '\u{1F327}\u{FE0F}',
  excited: '\u{2728}',
  tired: '\u{1F634}',
};

/** Swipe distance that flips to the next page. */
const FLIP_AT = 80;

export default function DiaryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const diary = useAppStore((s) => s.diary);
  const characters = useAppStore((s) => s.characters);

  const [newestFirst, setNewestFirst] = useState(true);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState<DiaryEntry | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);

  const entries = useMemo(
    () =>
      [...diary].sort((a, b) => {
        const diff = b.date.localeCompare(a.date);
        return newestFirst ? diff : -diff;
      }),
    [diary, newestFirst],
  );

  const current = entries[Math.min(index, entries.length - 1)];
  const cardWidth = Math.min(280, width * 0.7);
  const replyAuthor = open?.reply ? characters.find((c) => c.id === open.reply?.characterId) : undefined;

  const step = (delta: number) =>
    setIndex((i) => (entries.length ? (i + delta + entries.length) % entries.length : 0));

  // The three pages behind the current one, deepest first.
  const deck = entries.length
    ? Array.from({ length: Math.min(4, entries.length) }, (_, d) => entries[(index + d) % entries.length]).reverse()
    : [];

  return (
    <Screen background={gradients.diary}>
      <Header
        title={t('diary.title')}
        center
        right={
          <View style={styles.headerRight}>
            <IconButton
              icon="swap-vertical"
              size={20}
              accessibilityLabel={t('a11y.sortPages')}
              onPress={() => {
                setNewestFirst((v) => !v);
                setIndex(0);
              }}
            />
            <IconButton
              icon="information-circle-outline"
              size={21}
              onPress={() => setInfoOpen(true)}
              accessibilityLabel={t('a11y.about')}
            />
          </View>
        }
      />

      {current ? (
        <PressableScale style={styles.datePill} scaleTo={0.96} onPress={() => setDatesOpen(true)}>
          <Txt variant="smallStrong" color={colors.textSecondary}>
            {diaryDate(current.date)}
          </Txt>
          <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
        </PressableScale>
      ) : null}

      {entries.length === 0 ? (
        <EmptyState
          title={t('diary.empty')}
          hint={t('diary.emptyHint')}
          actionLabel={t('diary.write')}
          onAction={() => router.push('/diary/write')}
        />
      ) : (
        <View style={styles.stackWrap}>
          <View style={[styles.stack, { width: cardWidth, height: cardWidth * 1.32 }]}>
            {deck.map((entry, i) => {
              const depth = deck.length - 1 - i;
              return (
                <DiaryCard
                  key={`${entry.id}-${depth}`}
                  entry={entry}
                  width={cardWidth}
                  depth={depth}
                  onOpen={() => setOpen(entry)}
                  onFlip={step}
                />
              );
            })}
          </View>
          <Txt variant="caption" color={colors.textMuted} style={styles.counter}>
            {index + 1} / {entries.length}
          </Txt>
        </View>
      )}

      <PressableScale
        style={[styles.fab, shadows.raised]}
        scaleTo={0.9}
        haptic
        accessibilityLabel={t('diary.write')}
        onPress={() => router.push('/diary/write')}>
        <Ionicons name="add" size={30} color={colors.text} />
      </PressableScale>

      <Sheet visible={!!open} onClose={() => setOpen(null)} title={open?.title}>
        {open ? (
          <ScrollView style={styles.entryScroll} showsVerticalScrollIndicator={false}>
            <Txt variant="caption" color={colors.textMuted}>
              {diaryDate(open.date)} {'·'} {MOOD_EMOJI[open.mood]} {t(`diary.moods.${open.mood}`)}
            </Txt>
            <Txt variant="body" style={styles.entryBody}>
              {open.body}
            </Txt>
            {open.images.length ? (
              <View style={styles.images}>
                {open.images.map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.image} contentFit="cover" />
                ))}
              </View>
            ) : null}

            {open.reply && replyAuthor ? (
              <View style={styles.reply}>
                <View style={styles.replyHead}>
                  <CharacterAvatar character={replyAuthor} size={26} />
                  <Txt variant="smallStrong" color={colors.primary} style={styles.flex}>
                    {t('diary.replyTitle', { name: replyAuthor.name })}
                  </Txt>
                  <Txt variant="tiny" color={colors.textFaint}>
                    {relativeStamp(open.reply.createdAt)}
                  </Txt>
                </View>
                <Txt variant="small" color={colors.textSecondary}>
                  {open.reply.text}
                </Txt>
              </View>
            ) : open.sharedWithCharacterId ? (
              <View style={styles.pending}>
                <Anim name="typing" size={30} tint={colors.textFaint} />
                <Txt variant="small" color={colors.textMuted}>
                  {t('common.thinking')}
                </Txt>
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </Sheet>

      <Sheet visible={datesOpen} onClose={() => setDatesOpen(false)} title={t('diary.pages', { count: entries.length })}>
        {/* One page per day adds up fast: a virtualised list, not a mapped ScrollView. */}
        <FlatList
          style={styles.entryScroll}
          data={entries}
          keyExtractor={(entry) => entry.id}
          initialNumToRender={12}
          renderItem={({ item: entry, index: i }) => (
            <PressableScale
              style={styles.dateRow}
              onPress={() => {
                setIndex(i);
                setDatesOpen(false);
              }}>
              <Txt variant="body">{MOOD_EMOJI[entry.mood]}</Txt>
              <View style={styles.flex}>
                <Txt variant="bodyStrong" lines={1}>
                  {entry.title || t('diary.myDiary')}
                </Txt>
                <Txt variant="caption" color={colors.textMuted}>
                  {diaryDate(entry.date)}
                </Txt>
              </View>
              {i === index ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
            </PressableScale>
          )}
        />
      </Sheet>

      <Sheet visible={infoOpen} onClose={() => setInfoOpen(false)} title={t('diary.info')}>
        <Txt variant="body" color={colors.textSecondary} style={styles.infoBody}>
          {t('diary.infoBody')}
        </Txt>
      </Sheet>
    </Screen>
  );
}

function DiaryCard({
  entry,
  width,
  depth,
  onOpen,
  onFlip,
}: {
  entry: DiaryEntry;
  width: number;
  depth: number;
  onOpen: () => void;
  onFlip: (delta: number) => void;
}) {
  const { t } = useTranslation();
  const tint = avatarGradients[(entry.accentIndex + depth * 2) % avatarGradients.length];
  const front = depth === 0;

  const dx = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(front)
    .activeOffsetX([-12, 12])
    .onUpdate((e) => {
      dx.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > FLIP_AT) {
        const dir = e.translationX < 0 ? 1 : -1;
        dx.value = withTiming(-dir * width * 1.2, { duration: 180 }, () => scheduleOnRN(onFlip, dir));
      } else {
        dx.value = withSpring(0, { damping: 16 });
      }
    });

  const tap = Gesture.Tap()
    .enabled(front)
    .onEnd(() => scheduleOnRN(onOpen));

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }, { rotate: `${dx.value / 22}deg` }],
  }));

  return (
    // The fan offset lives on a wrapper; the drag transform on the inner card.
    <View
      style={[
        styles.cardPos,
        {
          width,
          zIndex: 10 - depth,
          transform: [
            { translateX: depth * (depth % 2 === 0 ? -12 : 12) },
            { translateY: depth * -7 },
            { rotate: `${depth * (depth % 2 === 0 ? -4.5 : 4.5)}deg` },
            { scale: 1 - depth * 0.03 },
          ],
        },
      ]}>
      <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
        <Animated.View style={[styles.card, shadows.raised, front && dragStyle]}>
          {/* Every page shares Rafti's cover; the ribbon tells them apart. */}
          <Image source={BRAND.diaryCover} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[styles.ribbon, { backgroundColor: tint[1] }]} />
          <View style={styles.cardDate}>
            <Txt variant="tiny" color={colors.textSecondary}>
              {entry.date.slice(5).replace('-', '.')}
            </Txt>
          </View>
          <Txt variant="title" color={colors.paperText} center style={styles.cardTitle} lines={2}>
            {entry.title || t('diary.myDiary')}
          </Txt>
          {entry.sharedWithCharacterId ? (
            <Ionicons
              name={entry.reply ? 'mail-open' : 'mail'}
              size={18}
              color={colors.primary}
              style={styles.cardMail}
            />
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRight: { flexDirection: 'row' },
  datePill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.lg,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.75)',
    ...shadows.card,
  },
  stackWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: space.huge },
  stack: { alignItems: 'center', justifyContent: 'center' },
  counter: { marginTop: space.xxl },
  cardPos: { position: 'absolute' },
  card: {
    aspectRatio: 0.76,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: colors.paper,
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    right: space.xl,
    width: 14,
    height: 44,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  cardDate: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  // The cover art keeps its top third clear for the title.
  cardTitle: {
    position: 'absolute',
    top: '14%',
    left: space.lg,
    right: space.lg,
    fontStyle: 'italic',
  },
  cardMail: { position: 'absolute', right: space.md, bottom: space.lg },
  fab: {
    position: 'absolute',
    right: space.xl,
    bottom: space.xxxl,
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryScroll: { maxHeight: 440 },
  entryBody: { marginTop: space.md, lineHeight: 22 },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  image: { width: 96, height: 96, borderRadius: radius.md },
  reply: {
    marginTop: space.xl,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    gap: space.sm,
  },
  replyHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pending: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xl },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  infoBody: { marginBottom: space.lg },
});
