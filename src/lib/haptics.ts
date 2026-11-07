import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useAppStore } from '@/store/use-app-store';

/**
 * The app's haptics, named by what they mean (HIG Playing haptics, read 2026-10-24): each keeps
 * Apple's documented use, plays once on a discrete event next to the visual it complements, and
 * stays silent when the person turns Haptics off in Profile ("Make haptics optional"). Standard
 * iOS controls (UISwitch, the system tab bar) play their own, so nothing is added to them there.
 */
function play(pattern: () => Promise<void>) {
  if (Platform.OS === 'web' || useAppStore.getState().settings.haptics === false) return;
  void pattern().catch(() => {});
}

export const haptic = {
  /** A picker or wheel moved to a new value (Selection). */
  selection: () => play(Haptics.selectionAsync),
  /** A small control was pressed: send, answer, a call button (Impact, light). */
  tap: () => play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A menu or a card lifts under a long press (Impact, medium). */
  lift: () => play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** A task finished: a purchase, a gift, a level up (Notification, success). */
  success: () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** A task failed, such as a wrong invite code (Notification, error). */
  error: () => play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  /** A switch flipped. Android only: iOS's UISwitch plays its own. */
  toggle: (on: boolean) => {
    if (Platform.OS !== 'android') return;
    play(() => Haptics.performAndroidHapticsAsync(on ? Haptics.AndroidHaptics.Toggle_On : Haptics.AndroidHaptics.Toggle_Off));
  },
};
