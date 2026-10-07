import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  Anim,
  Button,
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
import { dateFromKey } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { avatarGradients, colors, palette, radius, space } from '@/theme';
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

/** The user's own pages, as a stack to flip through. Reached from the My diary card. */
export default function MyDiaryScreen() {
  const { t, i18n } = useTranslation();
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
  const cardWidth = Math.min(300, width * 0.78);
  const replyAuthor = open?.reply ? characters.find((c) => c.id === open.reply?.characterId) : undefined;

  const step = (delta: number) =>
    setIndex((i) => (entries.length ? (i + delta + entries.length) % entries.length : 0));

  // The three pages behind the current one, deepest first.
  const deck = entries.length
    ? Array.from({ length: Math.min(4, entries.length) }, (_, d) => entries[(index + d) % entries.length]).reverse()
    : [];

  return (
    <Screen background={colors.bgPlain}>
      <Header
        title={t('diary.myDiary')}
        right={
          <View style={styles.headerRight}>
            <IconButton
              icon="calendar-outline"
              size={20}
              accessibilityLabel={t('diary.pages', { count: entries.length })}
              onPress={() => setDatesOpen(true)}
            />
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
        <PressableScale style={styles.month} scaleTo={1} onPress={() => setDatesOpen(true)}>
          <Txt variant="display">
            {dateFromKey(current.date).toLocaleDateString(i18n.language, { month: 'long' })}
          </Txt>
          <Txt variant="small" color={colors.textMuted}>
            {' · '}
            {t('diary.pages', { count: entries.length })}
          </Txt>
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
                  sharedWith={characters.find((c) => c.id === entry.sharedWithCharacterId)?.name}
                  width={cardWidth}
                  depth={depth}
                  onOpen={() => setOpen(entry)}
                  onFlip={step}
                />
              );
            })}
          </View>
          <Txt variant="caption" color={colors.textMuted} style={styles.counter}>
            {t('diary.swipeHint', { index: index + 1, count: entries.length })}
          </Txt>
        </View>
      )}

      {entries.length ? (
        <View style={styles.footer}>
          <Button
            label={t('diary.writeToday')}
            size="lg"
            full
            left={<Ionicons name="pencil-outline" size={18} color={colors.textOnPrimary} />}
            onPress={() => router.push('/diary/write')}
          />
        </View>
      ) : null}

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
                  <Txt variant="smallStrong" style={styles.flex}>
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
              {i === index ? <Ionicons name="checkmark" size={18} color={colors.text} /> : null}
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
  sharedWith,
  width,
  depth,
  onOpen,
  onFlip,
}: {
  entry: DiaryEntry;
  /** Name of the character the page was shared with, if any. */
  sharedWith?: string;
  width: number;
  depth: number;
  onOpen: () => void;
  onFlip: (delta: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const tint = avatarGradients[entry.accentIndex % avatarGradients.length];
  const front = depth === 0;
  const date = dateFromKey(entry.date);

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
            { translateX: depth * (depth % 2 === 0 ? -10 : 10) },
            { translateY: depth * 6 },
            { rotate: `${depth * (depth % 2 === 0 ? -3.5 : 3.5)}deg` },
          ],
        },
      ]}>
      <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
        {/* The page itself, not a cover: date, title, the first lines, who wrote back.
            Pages behind it stay blank paper, so only one page reads at a time. */}
        <Animated.View style={[styles.card, front && styles.cardFront, front && dragStyle]}>
          {front ? (
            <>
              <View style={styles.cardHead}>
                <Txt variant="display">{String(date.getDate()).padStart(2, '0')}</Txt>
                <Txt variant="small" color={colors.textMuted} style={styles.flex}>
                  {date.toLocaleDateString(i18n.language, { weekday: 'long' })}
                </Txt>
                <View style={[styles.ribbon, { backgroundColor: tint[0] }]} />
              </View>
              <Txt variant="h3" lines={2} style={styles.cardTitle}>
                {entry.title || t('diary.myDiary')}
              </Txt>
              <Txt variant="body" color={colors.textSecondary} lines={6} style={styles.cardBody}>
                {entry.body}
              </Txt>
              {sharedWith ? (
                <View style={styles.cardFoot}>
                  <Ionicons
                    name={entry.reply ? 'mail-open-outline' : 'mail-outline'}
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Txt variant="small" color={colors.textSecondary}>
                    {entry.reply
                      ? t('diary.replyTitle', { name: sharedWith })
                      : t('diary.waitingFor', { name: sharedWith })}
                  </Txt>
                </View>
              ) : null}
            </>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRight: { flexDirection: 'row' },
  month: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: space.lg },
  stackWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stack: { alignItems: 'center', justifyContent: 'center' },
  counter: { marginTop: space.xxl },
  cardPos: { position: 'absolute' },
  card: {
    aspectRatio: 0.76,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: space.xl,
    overflow: 'hidden',
  },
  cardFront: { backgroundColor: palette.cream100 },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  ribbon: { width: 8, height: 22, borderRadius: radius.xs / 2, alignSelf: 'flex-start' },
  cardTitle: { marginTop: space.lg },
  cardBody: { marginTop: space.sm },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: 'auto',
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xl },
  entryScroll: { maxHeight: 440 },
  entryBody: { marginTop: space.md, lineHeight: 22 },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  image: { width: 96, height: 96, borderRadius: radius.md },
  reply: {
    marginTop: space.xl,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    gap: space.sm,
  },
  replyHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pending: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xl },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  infoBody: { marginBottom: space.lg },
});
