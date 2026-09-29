import { Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button, Mascot, Txt } from '@/components/ui';
import { initI18n } from '@/i18n';
import { colors, space } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({ Fredoka_600SemiBold, Fredoka_700Bold });
  // A font that fails to load falls back to the system face rather than blocking launch.
  const ready = i18nReady && (fontsLoaded || !!fontError);

  useEffect(() => {
    initI18n()
      .catch(() => {})
      .finally(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
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
          <Stack.Screen name="call/[id]" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
          <Stack.Screen
            name="call/incoming/[id]"
            options={{ animation: 'fade', presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen name="create-character" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="diary/write" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * A render error anywhere below the root lands here instead of a blank screen.
 * It replaces the whole layout, so it must not rely on the providers above
 * (no safe-area hook): plain padding keeps it clear of notches.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();

  if (__DEV__) console.error(error);

  return (
    <View style={styles.error}>
      <Mascot size={120} />
      <Txt variant="h3" center>
        {t('errors.crashTitle', { defaultValue: 'Rafti tripped over a pebble' })}
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
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xxxl,
    backgroundColor: colors.bg,
  },
});
