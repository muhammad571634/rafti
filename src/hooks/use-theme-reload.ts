import { reloadAppAsync } from 'expo';
import { useEffect } from 'react';
import { Appearance, AppState } from 'react-native';

import { isDark } from '@/theme';

/**
 * Colours are read once at launch (`theme/colors.ts`), so when the phone switches between light
 * and dark while the app runs, the app reloads: every screen rebuilds its styles in the new theme
 * instead of old colours sitting next to native parts (keyboard, switches) in the new one.
 * Only while the app is in front: iOS flips the scheme in the background to snapshot both looks.
 * Saved data is persisted, so nothing is lost; the reload opens on Today.
 */
export function useThemeReload() {
  useEffect(() => {
    const check = () => {
      if (AppState.currentState !== 'active') return;
      if ((Appearance.getColorScheme() === 'dark') !== isDark) {
        reloadAppAsync('Color scheme changed').catch(() => {});
      }
    };
    const appearance = Appearance.addChangeListener(check);
    const appState = AppState.addEventListener('change', check);
    return () => {
      appearance.remove();
      appState.remove();
    };
  }, []);
}
