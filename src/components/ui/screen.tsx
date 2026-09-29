import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, hitSlop, HEADER_HEIGHT, space } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Txt } from './text';

export interface ScreenProps {
  children: React.ReactNode;
  /** Solid background, or a two-stop gradient. */
  background?: string | readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  /** Skip the top inset when the screen paints its own header art. */
  edgeToEdge?: boolean;
  statusBarStyle?: 'light' | 'dark';
  /** Full-bleed layer painted over the background, under the content (e.g. a blurred portrait). */
  backdrop?: React.ReactNode;
}

export function Screen({
  children,
  background = colors.bg,
  style,
  edgeToEdge,
  statusBarStyle = 'dark',
  backdrop,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar style={statusBarStyle} />
      {typeof background === 'string' ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: background }]} />
      ) : (
        <LinearGradient colors={background} style={StyleSheet.absoluteFill} />
      )}
      {backdrop}
      <View style={[styles.content, !edgeToEdge && { paddingTop: insets.top }, style]}>{children}</View>
    </View>
  );
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
  tint = colors.text,
  style,
  large,
}: HeaderProps) {
  const router = useRouter();

  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
  };

  return (
    <View style={[styles.header, large && styles.headerLarge, style]}>
      <View style={styles.headerSide}>
        {back ? (
          <PressableScale onPress={goBack} hitSlop={hitSlop} style={styles.iconBtn} scaleTo={0.88}>
            <Ionicons name="chevron-back" size={26} color={tint} />
          </PressableScale>
        ) : (
          left
        )}
      </View>

      <View style={[styles.headerCenter, !center && styles.headerCenterStart]}>
        {title ? (
          <Txt variant={large ? 'h1' : 'h3'} color={tint} center={center} lines={1}>
            {title}
          </Txt>
        ) : null}
        {subtitle ? (
          <Txt variant="caption" color={colors.textMuted} center={center} lines={1}>
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
