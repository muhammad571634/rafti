import { useSegments } from 'expo-router';
import { useEffect } from 'react';

import { eventsFromChange, type WatchedState } from '@/lib/analytics-diff';
import { screenName } from '@/lib/analytics-events';
import { setAnalyticsEnabled, track } from '@/lib/analytics';
import { useAppStore } from '@/store/use-app-store';

/**
 * Product analytics wired to the app (0z282), mounted once in the root layout: the user's Share
 * usage data setting, a `screen` event per route, and the events the store's changes stand for
 * (`eventsFromChange`). Loading the saved state is not a change: watching starts once it is in.
 */
export function useAnalytics() {
  const hydrated = useAppStore((s) => s.hydrated);
  const shareUsage = useAppStore((s) => s.settings.shareUsage !== false);
  const segments = useSegments();
  const screen = screenName(segments);

  useEffect(() => {
    if (hydrated) setAnalyticsEnabled(shareUsage);
  }, [hydrated, shareUsage]);

  useEffect(() => {
    if (!hydrated) return;
    return useAppStore.subscribe((next, prev) => {
      if (!prev.hydrated) return;
      for (const e of eventsFromChange(prev as WatchedState, next as WatchedState)) track(e.name, e.props);
    });
  }, [hydrated]);

  useEffect(() => {
    if (hydrated) track('screen', { name: screen });
  }, [hydrated, screen]);
}
