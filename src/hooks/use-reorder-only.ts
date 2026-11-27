import { useEffect, useRef } from 'react';

/**
 * True when `ids` holds the same rows as the last render, only maybe in a new order: then a row may
 * slide to its new place (`listReorder`). When rows come or go (a filter, a search, a removed chat)
 * it is false and the list swaps at once: a new row would otherwise appear in place while an old one
 * slides across it (seen on the A51, 2026-11-16).
 */
export function useReorderOnly(ids: readonly string[]): boolean {
  const key = [...ids].sort().join('\u0000');
  const last = useRef<string | null>(null);
  const same = last.current === key;
  useEffect(() => {
    last.current = key;
  }, [key]);
  return same;
}
