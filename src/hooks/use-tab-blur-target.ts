import { createContext, useContext, type RefObject } from 'react';
import type { ViewInstance } from 'react-native';

/**
 * The current tab screen's BlurTargetView, which the Android tab bar blurs. The tab layout
 * wraps each screen in one; a screen that needs its own (Chats, for its menus) takes this ref
 * for it instead, because a target nested in another leaves the outer one blank.
 */
export const TabBlurTarget = createContext<RefObject<ViewInstance | null> | null>(null);

export function useTabBlurTarget() {
  return useContext(TabBlurTarget);
}
