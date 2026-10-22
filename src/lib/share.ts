import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

/**
 * Opens the system share sheet. On a web browser without one the text is copied
 * instead. Resolves true when the user went through with it. Sharing pays nothing
 * (owner, 2026-10-22): the share sheet cannot tell whether anyone saw it, and Meta's
 * rules forbid rewarding shares; invites pay once the friend really joins.
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
