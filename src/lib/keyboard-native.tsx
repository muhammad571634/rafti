import type { ReactNode } from 'react';
import { Platform, TurboModuleRegistry } from 'react-native';

/**
 * react-native-keyboard-controller (audit Step 3.4: the composer follows the keyboard frame by frame and
 * a drag dismisses it, as iOS Messages does). Its native side is only in APKs built after 0z247; an older
 * APK that gets this JS by OTA must not touch its views (a missing native view is fatal and `catch` does
 * not save it), so it gets the plain keyboard path. The package is required only when the module is there.
 */
// Web (and the server render of the web export) has no TurboModuleRegistry: no controller there.
export const hasKeyboardController = Platform.OS !== 'web' && TurboModuleRegistry?.get?.('KeyboardController') != null;

type KeyboardControllerModule = typeof import('react-native-keyboard-controller');

export const KC: KeyboardControllerModule | null = hasKeyboardController
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('react-native-keyboard-controller') as KeyboardControllerModule)
  : null;

/** The provider at the app's root, or its children as they are on an older APK. */
export function KeyboardRoot({ children }: { children: ReactNode }) {
  if (!KC) return children;
  const { KeyboardProvider } = KC;
  return <KeyboardProvider>{children}</KeyboardProvider>;
}
