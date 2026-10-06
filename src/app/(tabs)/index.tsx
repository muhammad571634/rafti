import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Fragment, useMemo, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

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
} from '@/components/ui';
import { relativeStamp } from '@/lib/format';
import { FREE_SPINS_PER_DAY, homeModules, todayKey } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, radius, space, TAB_BAR_HEIGHT } from '@/theme';
import type { Character, Conversation, HomeModule } from '@/types';

type TileIcon = ComponentProps<typeof IconTile>['icon'];

const COLUMNS = 4;
const CHAT_AVATAR = 44;
/** Tile size of the Today and "meet" rows; their divider inset follows it. */
const ROW_ICON = 38;
const MODULE_ICON = 48;
/** Row dividers start under the row text, past the leading avatar or icon. */
const CHAT_INSET = space.lg + CHAT_AVATAR + space.md;
const TODO_INSET = space.lg + ROW_ICON + space.md;

/** One outline glyph per Explore module, keyed by `HomeModule.key`. */
const MODULE_ICONS: Record<string, TileIcon> = {
  store: 'bag-handle-outline',
  dating: 'cafe-outline',
  diary: 'book-outline',
  photo: 'camera-outline',
  contacts: 'people-outline',
  radio: 'radio-outline',
  gifts: 'gift-outline',
  calls: 'call-outline',
  board: 'clipboard-outline',
  bedtime: 'moon-outline',
};

/** A conversation joined with its character and the name the user knows them by. */
interface ChatItem {
  conversation: Conversation;
  character: Character;
  name: string;
}

/** A small thing the user can do today, shown as a row under "Today". */
interface TodoItem {
  key: string;
  icon: TileIcon;
  title: string;
  subtitle: string;
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
 * The "Today" hub: who is waiting, what is ready, and every module one tap away.
 * Content sits straight on the canvas; only the conversation block is grouped.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const user = useAppStore((s) => s.user);
  const shells = useAppStore((s) => s.wallet.shells);
  const conversations = useAppStore((s) => s.conversations);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const notes = useAppStore((s) => s.notes);
  const spinReady = useAppStore(
    (s) => s.daily.spinDay !== todayKey() || s.daily.spinsUsed < FREE_SPINS_PER_DAY,
  );

  const charactersById = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);

  /** Newest first; chats whose character is gone are dropped. */
  const chats = useMemo<ChatItem[]>(
    () =>
      [...conversations]
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        .flatMap((conversation) => {
          const character = charactersById.get(conversation.characterId);
          if (!character) return [];
          return [{ conversation, character, name: displayName(character, relationships[character.id]) }];
        }),
    [conversations, charactersById, relationships],
  );
  const unread = useMemo(() => chats.filter((c) => c.conversation.unreadCount > 0), [chats]);

  /** Unread chats take the block; otherwise the two most recent invite a return. */
  const shown = unread.length > 0 ? unread.slice(0, 3) : chats.slice(0, 2);
  const showRecentLabel = unread.length === 0 && chats.length > 0;

  const waitingLine = () => {
    const [first, second] = unread;
    if (unread.length === 1) return t('home.waitingOne', { name: first.name });
    if (unread.length === 2) return t('home.waitingTwo', { first: first.name, second: second.name });
    if (unread.length > 2) {
      return t('home.waitingMany', { first: first.name, second: second.name, count: unread.length - 2 });
    }
    return chats.length > 0 ? t('home.caughtUp') : t('home.noFriends');
  };

  const todos: TodoItem[] = [];
  if (spinReady) {
    todos.push({
      key: 'spin',
      icon: 'gift-outline',
      title: t('home.todo.spin'),
      subtitle: t('home.todo.spinHint'),
      onPress: () => router.push('/gifts'),
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
      icon: 'mail-outline',
      title: t('home.todo.note', { name: displayName(character, relationships[character.id]) }),
      subtitle: t('home.todo.noteHint'),
      onPress: () => router.push(`/secret-note/${character.id}`),
    });
  }

  const cellWidth = (Math.min(width, 520) - space.lg * 2) / COLUMNS;

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
          <Txt variant="h2" accessibilityRole="header">
            {t(`home.greeting.${greetingSlot(new Date().getHours())}`, { name: user.displayName })}
          </Txt>
          <Txt variant="small" color={colors.textSecondary}>
            {waitingLine()}
          </Txt>
        </View>

        {showRecentLabel ? <SectionLabel title={t('home.recent')} /> : null}
        <Card
          variant="outlined"
          padded={false}
          style={[styles.chats, showRecentLabel && styles.chatsUnderLabel]}>
          {shown.length > 0 ? (
            shown.map((item, i) => (
              <Fragment key={item.conversation.id}>
                {i > 0 ? <Divider inset={CHAT_INSET} /> : null}
                <ChatRow item={item} onPress={() => router.push(`/chat/${item.conversation.id}`)} />
              </Fragment>
            ))
          ) : (
            <ListRow
              left={<IconTile icon="compass-outline" size={ROW_ICON} />}
              title={t('home.todo.meet')}
              subtitle={t('home.todo.meetHint')}
              chevron
              onPress={() => router.push('/(tabs)/find')}
            />
          )}
        </Card>

        {todos.length > 0 ? (
          <>
            <SectionLabel title={t('home.today')} />
            {todos.map((todo, i) => (
              <Fragment key={todo.key}>
                {i > 0 ? <Divider inset={TODO_INSET} /> : null}
                <ListRow
                  left={<IconTile icon={todo.icon} size={ROW_ICON} />}
                  title={todo.title}
                  subtitle={todo.subtitle}
                  chevron
                  onPress={todo.onPress}
                />
              </Fragment>
            ))}
          </>
        ) : null}

        <SectionLabel title={t('home.explore')} />
        <View style={styles.grid}>
          {homeModules.map((module) => (
            <ModuleCell
              key={module.key}
              module={module}
              width={cellWidth}
              dot={module.key === 'gifts' && spinReady}
              onPress={() => router.push(module.route as never)}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

/**
 * A conversation row, marked like the Chats tab: a muted chat shows a quiet bell
 * instead of the unread badge. Both marks are visual only, so the label spells them out.
 */
function ChatRow({ item, onPress }: { item: ChatItem; onPress: () => void }) {
  const { t } = useTranslation();
  const { conversation, character, name } = item;
  const stamp = relativeStamp(conversation.lastMessageAt);
  const label = [
    conversation.unreadCount > 0
      ? t('a11y.unreadTab', { label: name, count: conversation.unreadCount })
      : name,
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

/** One Explore module: glyph tile over a short name; the label carries the full name. */
function ModuleCell({
  module,
  width,
  dot,
  onPress,
}: {
  module: HomeModule;
  width: number;
  dot: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <PressableScale
      style={[styles.cell, { width }]}
      scaleTo={0.94}
      accessibilityLabel={t(`home.modules.${module.labelKey}`)}
      onPress={onPress}>
      <IconTile size={MODULE_ICON} icon={MODULE_ICONS[module.key]} dot={dot} />
      <Txt variant="caption" color={colors.textSecondary} center lines={1}>
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
  chats: { marginHorizontal: space.lg, marginTop: space.lg },
  // The section label above already opens the gap.
  chatsUnderLabel: { marginTop: space.xs },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: space.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  cell: { alignItems: 'center', gap: space.sm },
});
