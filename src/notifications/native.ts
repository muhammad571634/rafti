import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

/**
 * Where local notifications can run. Web has none, and Android Expo Go throws as soon
 * as `expo-notifications` is imported (removed from Expo Go in SDK 53): there the app
 * must keep working, just without pushes. A development build or a store build has them.
 */
const expoGoAndroid =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const pushSupported = (Platform.OS === 'ios' || Platform.OS === 'android') && !expoGoAndroid;

let loaded: NotificationsModule | null | undefined;

/** The module, loaded on first use and only where it is supported; null elsewhere. */
export function notificationsModule(): NotificationsModule | null {
  if (!pushSupported) return null;
  if (loaded === undefined) {
    try {
      // Deferred on purpose: a top-level import would run (and throw) in Expo Go.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      loaded = require('expo-notifications') as NotificationsModule;
    } catch {
      loaded = null;
    }
  }
  return loaded;
}
