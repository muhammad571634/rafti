import { requireOptionalNativeModule } from 'expo';
import * as Clipboard from 'expo-clipboard';
import type { RefObject } from 'react';
import { NativeModules, Platform, Share, TurboModuleRegistry, type ViewInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

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
 * text where the picture cannot be made. Resolves false when nothing was shared.
 */
export async function shareImage(view: RefObject<ViewInstance | null>, fallback: string) {
  if (!canShareImage) return shareText(fallback);
  try {
    const uri = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
    // Required here, not imported: the module throws on load where its native half is missing.
    const Sharing: typeof import('expo-sharing') = require('expo-sharing');
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    return true;
  } catch {
    return shareText(fallback);
  }
}
