import type { SwipeRowMethods } from '@/components/chat/swipe-row';
import type { Character, Conversation, GroupChat } from '@/types';

/** The Chats list's shared shapes (out of `src/app/(tabs)/chat.tsx`, 0z360). */

export type Filter = 'all' | 'unread' | 'groups';
export const FILTERS: Filter[] = ['all', 'unread', 'groups'];

/** A row: a one-to-one chat with its character, or a group with its members. */
export type ChatItem =
  | {
      kind: 'chat';
      id: string;
      conversation: Conversation;
      character: Character;
      name: string;
    }
  | {
      kind: 'group';
      id: string;
      group: GroupChat;
      members: Character[];
      name: string;
    };

/** What every row shows, whichever kind it is. */
export const rowOf = (item: ChatItem) => (item.kind === 'chat' ? item.conversation : item.group);
export const isPinned = (item: ChatItem) => item.kind === 'chat' && item.conversation.pinned;
export const isUnread = (item: ChatItem) => rowOf(item).unreadCount > 0;

/** The handlers every row shares; stable, so a row re-renders only when its own chat changes. */
export interface RowActions {
  open: (item: ChatItem) => void;
  openProfile: (item: ChatItem) => void;
  hold: (item: ChatItem) => void;
  mute: (item: ChatItem) => void;
  pin: (item: ChatItem) => void;
  read: (item: ChatItem) => void;
  remove: (item: ChatItem) => void;
  /** One open row at a time (iOS): a row opening or starting to open closes the one before. */
  opening: (row: SwipeRowMethods) => void;
  closed: (row: SwipeRowMethods) => void;
}
