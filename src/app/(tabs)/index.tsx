import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DailyRewardSheet } from '@/components/daily-reward-sheet';
import { featuredFriend, TodayHero } from '@/components/today-hero';
import { useDayKey } from '@/hooks/use-day-key';
import {
  CharacterAvatar,
  ClayIcon,
  CountBadge,
  ListRow,
  Mascot,
  PressableScale,
  Screen,
  SectionLabel,
  ShellBadge,
  Txt,
  UserAvatar,
  type ClayIconName,
} from '@/components/ui';
import { relativeStamp, shortName } from '@/lib/format';
import { planStart } from '@/lib/schedule';
import { FREE_SPINS_PER_DAY, homeModules } from '@/mock';
import { checkInStatus, displayName, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, radius, space, TAB_BAR_HEIGHT, weight } from '@/theme';
import type { Character, Conversation, HomeModule, Relationship } from '@/types';

const CHAT_AVATAR = 48;
/** Art size of the Today and "meet" rows: clay art or a friend's face, no tile. */
const ROW_ICON = 40;
/** Explore icons: large clay art on the bare canvas, four to a row. */
const MODULE_ICON = 68;

/** One 3D clay icon per Explore module, keyed by `HomeModule.key` (docs/icons-3d.md). */
const MODULE_ICONS: Record<string, ClayIconName> = {
  store: 'store',
  dating: 'date',
  diary: 'diary',
  photo: 'camera',
  contacts: 'contacts',
  gifts: 'gift',
  calls: 'calls',
  bedtime: 'bedtime',
  radio: 'radio',
  board: 'board',
};

/** A conversation joined with its character, bond and the name the user knows them by. */
interface ChatItem {
  conversation: Conversation;
  character: Character;
  relationship?: Relationship;
  name: string;
}

/** A small thing the user can do today, shown as a row under "Today". */
interface TodoItem {
  key: string;
  /** A friend's face for things they did; a clay icon for everything else */
  icon: ClayIconName | Character;
  title: string;
  subtitle?: string;
  /** Marks something new since the last visit */
  fresh?: boolean;
  onPress: () => void;
}

/** Which greeting fits the local hour. */
function greetingSlot(hour: number) {
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 16) return 'afternoon';
  if (hour >= 17 && hour <= 21) return 'evening';
  return 'night';
}

/**
 * The "Today" hub, top to bottom: the friend you talked with last, every module one tap
 * away, who is waiting, what is ready today. The daily gift claims itself on launch
 * (its popup) and lives on Gifts.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const user = useAppStore((s) => s.user);
  const shells = useAppStore((s) => s.wallet.shells);
  const conversations = useAppStore((s) => s.conversations);
  const messages = useAppStore((s) => s.messages);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const notes = useAppStore((s) => s.notes);
  const diaryPages = useAppStore((s) => s.characterDiary);
  const pagesRead = useAppStore((s) => s.diaryPagesRead);
  const schedules = useAppStore((s) => s.schedules);
  const writeDuePages = useAppStore((s) => s.writeDueDiaryPages);
  const today = useDayKey();
  const spinReady = useAppStore(
    (s) => s.daily.spinDay !== today || s.daily.spinsUsed < FREE_SPINS_PER_DAY,
  );
  // The daily gift lives on Gifts; its icon carries a dot while today's gift still waits.
  const giftWaiting = useAppStore((s) => !checkInStatus(s.daily, today).claimed);

  const charactersById = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  const hero = useMemo(
    () => featuredFriend(characters, relationships, conversations, messages),
    [characters, relationships, conversations, messages],
  );

  /** Newest first; chats whose character is gone are dropped. */
  const chats = useMemo<ChatItem[]>(
    () =>
      [...conversations]
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        .flatMap((conversation) => {
          const character = charactersById.get(conversation.characterId);
          if (!character) return [];
          const relationship = relationships[character.id];
          return [{ conversation, character, relationship, name: displayName(character, relationship) }];
        }),
    [conversations, charactersById, relationships],
  );
  const unread = useMemo(() => chats.filter((c) => c.conversation.unreadCount > 0), [chats]);

  /** Unread chats take the block; otherwise the two most recent invite a return. */
  const shown = unread.length > 0 ? unread.slice(0, 3) : chats.slice(0, 2);

  // Coming back in the morning: pages written overnight should be waiting here.
  useFocusEffect(useCallback(() => writeDuePages(), [writeDuePages]));

  const todos: TodoItem[] = [];

  // New diary pages first: the reason to come back this morning.
  for (const page of diaryPages) {
    if (page.date !== today || pagesRead.includes(page.id)) continue;
    const character = charactersById.get(page.characterId);
    if (!character) continue;
    todos.push({
      key: page.id,
      icon: character,
      title: t('home.todo.diary', { name: shortName(displayName(character, relationships[character.id])) }),
      subtitle: t('home.todo.diaryHint'),
      fresh: true,
      onPress: () =>
        router.push({ pathname: '/diary/page/[characterId]', params: { characterId: character.id, date: page.date } }),
    });
  }

  // Today's plans still ahead, soonest first, with the friend who will check in. Once a
  // plan has started its row goes: the reminder is past and "how did it go?" comes in chat.
  const now = Date.now();
  const upcoming = schedules
    .filter((plan) => plan.date === today && (!plan.time || planStart(plan).getTime() > now))
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  for (const plan of upcoming) {
    const character = charactersById.get(plan.characterId);
    if (!character) continue;
    const conversation = conversations.find((c) => c.characterId === character.id);
    todos.push({
      key: plan.id,
      icon: character,
      title: t('home.todo.plan', { title: plan.title }),
      subtitle: t(plan.time ? 'home.todo.planAt' : 'home.todo.planHint', {
        name: shortName(displayName(character, relationships[character.id])),
        time: plan.time,
      }),
      onPress: () => conversation && router.push(`/chat/${conversation.id}`),
    });
  }

  // A note opens per character, so one row per sender is enough.
  const noteSenders = new Set<string>();
  for (const note of notes) {
    if (noteSenders.size === 2) break;
    const character = charactersById.get(note.characterId);
    if (note.status !== 'ready' || !character || noteSenders.has(character.id)) continue;
    noteSenders.add(character.id);
    todos.push({
      key: note.id,
      icon: 'secretNote',
      // First name only: the row stays one short line.
      title: t('home.todo.note', { name: shortName(displayName(character, relationships[character.id])) }),
      onPress: () => router.push(`/secret-note/${character.id}`),
    });
  }
  if (spinReady) {
    todos.push({
      key: 'spin',
      icon: 'gift',
      title: t('home.todo.spin'),
      onPress: () => router.push('/gifts'),
    });
  }

  return (
    <Screen background={colors.bgPlain}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Txt variant="logo" color={colors.brandText}>
            {t('app.name')}
          </Txt>
          <Mascot size={22} />
        </View>

        <View style={styles.actions}>
          <ShellBadge count={shells} onPress={() => router.push('/store/shell?tab=shells')} />
          <PressableScale
            style={styles.profile}
            scaleTo={0.94}
            hitSlop={hitSlop}
            accessibilityLabel={t('a11y.profile')}
            onPress={() => router.push('/profile')}>
            <UserAvatar user={user} size={30} />
          </PressableScale>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + space.xxl }}>
        <View style={styles.greeting}>
          <Txt variant="h1" accessibilityRole="header">
            {t(`home.greeting.${greetingSlot(new Date().getHours())}`, { name: user.displayName })}
          </Txt>
        </View>

        {hero ? (
          <TodayHero friend={hero} onPress={() => router.push(`/chat/${hero.conversation.id}`)} />
        ) : null}

        {/* Every module one tap away, right under the friend card (BIMOBIMO #1). */}
        <View style={styles.grid}>
          {homeModules.map((module) => (
            <ModuleCell
              key={module.key}
              module={module}
              dot={module.key === 'gifts' && (spinReady || giftWaiting)}
              onPress={() => router.push(module.route as never)}
            />
          ))}
        </View>

        {chats.length > 0 ? (
          <SectionLabel
            tone="title"
            title={t('home.chats')}
            right={
              <PressableScale
                style={styles.more}
                scaleTo={0.94}
                accessibilityRole="link"
                accessibilityLabel={t('home.allChats')}
                onPress={() => router.navigate('/(tabs)/chat')}>
                <CaretRightIcon size={18} color={colors.textMuted} />
              </PressableScale>
            }
          />
        ) : null}
        {/* Plain rows on the canvas: no card, no lines, the type carries the structure. */}
        <View style={chats.length === 0 && styles.alone}>
          {shown.length > 0 ? (
            shown.map((item) => (
              <ChatRow
                key={item.conversation.id}
                item={item}
                onPress={() => router.push(`/chat/${item.conversation.id}`)}
              />
            ))
          ) : (
            <ListRow
              size="large"
              left={<ClayIcon name="compass" size={ROW_ICON} tile={false} />}
              title={t('home.todo.meet')}
              chevron
              onPress={() => router.push('/(tabs)/find')}
            />
          )}
        </View>

        {todos.length > 0 ? (
          <>
            <SectionLabel tone="title" title={t('home.today')} />
            {todos.map((todo) => (
              <ListRow
                key={todo.key}
                size="large"
                left={
                  isCharacter(todo.icon) ? (
                    <CharacterAvatar character={todo.icon} size={ROW_ICON} />
                  ) : (
                    <ClayIcon name={todo.icon} size={ROW_ICON} tile={false} />
                  )
                }
                title={todo.title}
                subtitle={todo.subtitle}
                trailing={todo.fresh ? <View style={styles.freshDot} /> : undefined}
                chevron
                onPress={todo.onPress}
              />
            ))}
          </>
        ) : null}



      </ScrollView>
      {/* The day's check-in shows here only, never over a chat or another tab. */}
      <DailyRewardSheet />
    </Screen>
  );
}

function isCharacter(icon: TodoItem['icon']): icon is Character {
  return typeof icon === 'object';
}

/**
 * A conversation row, marked like the Chats tab: a muted chat shows a quiet bell
 * instead of the unread badge. A small mint chip after the name carries the bond
 * level. The marks are visual only, so the label spells them out.
 */
function ChatRow({ item, onPress }: { item: ChatItem; onPress: () => void }) {
  const { t } = useTranslation();
  const { conversation, character, relationship, name } = item;
  const stamp = relativeStamp(conversation.lastMessageAt);
  const level = relationship && relationship.level >= 1 ? relationship.level : null;
  const label = [
    conversation.unreadCount > 0
      ? t('a11y.unreadTab', { label: name, count: conversation.unreadCount })
      : name,
    level != null ? t('home.bondLevel', { level }) : null,
    conversation.muted ? t('chatList.muted') : null,
    stamp,
    conversation.lastMessagePreview,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <ListRow
      size="large"
      left={<CharacterAvatar character={character} size={CHAT_AVATAR} />}
      title={name}
      titleAfter={level != null ? <BondChip level={level} /> : undefined}
      meta={stamp}
      subtitle={conversation.lastMessagePreview}
      trailing={
        conversation.muted ? (
          <Ionicons name="notifications-off-outline" size={14} color={colors.textFaint} />
        ) : (
          <CountBadge count={conversation.unreadCount} />
        )
      }
      onPress={onPress}
      accessibilityLabel={label}
    />
  );
}

/** Mint heart and level: how close you are, at a glance. */
function BondChip({ level }: { level: number }) {
  return (
    <View style={styles.bond}>
      <HeartIcon size={10} color={colors.bond} weight="fill" />
      <Txt variant="tiny" color={colors.bondText} style={styles.bondText}>
        {level}
      </Txt>
    </View>
  );
}

/** One Explore module: a large clay icon over a short name; the label carries the full name. */
function ModuleCell({
  module,
  dot,
  onPress,
}: {
  module: HomeModule;
  dot: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <PressableScale
      style={styles.cell}
      scaleTo={0.94}
      accessibilityLabel={t(`home.modules.${module.labelKey}`)}
      onPress={onPress}>
      <ClayIcon name={MODULE_ICONS[module.key]} size={MODULE_ICON} tile={false} dot={dot} />
      <Txt variant="small" color={colors.textSecondary} center lines={1} style={styles.cellLabel}>
        {t(`home.short.${module.key}`)}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  // Wide enough that the badge's and the avatar's hit areas never overlap.
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  profile: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    gap: space.xs,
  },
  // A full-size target for the small chevron beside the section title.
  more: { width: 44, height: 44, marginVertical: -space.md, alignItems: 'center', justifyContent: 'center' },
  // With no chats there is no heading above the "meet someone" row to open the gap.
  alone: { marginTop: space.xl },
  freshDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  bond: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    paddingLeft: space.xs + 1,
    paddingRight: space.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.bondSoft,
  },
  bondText: { fontWeight: weight.bold },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: space.lg,
    paddingHorizontal: space.sm,
    paddingTop: space.xl,
  },
  // A quarter of the row, so rounding never pushes the fourth icon onto a new line.
  cell: { width: '25%', alignItems: 'center', gap: space.xs },
  cellLabel: { fontWeight: weight.medium },
});
