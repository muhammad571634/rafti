// Native linking overrides for the autolinker (read by Expo prebuild and the React Native CLI).
module.exports = {
  dependencies: {
    // Android-only alarms (src/notifications/alarm-android.ts never loads it on iOS). Linked on iOS,
    // its launch hooks re-chain the UNUserNotificationCenter delegate that expo-notifications owns,
    // and the app closed at launch on every iPhone (found on a VibeView iOS simulator, 2026-11-26).
    'react-native-notify-kit': { platforms: { ios: null } },
  },
};
