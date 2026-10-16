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

/** Unread messages across chats and groups: one dot on the Chats tab. */
export function useUnreadTotal() {
  return useAppStore(
    (s) =>
      s.conversations.reduce((sum, c) => sum + c.unreadCount, 0) + s.groups.reduce((sum, g) => sum + g.unreadCount, 0),
  );
}
