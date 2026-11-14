import { useCallback, useRef, useState, type RefObject } from 'react';
import type { FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** How far from the newest line (pt) still counts as reading it. */
const NEAR = 120;
/** Scrolled further up than this (about a screen), the way back down is offered (`away`). */
const AWAY = 600;

/**
 * An inverted chat list follows new lines the way iOS Messages does: while the reader is at the
 * newest end it stays there, and a line of their own always brings them back; someone reading
 * further up is left where they are when a reply or typing comes in. Once they are about a screen
 * up, `away` turns on (a button takes them down, `jump`) and `unseen` counts the lines that came
 * in since they left the newest end. `count` is how many lines the chat holds now.
 */
export function useFollowNewest<T>(listRef: RefObject<FlatList<T> | null>, count = 0) {
  const near = useRef(true);
  const lines = useRef(count);
  lines.current = count;
  // How many lines there were when the reader last stood at the newest end.
  const seen = useRef(count);
  if (near.current) seen.current = count;
  const [away, setAway] = useState(false);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Inverted: the offset counts from the newest line.
    const y = e.nativeEvent.contentOffset.y;
    near.current = y < NEAR;
    if (near.current) seen.current = lines.current;
    const far = y > AWAY;
    setAway((was) => (was === far ? was : far));
  }, []);

  const jump = useCallback(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), [listRef]);

  const follow = useCallback(
    (mine = false) => {
      if (mine || near.current) jump();
    },
    [jump],
  );

  return { onScroll, follow, jump, away, unseen: away ? Math.max(0, count - seen.current) : 0 };
}
