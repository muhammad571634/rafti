import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { BookOpenTextIcon } from 'phosphor-react-native/src/icons/BookOpenText';
import { CameraIcon } from 'phosphor-react-native/src/icons/Camera';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { CoffeeIcon } from 'phosphor-react-native/src/icons/Coffee';
import { CompassIcon } from 'phosphor-react-native/src/icons/Compass';
import { EnvelopeSimpleIcon } from 'phosphor-react-native/src/icons/EnvelopeSimple';
import { GiftIcon } from 'phosphor-react-native/src/icons/Gift';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { MoonStarsIcon } from 'phosphor-react-native/src/icons/MoonStars';
import { PhoneIcon } from 'phosphor-react-native/src/icons/Phone';
import { PushPinIcon } from 'phosphor-react-native/src/icons/PushPin';
import { RadioIcon } from 'phosphor-react-native/src/icons/Radio';
import { ShoppingBagOpenIcon } from 'phosphor-react-native/src/icons/ShoppingBagOpen';
import { UsersThreeIcon } from 'phosphor-react-native/src/icons/UsersThree';
import { Fragment, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DailyGiftCard } from '@/components/daily-gift-card';
import { featuredFriend, TodayHero } from '@/components/today-hero';
import { useDayKey } from '@/hooks/use-day-key';
import {
  Card,
  CharacterAvatar,
  CountBadge,
  Divider,
  IconTile,
  ListRow,
  Mascot,
  PressableScale,
  Screen,
  SectionLabel,
  ShellBadge,
  Txt,
  UserAvatar,
  type TileIcon,
} from '@/components/ui';
import { relativeStamp, shortName } from '@/lib/format';
import { FREE_SPINS_PER_DAY, homeModules } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, moduleTints, radius, space, TAB_BAR_HEIGHT, weight } from '@/theme';
import type { Character, Conversation, HomeModule, Relationship } from '@/types';

const CHAT_AVATAR = 44;
/** Tile size of the Today and "meet" rows; their divider inset follows it. */
const ROW_ICON = 38;
/** Explore tiles: iOS home-screen size, a 32pt duotone glyph, five to a row. */
const MODULE_TILE = 60;
const MODULE_GLYPH = 32;
const MODULE_RADIUS = radius.lg;
/** Row dividers start under the row text, past the leading avatar or icon. */
const CHAT_INSET = space.lg + CHAT_AVATAR + space.md;
const TODO_INSET = space.lg + ROW_ICON + space.md;

/** One duotone glyph per Explore module, keyed by `HomeModule.key`. */
const MODULE_ICONS: Record<string, TileIcon> = {
  store: ShoppingBagOpenIcon,
  dating: CoffeeIcon,
  diary: BookOpenTextIcon,
  photo: CameraIcon,
  contacts: UsersThreeIcon,
  gifts: GiftIcon,
  calls: PhoneIcon,
  bedtime: MoonStarsIcon,
  radio: RadioIcon,
  board: PushPinIcon,
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
  /** A friend's face for things they did; a glyph tile for everything else */
  icon: TileIcon | Character;
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
 * The "Today" hub: the closest friend, today's gift, who is waiting, what is ready,
 * and every module one tap away.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const user = useAppStore((s) => s.user);
  const shells = useAppStore((s) => s.wallet.shells);
  const conversations = useAppStore((s) => s.conversations);
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

  const charactersById = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  const hero = useMemo(
    () => featuredFriend(characters, relationships, conversations),
    [characters, relationships, conversations],
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

  // Plans made in chat for today, with the friend who will check in.
  for (const plan of schedules) {
    if (plan.date !== today) continue;
    const character = charactersById.get(plan.characterId);
    if (!character) continue;
    const conversation = conversations.find((c) => c.characterId === character.id);
    todos.push({
      key: plan.id,
      icon: character,
      title: t('home.todo.plan', { title: plan.title }),
      subtitle: t('home.todo.planHint', { name: shortName(displayName(character, relationships[character.id])) }),
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
      icon: EnvelopeSimpleIcon,
      // First name only: the row stays one short line.
      title: t('home.todo.note', { name: shortName(displayName(character, relationships[character.id])) }),
      onPress: () => router.push(`/secret-note/${character.id}`),
    });
  }
  if (spinReady) {
    todos.push({
      key: 'spin',
      icon: GiftIcon,
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
          <ShellBadge count={shells} onPress={() => router.push('/store/shell')} />
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

        {todos.length > 0 ? (
          <>
            <SectionLabel title={t('home.today')} />
            {todos.map((todo, i) => (
              <Fragment key={todo.key}>
                {i > 0 ? (
                  // Plain rows sit on the canvas, so the line stops short of the edge too.
                  <View style={styles.todoDivider}>
                    <Divider inset={TODO_INSET} />
                  </View>
                ) : null}
                <ListRow
                  left={
                    isCharacter(todo.icon) ? (
                      <CharacterAvatar character={todo.icon} size={ROW_ICON} />
                    ) : (
                      <IconTile icon={todo.icon} size={ROW_ICON} />
                    )
                  }
                  title={todo.title}
                  subtitle={todo.subtitle}
                  trailing={todo.fresh ? <View style={styles.freshDot} /> : undefined}
                  chevron
                  onPress={todo.onPress}
                />
              </Fragment>
            ))}
          </>
        ) : null}

        <DailyGiftCard />

        {chats.length > 0 ? (
          <SectionLabel
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
        <Card
          variant="outlined"
          padded={false}
          style={[styles.chats, chats.length === 0 && styles.chatsAlone]}>
          {shown.length > 0 ? (
            shown.map((item, i) => (
              <Fragment key={item.conversation.id}>
                {i > 0 ? <Divider inset={CHAT_INSET} /> : null}
                <ChatRow item={item} onPress={() => router.push(`/chat/${item.conversation.id}`)} />
              </Fragment>
            ))
          ) : (
            <ListRow
              left={<IconTile icon={CompassIcon} size={ROW_ICON} />}
              title={t('home.todo.meet')}
              chevron
              onPress={() => router.push('/(tabs)/find')}
            />
          )}
        </Card>

        <SectionLabel title={t('home.explore')} />
        <View style={styles.grid}>
          {homeModules.map((module) => (
            <ModuleCell
              key={module.key}
              module={module}
              dot={module.key === 'gifts' && spinReady}
              onPress={() => router.push(module.route as never)}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function isCharacter(icon: TodoItem['icon']): icon is Character {
  return typeof icon === 'object' && icon !== null && 'bio' in icon;
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

/** One Explore module: tinted glyph tile over a short name; the label carries the full name. */
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
  const tint = moduleTints[module.key];

  return (
    <PressableScale
      style={styles.cell}
      scaleTo={0.94}
      accessibilityLabel={t(`home.modules.${module.labelKey}`)}
      onPress={onPress}>
      <IconTile
        size={MODULE_TILE}
        radius={MODULE_RADIUS}
        glyphSize={MODULE_GLYPH}
        icon={MODULE_ICONS[module.key]}
        weight="duotone"
        color={tint?.fg}
        background={tint?.bg}
        dot={dot}
      />
      <Txt variant="chip" color={colors.textSecondary} center lines={1} style={styles.cellLabel}>
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
  // The section label above already opens the gap.
  chats: { marginHorizontal: space.lg, marginTop: space.xs },
  chatsAlone: { marginTop: space.xl },
  todoDivider: { paddingRight: space.lg },
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
    rowGap: space.xl,
    paddingHorizontal: space.sm,
    paddingTop: space.xs,
  },
  // A fifth of the row, so rounding never pushes the fifth tile onto a new line.
  cell: { width: '20%', alignItems: 'center', gap: space.sm },
  cellLabel: { fontWeight: weight.medium },
});
