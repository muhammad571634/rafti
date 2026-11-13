import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, HEADER_HEIGHT, hitSlop, night as nightTokens, NightScope, space, useNight, useTokens } from '@/theme';

import { AuroraBackground } from './aurora';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

export interface ScreenProps {
  children: React.ReactNode;
  /** Solid background, a two-stop gradient, or `'aurora'`: the app's default ground (`AuroraBackground`). */
  background?: 'aurora' | string | readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  /** Skip the top inset when the screen paints its own header art. */
  edgeToEdge?: boolean;
  statusBarStyle?: 'light' | 'dark';
  /** Full-bleed layer painted over the background, under the content (e.g. a blurred portrait). */
  backdrop?: React.ReactNode;
  /**
   * Always dark, whatever the phone is set to (appearance B: a screen where you are with a
   * character): light status bar, the night ground, and the kit inside reads the night tokens.
   */
  night?: boolean;
}

export function Screen({
  children,
  background,
  style,
  edgeToEdge,
  statusBarStyle,
  backdrop,
  night,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  // Only the screen on top sets the status bar. Tabs stay mounted, and the status bar follows the
  // last StatusBar mounted, so Today's light icons on its picture turned dark after a visit to
  // Chats or Find (A51, 0z131). Unmounted on blur, mounted again on focus, it is always the last.
  const focused = useIsFocused();
  const scoped = useNight();
  const dark = night || scoped;
  const ground = background ?? (night ? nightTokens.colors.bg : colors.bg);

  const screen = (
    <View style={[styles.root, night && styles.nightRoot]}>
      {focused ? <StatusBar style={statusBarStyle ?? (dark ? 'light' : 'dark')} /> : null}
      {ground === 'aurora' ? (
        <AuroraBackground />
      ) : typeof ground === 'string' ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: ground }]} />
      ) : (
        <LinearGradient colors={ground} style={StyleSheet.absoluteFill} />
      )}
      {backdrop}
      <View style={[styles.content, !edgeToEdge && { paddingTop: insets.top }, style]}>{children}</View>
    </View>
  );
  return night ? <NightScope.Provider value>{screen}</NightScope.Provider> : screen;
}

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  /** Shows the chevron-back control. Defaults to true when the stack can go back. */
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  left?: React.ReactNode;
  center?: boolean;
  tint?: string;
  style?: StyleProp<ViewStyle>;
  /** Big left-aligned title, like the Find screen. */
  large?: boolean;
}

export function Header({
  title,
  subtitle,
  back = true,
  onBack,
  right,
  left,
  center = false,
  tint,
  style,
  large,
}: HeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const tokens = useTokens();
  const ink = tint ?? tokens.colors.text;

  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
  };

  return (
    <View style={[styles.header, large && styles.headerLarge, style]}>
      <View style={styles.headerSide}>
        {back ? (
          <PressableScale
            onPress={goBack}
            hitSlop={hitSlop}
            style={styles.iconBtn}
            scaleTo={0.88}
            accessibilityLabel={t('a11y.back')}>
            <Ionicons name="chevron-back" size={26} color={ink} />
          </PressableScale>
        ) : (
          left
        )}
      </View>

      <View style={[styles.headerCenter, !center && styles.headerCenterStart]}>
        {title ? (
          <Txt variant={large ? 'h1' : 'h3'} color={ink} center={center} lines={1}>
            {title}
          </Txt>
        ) : null}
        {subtitle ? (
          <Txt variant="caption" color={tokens.colors.textMuted} center={center} lines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>

      <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  nightRoot: { backgroundColor: nightTokens.colors.bg },
  content: { flex: 1 },
  header: {
    minHeight: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
  },
  headerLarge: {
    minHeight: 64,
    paddingHorizontal: space.md,
  },
  headerSide: {
    minWidth: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: { justifyContent: 'flex-end' },
  headerCenter: { flex: 1, justifyContent: 'center' },
  headerCenterStart: { alignItems: 'flex-start' },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
