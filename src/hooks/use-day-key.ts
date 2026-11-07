import { useEffect, useState } from 'react';

import { todayKey } from '@/mock';

/** How often an open screen checks whether midnight has passed. */
const CHECK_MS = 60_000;

/**
 * Today's day key that stays current while a screen is left open over midnight,
 * so "today" state (the daily gift, the free spin) rolls over without a relaunch.
 */
export function useDayKey() {
  const [key, setKey] = useState(todayKey);

  useEffect(() => {
    const timer = setInterval(() => setKey(todayKey()), CHECK_MS);
    return () => clearInterval(timer);
  }, []);

  return key;
}
