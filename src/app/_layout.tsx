import { Caveat_600SemiBold } from '@expo-google-fonts/caveat';
import { Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka';
import { Stack, useRootNavigationState, useRouter, useSegments, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AlarmRuntime } from '@/components/alarms/alarm-runtime';
import { Button, Mascot, Txt } from '@/components/ui';
import { useThemeReload } from '@/hooks/use-theme-reload';
import { initI18n } from '@/i18n';
import { startAwayClock } from '@/lib/away-clock';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
// Today's welcome back needs to know how long the app was away (src/lib/welcome-back.ts).
startAwayClock();
/** Longest the splash waits for saved data before it lets go anyway. */
const SPLASH_LIMIT_MS = 8000;
// The window behind every screen (keyboard, transitions) in the launch theme's canvas colour.
SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({ Fredoka_600SemiBold, Fredoka_700Bold, Caveat_600SemiBold });
  // A font that fails to load falls back to the system face rather than blocking launch.
  const ready = i18nReady && (fontsLoaded || !!fontError);
  useThemeReload();

  useEffect(() => {
    initI18n()
      .catch(() => {})
      .finally(() => setI18nReady(true));
  }, []);

  // The splash stays up until the first real screen is there (OnboardingGate lets it go); this
  // only keeps a launch that never finishes loading from sitting on the splash for good.
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), SPLASH_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="call/[id]" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
          <Stack.Screen name="group/[id]/call" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
          <Stack.Screen
            name="call/incoming/[id]"
            options={{ animation: 'fade', presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen name="create-character" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="alarms/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="personas/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="scenes/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="lore/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="lore/entry" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="streams/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          {/* A ringing alarm is not swiped away: Reply, Snooze or hold to turn off. */}
          <Stack.Screen name="alarms/ring" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="diary/write" options={{ animation: 'slide_from_bottom' }} />
          {/* A swipe must not end a date by accident; the close button asks first. */}
          <Stack.Screen name="date/[placeId]" options={{ gestureEnabled: false }} />
        </Stack>
        <AlarmRuntime />
        <OnboardingGate />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * The 18+ gate for every route, not only the tabs (business-plan §7): until onboarding is done
 * (birth year 18+, name, first friend) any deep link (a push, `/chat/...`, `/store/...`,
 * `/character/...`) is sent to onboarding first. A blank cover hides the screen underneath until
 * saved data is loaded and the redirect has happened, so nothing shows before the age check.
 * New routes are covered without listing them (unlike `Stack.Protected`).
 */
function OnboardingGate() {
  const router = useRouter();
  const segments = useSegments();
  const navReady = !!useRootNavigationState()?.key;
  const hydrated = useAppStore((s) => s.hydrated);
  const onboarded = useAppStore((s) => !!s.user.onboardedAt);
  const outside = segments[0] !== 'onboarding';
  const blocked = !onboarded && outside;

  useEffect(() => {
    if (navReady && hydrated && blocked) router.replace('/onboarding');
  }, [navReady, hydrated, blocked, router]);

  // The splash goes once saved data is in and the right first screen is underneath, so launch
  // goes straight from the splash to content, without a blank cover in between.
  const released = hydrated && !blocked;
  useEffect(() => {
    if (released) SplashScreen.hideAsync().catch(() => {});
  }, [released]);

  if (released) return null;
  return <View style={styles.cover} pointerEvents="auto" />;
}

/**
 * A render error anywhere below the root lands here instead of a blank screen.
 * It replaces the whole layout, so it must not rely on the providers above
 * (no safe-area hook): plain padding keeps it clear of notches.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();

  // An error during launch must not stay hidden behind the splash.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (__DEV__) console.error(error);

  return (
    <View style={styles.error}>
      <Mascot size={120} />
      <Txt variant="h3" center>
        {t('errors.crashTitle', { defaultValue: 'Sigmazam tripped over a pebble' })}
      </Txt>
      <Txt variant="body" color={colors.textSecondary} center>
        {t('errors.crashBody', {
          defaultValue: 'Something went wrong on this screen. Your chats and shells are safe.',
        })}
      </Txt>
      <Button label={t('common.retry', { defaultValue: 'Retry' })} onPress={() => void retry()} full />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg },
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xxxl,
    backgroundColor: colors.bg,
  },
});
