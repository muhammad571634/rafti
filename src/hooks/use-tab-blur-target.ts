import { createContext, useContext, type RefObject } from 'react';
import type { ViewInstance } from 'react-native';

/**
 * A BlurTargetView ref a tab layout may hand its screens. None does today: the Android tab bar
 * draws a frosted fill, not a live blur (0z131), so Chats falls back to its own target for its
 * menus. Kept so a future live-blur bar can hand one down without touching the screens.
 */
export const TabBlurTarget = createContext<RefObject<ViewInstance | null> | null>(null);

export function useTabBlurTarget() {
  return useContext(TabBlurTarget);
}
