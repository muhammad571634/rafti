import { useCallback, useRef, type RefObject } from 'react';
import type { FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** How far from the newest line (pt) still counts as reading it. */
const NEAR = 120;

/**
 * An inverted chat list follows new lines the way iOS Messages does: while the reader is at the
 * newest end it stays there, and a line of their own always brings them back; someone reading
 * further up is left where they are when a reply or typing comes in.
 */
export function useFollowNewest<T>(listRef: RefObject<FlatList<T> | null>) {
  const near = useRef(true);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Inverted: the offset counts from the newest line.
    near.current = e.nativeEvent.contentOffset.y < NEAR;
  }, []);
  const follow = useCallback(
    (mine = false) => {
      if (mine || near.current) listRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
    [listRef],
  );
  return { onScroll, follow };
}
