import { useAppStore } from '@/store/use-app-store';

import { useCharacterInitiative } from './use-character-initiative';
import { usePushNotifications } from './use-push-notifications';

/**
 * What both tab layouts (`_layout.tsx`, `_layout.ios.tsx`) run first: the character
 * initiative and push hooks, then whether saved data has loaded and onboarding is done.
 */
export function useTabsGate(): 'loading' | 'onboarding' | 'ready' {
  useCharacterInitiative();
  usePushNotifications();
  const hydrated = useAppStore((s) => s.hydrated);
  const onboarded = useAppStore((s) => !!s.user.onboardedAt);
  if (!hydrated) return 'loading';
  return onboarded ? 'ready' : 'onboarding';
}

/**
 * Chats waiting, not messages: the number Today's "Waiting for you" and Chats' Unread pill show, so
 * the tab badge, the bubble and the pill always agree (one chat with 5 new lines is 1).
 */
export function useUnreadChats() {
  return useAppStore(
    (s) => s.conversations.filter((c) => c.unreadCount > 0).length + s.groups.filter((g) => g.unreadCount > 0).length,
  );
}

/** A badge's text: the count, or "99+". */
export const badgeText = (count: number) => (count > 99 ? '99+' : String(count));
