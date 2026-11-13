import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { useNavigationContainerRef, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Appearance, AppState } from 'react-native';

import { freshStack, stackOf, type NavRoute, type SavedStack } from '@/lib/theme-restore';
import { isDark } from '@/theme';

const KEY = 'sigmazam.themeReloadStack';
/** Long enough for the pushes under the launch cover to settle before it lifts. */
const SETTLE_MS = 450;

/**
 * Colours are read once at launch (`theme/colors.ts`), so when the phone switches between light
 * and dark while the app runs, the app reloads: every screen rebuilds its styles in the new theme
 * instead of old colours sitting next to native parts (keyboard, switches) in the new one.
 * Only while the app is in front: iOS flips the scheme in the background to snapshot both looks.
 * Saved data is persisted, and the open tab and the screens above it are kept for the relaunch
 * (`useThemeRestore`), so the user lands where they were.
 */
export function useThemeReload() {
  const navigation = useNavigationContainerRef();
  useEffect(() => {
    let reloading = false;
    const check = () => {
      if (reloading || AppState.currentState !== 'active') return;
      if ((Appearance.getColorScheme() === 'dark') === isDark) return;
      reloading = true;
      let routes: NavRoute[] = [];
      try {
        routes = (navigation.getRootState()?.routes ?? []) as NavRoute[];
      } catch {
        // Navigation not mounted yet: nothing to keep.
      }
      AsyncStorage.setItem(KEY, JSON.stringify(stackOf(routes)))
        .catch(() => {})
        .finally(() => reloadAppAsync('Color scheme changed').catch(() => {}));
    };
    const appearance = Appearance.addChangeListener(check);
    const appState = AppState.addEventListener('change', check);
    return () => {
      appearance.remove();
      appState.remove();
    };
  }, [navigation]);
}

/**
 * After a theme reload, reopens the tab and screens `useThemeReload` kept, while the launch cover is
 * still up (so the pushes are not seen). `ready`: navigation and saved data are in; `onboarded`:
 * someone not past onboarding stays there. Returns true once there is nothing left to do.
 */
export function useThemeRestore(ready: boolean, onboarded: boolean) {
  const router = useRouter();
  const [saved, setSaved] = useState<SavedStack | null | undefined>(undefined);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) void AsyncStorage.removeItem(KEY).catch(() => {});
        setSaved(freshStack(raw ? (JSON.parse(raw) as SavedStack) : null));
      })
      .catch(() => setSaved(null));
  }, []);

  useEffect(() => {
    if (saved === undefined || done) return;
    if (!saved) return setDone(true);
    if (!ready) return;
    if (!onboarded) return setDone(true);
    // Once only, whatever re-renders: a second pass would stack every screen twice.
    if (started.current) return;
    started.current = true;
    if (saved.tab !== '/') router.navigate(saved.tab as never);
    for (const href of saved.screens) router.push(href as never);
    setTimeout(() => setDone(true), SETTLE_MS);
  }, [saved, ready, onboarded, done, router]);

  return done;
}
