import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { rollAt, rollDuration } from '@/lib/count-roll';

/**
 * The number to draw for `value`: the first value shows as it is; a later change rolls from what is
 * on screen to the new value (audit §8.2.3). Only the caller's text re-renders, for under a second;
 * Reduce Motion jumps. Screen readers should be given `value` itself, never this.
 */
export function useCountingNumber(value: number): number {
  const still = useReducedMotion();
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  shownRef.current = shown;

  useEffect(() => {
    const from = shownRef.current;
    if (still || from === value || !Number.isFinite(value)) {
      setShown(value);
      return;
    }
    const duration = rollDuration(from, value);
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const k = (Date.now() - start) / duration;
      setShown(rollAt(from, value, k));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, still]);

  return shown;
}
