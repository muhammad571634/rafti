import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

import { useAppStore } from '@/store/use-app-store';

/**
 * Opens the system share sheet. On a web browser without one the text is copied
 * instead. Resolves true when the user went through with it.
 */
export async function shareText(message: string) {
  try {
    if (Platform.OS === 'web' && (typeof navigator === 'undefined' || !navigator.share)) {
      await Clipboard.setStringAsync(message);
      return true;
    }
    const result = await Share.share({ message });
    return result.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}

/** Shares, then pays the daily share reward (once a day; the banner shows it). */
export async function shareForReward(message: string) {
  const done = await shareText(message);
  if (done) useAppStore.getState().claimShareReward();
  return done;
}
