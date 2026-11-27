import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

interface ExpoNavigationBarNative {
  setStyle(style: 'light' | 'dark'): Promise<void>;
}

/**
 * Android 3-button / gesture navigation bar styling (0z292). Uses `requireOptionalNativeModule`
 * so older APKs (1.2.0 and earlier, which do not bundle `expo-navigation-bar`) never crash on
 * import. On APK 1.3.0+, setting `'light'` paints light icons over the transparent dark ground
 * with contrast enforcement disabled (no white scrim even when the phone is in Light mode).
 */
const navBar =
  Platform.OS === 'android'
    ? requireOptionalNativeModule<ExpoNavigationBarNative>('ExpoNavigationBar')
    : null;

export const hasNavigationBar = navBar != null;

export function applyDarkNavigationBar(): void {
  if (!navBar) return;
  navBar.setStyle('light').catch(() => {});
}
