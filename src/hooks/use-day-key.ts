import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { nextMidnightAt } from '@/lib/today';
import { todayKey } from '@/mock';

/**
 * Today's day key that rolls over at exact local midnight (and on foreground return) without a
 * continuous background `setInterval`, so "today" state (daily gift, free spin, plans, diary) flips
 * cleanly right after 00:00.
 */
export function useDayKey() {
  const [key, setKey] = useState(todayKey);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setKey(todayKey());
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const now = Date.now();
    const delay = Math.max(250, nextMidnightAt(now) - now + 250);
    const timer = setTimeout(() => setKey(todayKey()), delay);
    return () => clearTimeout(timer);
  }, [key]);

  return key;
}
