import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { AVATARS } from '@/assets/avatars/registry';
import { BRAND } from '@/assets/brand/registry';
import { HEROES } from '@/assets/heroes/registry';
import { CalendarPopover, DiaryRulesSheet } from '@/components/diary';
import { Button, Header, IconButton, PressableScale, Screen, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { dateFromKey, dayKey } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { avatarGradients, colors, HEADER_HEIGHT, radius, shadows, space } from '@/theme';
import type { Character, CharacterDiaryPage } from '@/types';

const GAP = space.md;
/** Height of the date pill, for placing the calendar under it. */
const PILL = 38;
/** How far the covers beside the one in front lean, like a fanned deck. */
const TILT = 7;

type Card =
  | { kind: 'mine'; id: 'mine'; pages: number; lastDate?: string }
  | {
      kind: 'character';
      id: string;
      character: Character;
      conversationId?: string;
      /** Their page on the chosen day, if any */
      onDay?: CharacterDiaryPage;
      /** Their latest page up to the chosen day */
      last?: CharacterDiaryPage;
      count: number;
      isNew: boolean;
    };

/**
 * Heartbeat diary: one cover per diary in a fanned carousel, yours first (calm cards,
 * docs/design-style.md). Swipe or tap the arrows; the date pill opens the calendar; the
 * one button below always says what the cover in front leads to: write, read, the last
 * page, or a chat to start one.
 */
export default function DiaryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const pages = useAppStore((s) => s.characterDiary);
  const read = useAppStore((s) => s.diaryPagesRead);
  const myDiary = useAppStore((s) => s.diary);
  const writeDuePages = useAppStore((s) => s.writeDueDiaryPages);

  // A new morning may have brought pages for yesterday's chats.
  useFocusEffect(useCallback(() => writeDuePages(), [writeDuePages]));

  const today = dayKey();
  const [day, setDay] = useState(today);
  const [newestFirst, setNewestFirst] = useState(true);
  const [active, setActive] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const cardW = Math.min(260, Math.round(width * 0.66));
  const cardH = Math.round(cardW * 1.46);
  const step = cardW + GAP;

  const listRef = useRef<FlatList<Card>>(null);
  const scrollX = useSharedValue(0);

  const cards = useMemo<Card[]>(() => {
    const mine = myDiary.filter((d) => d.date <= day);
    const lastMine = mine.reduce<string | undefined>((acc, d) => (!acc || d.date > acc ? d.date : acc), undefined);

    const people = conversations
      .map((conv) => {
        const character = characters.find((c) => c.id === conv.characterId);
        if (!character) return null;
        const theirs = pages
          .filter((p) => p.characterId === character.id && p.date <= day)
          .sort((a, b) => b.date.localeCompare(a.date));
        const onDay = theirs.find((p) => p.date === day);
        return {
          kind: 'character' as const,
          id: character.id,
          character,
          conversationId: conv.id,
          onDay,
          last: theirs[0],
          count: theirs.length,
          isNew: !!onDay && day === today && !read.includes(onDay.id),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => {
        // A diary with no page yet always waits at the end.
        if (!a.last || !b.last) return a.last ? -1 : b.last ? 1 : 0;
        const diff = b.last.date.localeCompare(a.last.date);
        return newestFirst ? diff : -diff;
      });

    return [{ kind: 'mine', id: 'mine', pages: mine.length, lastDate: lastMine }, ...people];
  }, [characters, conversations, pages, read, myDiary, day, today, newestFirst]);

  const current = cards[Math.min(active, cards.length - 1)];

  // Every day that has a page, yours or theirs, gets a dot in the calendar.
  const marked = useMemo(
    () => new Set([...pages.map((p) => p.date), ...myDiary.map((d) => d.date)]),
    [pages, myDiary],
  );

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  useAnimatedReaction(
    () => Math.round(scrollX.value / step),
    (index, prev) => {
      if (index !== prev) scheduleOnRN(setActive, index);
    },
    [step],
  );

  const scrollTo = (index: number) => listRef.current?.scrollToOffset({ offset: index * step, animated: true });

  const resetTo = (fn: () => void) => {
    fn();
    setActive(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const shortDate = (key: string) =>
    dateFromKey(key).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' });

  const open = (card: Card) => {
    if (card.kind === 'mine') return router.push('/diary/mine');
    const page = card.onDay ?? card.last;
    if (page) return router.push({ pathname: '/diary/page/[characterId]', params: { characterId: card.id, date: page.date } });
    if (card.conversationId) router.push(`/chat/${card.conversationId}`);
  };

  const act = (card: Card) => (card.kind === 'mine' ? router.push('/diary/write') : open(card));

  const firstName = (c: Character) => shortName(c.name);

  const line = (card: Card) => {
    if (card.kind === 'mine') {
      return card.lastDate
        ? t('diary.lineMine', { count: card.pages, date: shortDate(card.lastDate) })
        : t('diary.lineMineEmpty');
    }
    const name = firstName(card.character);
    if (card.onDay) return day === today ? t('diary.lineNewToday', { name }) : t('diary.lineOnDay', { name });
    if (card.last) return t('diary.lineLast', { date: shortDate(card.last.date) });
    return day === today ? t('diary.lineLockedToday', { name }) : t('diary.lineLockedDay', { name });
  };

  const cta = (card: Card) => {
    if (card.kind === 'mine') return t('diary.writeToday');
    if (card.onDay) return day === today ? t('diary.readToday') : t('diary.readThis');
    if (card.last) return t('diary.openLast');
    return t('diary.chatWith', { name: firstName(card.character) });
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header
        title={t('diary.title')}
        right={
          <View style={styles.headerRight}>
            <IconButton
              icon="swap-vertical"
              size={20}
              accessibilityLabel={newestFirst ? t('diary.sortOldest') : t('diary.sortNewest')}
              onPress={() => resetTo(() => setNewestFirst((v) => !v))}
            />
            <IconButton
              icon="information-circle-outline"
              size={21}
              accessibilityLabel={t('diary.rulesTitle')}
              onPress={() => setRulesOpen(true)}
            />
          </View>
        }
      />

      <PressableScale
        style={[styles.datePill, calendarOpen && styles.datePillOpen]}
        scaleTo={0.96}
        accessibilityLabel={t('diary.calendar')}
        onPress={() => setCalendarOpen(true)}>
        <Ionicons name="calendar-outline" size={16} color={colors.text} />
        <Txt variant="smallStrong">{shortDate(day)}</Txt>
        <Ionicons name={calendarOpen ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textSecondary} />
      </PressableScale>

      <View style={styles.middle}>
        <View>
          <Animated.FlatList
            ref={listRef}
            data={cards}
            keyExtractor={(c) => c.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={step}
            decelerationRate="fast"
            disableIntervalMomentum
            onScroll={onScroll}
            scrollEventThrottle={16}
            style={{ height: cardH + space.xxxl }}
            contentContainerStyle={{ paddingHorizontal: (width - cardW) / 2, alignItems: 'center', gap: GAP }}
            renderItem={({ item, index }) => (
              <CoverCard
                card={item}
                index={index}
                step={step}
                width={cardW}
                height={cardH}
                scrollX={scrollX}
                onPress={() => (index === active ? open(item) : scrollTo(index))}
              />
            )}
          />
          {active > 0 ? (
            <Arrow side="left" label={t('diary.prevDiary')} onPress={() => scrollTo(active - 1)} />
          ) : null}
          {active < cards.length - 1 ? (
            <Arrow side="right" label={t('diary.nextDiary')} onPress={() => scrollTo(active + 1)} />
          ) : null}
        </View>

        <View style={styles.dots}>
          {cards.map((c, i) => (
            <View key={c.id} style={[styles.dot, i === active && styles.dotOn]} />
          ))}
        </View>

        {current ? (
          <Txt variant="body" color={colors.textSecondary} center style={styles.line}>
            {line(current)}
          </Txt>
        ) : null}
      </View>

      {current ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.xl) }]}>
          <Button label={cta(current)} size="lg" full onPress={() => act(current)} />
        </View>
      ) : null}

      <CalendarPopover
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        value={day}
        onChange={(key) => resetTo(() => setDay(key))}
        marked={marked}
        top={insets.top + HEADER_HEIGHT + PILL + space.md}
      />

      <DiaryRulesSheet visible={rulesOpen} onClose={() => setRulesOpen(false)} />
    </Screen>
  );
}

function coverSource(card: Card): number | string | undefined {
  if (card.kind === 'mine') return BRAND.diaryCover;
  return HEROES[card.id] ?? card.character.avatarUri ?? AVATARS[card.id];
}

/** A round white button on the carousel's edge that brings the next cover forward. */
function Arrow({ side, label, onPress }: { side: 'left' | 'right'; label: string; onPress: () => void }) {
  return (
    <PressableScale
      style={[styles.arrow, side === 'left' ? styles.arrowLeft : styles.arrowRight, shadows.card]}
      scaleTo={0.9}
      hitSlop={6}
      accessibilityLabel={label}
      onPress={onPress}>
      <Ionicons name={side === 'left' ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.text} />
    </PressableScale>
  );
}

function CoverCard({
  card,
  index,
  step,
  width,
  height,
  scrollX,
  onPress,
}: {
  card: Card;
  index: number;
  step: number;
  width: number;
  height: number;
  scrollX: SharedValue<number>;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  // The cover in front is full size; its neighbours lean away and fade a little.
  const focus = useAnimatedStyle(() => {
    const p = scrollX.value / step - index;
    return {
      opacity: interpolate(Math.abs(p), [0, 1], [1, 0.55], 'clamp'),
      transform: [
        { scale: interpolate(Math.abs(p), [0, 1], [1, 0.9], 'clamp') },
        { rotate: `${interpolate(p, [-1, 0, 1], [TILT, 0, -TILT], 'clamp')}deg` },
      ],
    };
  });

  const locked = card.kind === 'character' && !card.last;
  const source = coverSource(card);
  const name = card.kind === 'mine' ? t('diary.myDiary') : t('diary.theirDiary', { name: shortName(card.character.name) });
  const meta =
    card.kind === 'mine'
      ? t('diary.onlyYou')
      : locked
        ? t('diary.startsAfterChat')
        : t('diary.pagesAboutYou', { count: card.count });

  return (
    <Animated.View style={[{ width, height }, focus]}>
      <PressableScale style={[styles.card, shadows.raised]} scaleTo={0.97} accessibilityLabel={name} onPress={onPress}>
        <View style={styles.cover}>
          {source != null ? (
            <Image
              source={typeof source === 'string' ? { uri: source } : source}
              style={[StyleSheet.absoluteFill, locked && styles.lockedImage]}
              contentFit="cover"
              contentPosition={card.kind === 'mine' ? 'center' : { left: '68%', top: '30%' }}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor:
                    card.kind === 'character'
                      ? avatarGradients[card.character.accentIndex % avatarGradients.length][0]
                      : colors.primarySofter,
                },
              ]}
            />
          )}

          {card.kind === 'character' && card.isNew ? (
            <View style={[styles.chip, styles.chipNew]}>
              <Txt variant="chip" color={colors.textOnPrimary}>
                {t('diary.newPage')}
              </Txt>
            </View>
          ) : null}
          {locked ? (
            <View style={[styles.chip, styles.chipLocked]}>
              <Ionicons name="lock-closed-outline" size={11} color={colors.text} />
              <Txt variant="chip" color={colors.text}>
                {t('diary.noPageYet')}
              </Txt>
            </View>
          ) : null}
        </View>

        <View style={styles.label}>
          <Txt variant="handTitle" color={colors.text} lines={1}>
            {name}
          </Txt>
          <Txt variant="caption" color={colors.textSecondary} lines={1} style={styles.metaText}>
            {meta}
          </Txt>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const ARROW = 40;

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row' },
  datePill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    height: PILL,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
  },
  datePillOpen: { backgroundColor: colors.surface, borderColor: colors.text },
  middle: { flex: 1, justifyContent: 'center' },
  card: {
    flex: 1,
    borderRadius: 26,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cover: { flex: 3, overflow: 'hidden', backgroundColor: colors.primarySofter },
  lockedImage: { opacity: 0.55 },
  chip: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
  chipNew: { backgroundColor: colors.primary },
  chipLocked: { backgroundColor: colors.surface },
  label: { flex: 1, justifyContent: 'center', paddingHorizontal: space.lg, gap: space.xxs },
  metaText: { fontWeight: '600' },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -ARROW / 2,
    width: ARROW,
    height: ARROW,
    borderRadius: ARROW / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: { left: space.sm },
  arrowRight: { right: space.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.xs + 2, marginTop: space.xs },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  dotOn: { width: 20, backgroundColor: colors.text },
  line: { marginTop: space.md, paddingHorizontal: space.xxxl, minHeight: 42 },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
