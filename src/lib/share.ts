import { requireOptionalNativeModule } from 'expo';
import * as Clipboard from 'expo-clipboard';
import type { RefObject } from 'react';
import { NativeModules, Platform, Share, TurboModuleRegistry, type ViewInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { androidShareOutcome, iosShareOutcome, type ShareOutcome } from '@/lib/share-outcome';

/**
 * Opens the system share sheet. On a web browser without one the text is copied
 * instead. Resolves true when the user went through with it. The share sheet cannot
 * tell whether anyone saw it, so sharing as such pays nothing; only a share card that went
 * somewhere pays (`shareImage` → `posted`, `rewardShare`, capped on the server; owner, 2026-11-08).
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

/**
 * Pictures need two native modules that builds made before the chat's share card (2026-10-30) lack;
 * over-the-air updates still reach those, so they share the text instead of crashing on import.
 */
const canShareImage =
  Platform.OS !== 'web' &&
  !!requireOptionalNativeModule('ExpoSharing') &&
  !!(TurboModuleRegistry.get('RNViewShot') ?? NativeModules.RNViewShot);

/**
 * Shares `view` as a PNG through the system share sheet (iOS's has Save Image), or `fallback` as
 * text where the picture cannot be made; `size` sets the picture's pixels. Resolves what happened
 * (`ShareOutcome`): only `posted` may pay shells.
 */
export async function shareImage(
  view: RefObject<ViewInstance | null>,
  fallback: string,
  size?: { width: number; height: number },
): Promise<ShareOutcome> {
  if (!canShareImage) return textOutcome(fallback);
  let uri: string;
  try {
    // A fixed `size` (a story poster's 1080 x 1920) keeps the picture sharp wherever it is posted.
    uri = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile', ...(size ?? {}) });
  } catch {
    return textOutcome(fallback);
  }
  try {
    if (Platform.OS === 'ios') {
      // iOS's sheet reports whether it completed and which app took the picture.
      const result = await Share.share({ url: uri });
      return iosShareOutcome(result.action, result.activityType);
    }
    // Required here, not imported: the module throws on load where its native half is missing.
    const Sharing: typeof import('expo-sharing') = require('expo-sharing');
    // Android's sheet says nothing back; it resolves when the user returns from the picked app.
    const opened = Date.now();
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    return androidShareOutcome(Date.now() - opened);
  } catch {
    return 'failed';
  }
}

/** The text fallback: iOS tells a completed share; Android's text sheet always says shared, so it never pays. */
async function textOutcome(message: string): Promise<ShareOutcome> {
  if (Platform.OS === 'ios') {
    try {
      const result = await Share.share({ message });
      return iosShareOutcome(result.action, result.activityType);
    } catch {
      return 'failed';
    }
  }
  return (await shareText(message)) ? 'kept' : 'dismissed';
}
