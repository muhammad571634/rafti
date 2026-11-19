import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { withAccount } from '@/ai/account';
import { serverTemplates } from '@/ai/server';
import type { TemplateStats } from '@/lib/templates';

type Stats = Readonly<Record<string, TemplateStats>>;

/** Shared by every screen that shows templates: one read serves Find and the Stories screen. */
let cached: { at: number; stats: Stats } = { at: 0, stats: {} };
const FRESH_MS = 60_000;

/**
 * The real counts for the story templates (server `template_stats`, template-library.md §3), read when
 * the screen comes into view and at most once a minute. Empty while the server is away: the cards say
 * "New" and the shelves keep the written order.
 */
export function useTemplateStats(): Stats {
  const [stats, setStats] = useState<Stats>(cached.stats);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      if (Date.now() - cached.at < FRESH_MS) {
        setStats(cached.stats);
        return;
      }
      void withAccount((token) => serverTemplates.stats(token))
        .catch(() => null)
        .then((result) => {
          if (!result?.stats) return;
          cached = { at: Date.now(), stats: result.stats };
          if (alive) setStats(result.stats);
        });
      return () => {
        alive = false;
      };
    }, []),
  );
  return stats;
}
