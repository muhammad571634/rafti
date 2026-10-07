import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
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
import { BrandArt, Button, Header, IconButton, PressableScale, Screen, Txt } from '@/components/ui';
import { dateFromKey, dayKey } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { avatarGradients, colors, HEADER_HEIGHT, palette, radius, shadows, space } from '@/theme';
import type { Character, CharacterDiaryPage } from '@/types';

const GAP = space.md;
/** Height of the date pill, for placing the calendar under it. */
const PILL = 36;

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
 * Heartbeat diary: one cover per diary in a carousel, yours first. The backdrop
 * takes the colour of the cover in front, and the one button below always says
 * what that cover leads to: write, read, the last page, or a chat to start one.
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

  const today = dayKey();
  const [day, setDay] = useState(today);
  const [newestFirst, setNewestFirst] = useState(true);
  const [active, setActive] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const cardW = Math.min(232, Math.round(width * 0.6));
  const cardH = Math.round(cardW * 1.37);
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

  const firstName = (c: Character) => c.name.split(' ')[0];

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

  const cta = (card: Card): { label: string; icon?: React.ComponentProps<typeof Ionicons>['name'] } => {
    if (card.kind === 'mine') return { label: t('diary.writeToday'), icon: 'pencil-outline' };
    if (card.onDay) return { label: day === today ? t('diary.readToday') : t('diary.readThis') };
    if (card.last) return { label: t('diary.openLast') };
    return { label: t('diary.chatWith', { name: firstName(card.character) }), icon: 'chatbubble-outline' };
  };

  const action = current ? cta(current) : undefined;

  return (
    <Screen
      background={colors.bgPlain}
      backdrop={current ? <Backdrop key={current.id} source={coverSource(current)} /> : null}>
      <Header
        title={t('diary.title')}
        center
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
        <Txt variant="smallStrong">{shortDate(day)}</Txt>
        <Ionicons name={calendarOpen ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textSecondary} />
      </PressableScale>

      <View style={styles.middle}>
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

      {current && action ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.xl) }]}>
          <Button
            label={action.label}
            size="lg"
            full
            left={action.icon ? <Ionicons name={action.icon} size={18} color={colors.textOnPrimary} /> : undefined}
            onPress={() => act(current)}
          />
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
  if (card.kind === 'mine') return BRAND.sticker;
  return HEROES[card.id] ?? card.character.avatarUri ?? AVATARS[card.id];
}

/** The cover in front, blurred to fill the screen behind everything. */
function Backdrop({ source }: { source?: number | string }) {
  if (source == null) return null;
  return (
    <Animated.View entering={FadeIn.duration(320)} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={typeof source === 'string' ? { uri: source } : source}
        style={[StyleSheet.absoluteFill, styles.backdropImage]}
        contentFit="cover"
        blurRadius={60}
      />
      <View style={[StyleSheet.absoluteFill, styles.veil]} />
    </Animated.View>
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

  // The cover in front is full size; its neighbours sit back a little.
  const focus = useAnimatedStyle(() => {
    const d = Math.abs(scrollX.value / step - index);
    return {
      opacity: interpolate(d, [0, 1], [1, 0.7], 'clamp'),
      transform: [{ scale: interpolate(d, [0, 1], [1, 0.88], 'clamp') }],
    };
  });

  const locked = card.kind === 'character' && !card.last;
  const source = coverSource(card);
  const name = card.kind === 'mine' ? t('diary.myDiary') : t('diary.theirDiary', { name: card.character.name.split(' ')[0] });
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
          {card.kind === 'mine' ? (
            <View style={styles.mascotCover}>
              <BrandArt name="sticker" width={width * 0.62} />
            </View>
          ) : source != null ? (
            <Image
              source={typeof source === 'string' ? { uri: source } : source}
              style={[StyleSheet.absoluteFill, locked && styles.lockedImage]}
              contentFit="cover"
              contentPosition={{ left: '68%', top: '30%' }}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: avatarGradients[card.character.accentIndex % avatarGradients.length][0] },
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
              <Ionicons name="lock-closed" size={11} color={colors.textSecondary} />
              <Txt variant="chip" color={colors.textSecondary}>
                {t('diary.noPageYet')}
              </Txt>
            </View>
          ) : null}
        </View>

        <View style={styles.label}>
          <Txt variant="handTitle" color={colors.paperText} lines={1}>
            {name}
          </Txt>
          <Txt variant="caption" color={colors.textMuted} lines={1}>
            {meta}
          </Txt>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row' },
  backdropImage: { opacity: 0.55 },
  veil: { backgroundColor: colors.bgPlain, opacity: 0.35 },
  datePill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: PILL,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.onMediaSoft,
    borderWidth: 1,
    borderColor: colors.white,
  },
  datePillOpen: { backgroundColor: colors.surface },
  middle: { flex: 1, justifyContent: 'center' },
  card: {
    flex: 1,
    borderRadius: radius.xxl,
    borderWidth: 4,
    borderColor: colors.white,
    backgroundColor: palette.cream100,
    overflow: 'hidden',
  },
  cover: { flex: 1, overflow: 'hidden', backgroundColor: colors.primarySofter },
  mascotCover: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: space.md },
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
  chipLocked: { backgroundColor: colors.onMediaButton },
  label: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    backgroundColor: palette.cream100,
    gap: space.xxs,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.xs + 2, marginTop: space.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  dotOn: { width: 18, backgroundColor: colors.text },
  line: { marginTop: space.lg, paddingHorizontal: space.xxxl, minHeight: 42 },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md },
});
