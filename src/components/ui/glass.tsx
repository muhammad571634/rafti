import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useCallback, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { colors, shadows, space } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Txt } from './text';

/** The iOS-look glass surface: a frosted fill, a hairline and a soft shadow. */
export const glassStyle: ViewStyle = {
  backgroundColor: colors.glass,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.glassLine,
  ...shadows.glassButton,
};

/** A 44pt glass circle with an icon, or a glass pill with a word ("Edit"). */
export function GlassButton({
  icon,
  label,
  accessibilityLabel,
  onPress,
  style,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  accessibilityLabel?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressableScale
      scaleTo={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[glassStyle, label ? styles.pill : styles.round, style]}>
      {icon ? (
        <Ionicons name={icon} size={icon === 'chevron-back' ? 24 : 22} color={colors.text} style={icon === 'chevron-back' && styles.back} />
      ) : (
        <Txt style={styles.label}>{label}</Txt>
      )}
    </PressableScale>
  );
}

/** Glass back button for the iOS-look screens. */
export function BackButton({ onPress }: { onPress?: () => void }) {
  const router = useRouter();
  const { t } = useTranslation();
  return <GlassButton icon="chevron-back" accessibilityLabel={t('a11y.back')} onPress={onPress ?? (() => router.back())} />;
}

/**
 * True once the list has scrolled past `threshold` (the large title or the hero name): the
 * glass bar then shows the screen's name and a hairline, iOS's scroll-edge look.
 */
export function useScrolledPast(threshold: number) {
  const [scrolled, setScrolled] = useState(false);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const past = e.nativeEvent.contentOffset.y > threshold;
      setScrolled((was) => (was === past ? was : past));
    },
    [threshold],
  );
  return { scrolled, onScroll };
}

/**
 * The top bar of an iOS-look screen: back on the left, an optional action on the right. Once
 * the content has scrolled under it (`scrolled`), the screen's `title` fades in at the centre
 * and a hairline marks the edge, as iOS 26/27 bars do.
 */
export function GlassBar({ right, title, scrolled }: { right?: React.ReactNode; title?: string; scrolled?: boolean }) {
  return (
    <View style={[styles.bar, scrolled && styles.barScrolled]}>
      <BackButton />
      {title && scrolled ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.barTitleWrap} pointerEvents="none">
          <Txt style={styles.barTitle} lines={1}>
            {title}
          </Txt>
        </Animated.View>
      ) : null}
      {right ?? <View style={styles.barSpacer} />}
    </View>
  );
}

/** iOS inset grouped list: a white card 16pt in, with hairlines between its rows. */
export function InsetGroup({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.group, style]}>{children}</View>;
}

/** One row of an inset group: label, optional value and chevron; red for destructive rows. */
export function InsetRow({
  label,
  meta,
  chevron,
  danger,
  last,
  onPress,
}: {
  label: string;
  meta?: string;
  chevron?: boolean;
  danger?: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={meta ? `${label}, ${meta}` : label}
      style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && styles.rowPressed]}>
      <Txt style={[styles.rowText, styles.flex]} color={danger ? colors.danger : colors.text}>
        {label}
      </Txt>
      {meta ? <Txt style={[styles.rowText, styles.meta]}>{meta}</Txt> : null}
      {chevron ? <Ionicons name="chevron-forward" size={15} color={colors.textFaint} /> : null}
    </Pressable>
  );
}

/** Large left-aligned title under the glass bar (34pt, iOS large title). */
export function LargeTitle({ children }: { children: string }) {
  return (
    <Txt style={styles.largeTitle} accessibilityRole="header">
      {children}
    </Txt>
  );
}

const styles = StyleSheet.create({
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pill: { height: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: 'center' },
  back: { marginLeft: -2 },
  label: { fontSize: 17, fontWeight: '500', letterSpacing: -0.4 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  barScrolled: { borderBottomColor: colors.borderStrong },
  // Centred on the screen, between the side buttons (they keep 44pt each side).
  barTitleWrap: { position: 'absolute', left: 72, right: 72, top: space.xs, bottom: space.sm, justifyContent: 'center' },
  barTitle: { textAlign: 'center', fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  barSpacer: { width: 44 },
  group: { marginHorizontal: space.lg, borderRadius: 14, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.lg },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowText: { fontSize: 17, letterSpacing: -0.4 },
  meta: { color: colors.textSecondary },
  flex: { flex: 1 },
  largeTitle: {
    marginTop: 10,
    marginHorizontal: space.lg,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.text,
  },
});
