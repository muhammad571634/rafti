import { useMemo } from 'react';

import { buildInbox, isUnread } from '@/lib/inbox';
import { useAppStore } from '@/store/use-app-store';

/** How many notifications are new since the inbox was last opened: the badge on the Us bell. */
export function useInboxUnread() {
  const characterDiary = useAppStore((s) => s.characterDiary);
  const calls = useAppStore((s) => s.calls);
  const schedules = useAppStore((s) => s.schedules);
  const moments = useAppStore((s) => s.moments);
  const boardPosts = useAppStore((s) => s.boardPosts);
  const daily = useAppStore((s) => s.daily);
  const seenAt = useAppStore((s) => s.inboxSeenAt);
  return useMemo(
    () =>
      buildInbox({ characterDiary, calls, schedules, moments, boardPosts, daily }).filter((item) => isUnread(item, seenAt))
        .length,
    [characterDiary, calls, schedules, moments, boardPosts, daily, seenAt],
  );
}
