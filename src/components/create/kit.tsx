import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, type KeyboardTypeOptions, type LayoutChangeEvent, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, Txt } from '@/components/ui';
import { colors, fonts, space, systemColors, systemGround } from '@/theme';

/**
 * The create screen's parts in the playful skin (design-style §10, 0z149): the cream ground, a
 * heavy rounded title, white cards with soft chips, the ✦ that writes a field again, and one big
 * peach button at the bottom. Text the user types stays on the system face (every script).
 */

/** The top: a round back button and the screen's title. */
export function CreateHead({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <View style={styles.head}>
      <PressableScale onPress={onBack} scaleTo={0.9} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.back')} style={styles.round}>
        <Ionicons name="chevron-back" size={22} color={systemGround.label} />
      </PressableScale>
      {/* A long title ("Редактировать персонажа") shrinks to fit rather than being cut. */}
      <Txt style={[styles.title, styles.grow]} lines={1} adjustsFontSizeToFit minimumFontScale={0.7} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        {title}
      </Txt>
      {right}
    </View>
  );
}

/** A white card with a heavy title; `problem` shows what is missing here, in red, and rings it. */
export function Card({
  title,
  right,
  problem,
  onLayout,
  children,
}: {
  title?: string;
  right?: ReactNode;
  problem?: string | null;
  onLayout?: (e: LayoutChangeEvent) => void;
  children: ReactNode;
}) {
  return (
    <View onLayout={onLayout} style={[styles.card, problem ? styles.cardProblem : null]} collapsable={false}>
      {title || right ? (
        <View style={styles.cardHead}>
          {title ? (
            <Txt style={[styles.cardTitle, styles.grow]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
              {title}
            </Txt>
          ) : (
            <View style={styles.grow} />
          )}
          {right}
        </View>
      ) : null}
      {problem ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.problem}>
          <Ionicons name="alert-circle" size={16} color={systemColors.red} />
          <Txt style={styles.problemText}>{problem}</Txt>
        </Animated.View>
      ) : null}
      {children}
    </View>
  );
}

/** A labelled input on a soft well; `action` (✦) sits at the label's end. */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  max,
  multiline,
  keyboardType,
  action,
  rows = 3,
  hideLabel,
}: {
  label: string;
  /** The card's title already says it (the first message): the label stays for screen readers only. */
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  max: number;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  action?: ReactNode;
  rows?: number;
}) {
  return (
    <View style={styles.field}>
      {hideLabel ? null : (
        <View style={styles.fieldHead}>
          <Txt style={[styles.label, styles.grow]}>{label}</Txt>
          {multiline && value.length > max * 0.8 ? <Txt style={styles.count}>{`${value.length}/${max}`}</Txt> : null}
          {action}
        </View>
      )}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={[styles.input, multiline && { minHeight: 22 * rows + 24, textAlignVertical: 'top' }]}
        maxLength={max}
        multiline={multiline}
        keyboardType={keyboardType}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** Two short inputs side by side (age and height). */
export function FieldPair({ children }: { children: ReactNode }) {
  return <View style={styles.pair}>{children}</View>;
}

/** One soft chip: ink when on. */
export function Chip({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: ReactNode }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      dimOnPress={false}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[styles.chip, on && styles.chipOn]}>
      {icon}
      <Txt style={[styles.chipText, on && styles.chipTextOn]} maxFontSizeMultiplier={1.3}>
        {label}
      </Txt>
    </PressableScale>
  );
}

/** A label over a wrap of chips. */
export function ChipGroup({ label, right, children }: { label?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.field}>
      {label || right ? (
        <View style={styles.fieldHead}>
          <Txt style={[styles.label, styles.grow]}>{label}</Txt>
          {right}
        </View>
      ) : null}
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

/** ✦: write this again. A spinner while it is being written. */
export function Rewrite({ label, busy, disabled, onPress }: { label: string; busy: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: !!disabled }}
      style={({ pressed }) => [styles.rewrite, pressed && styles.pressed, disabled && styles.off]}>
      {busy ? <ActivityIndicator size="small" color={colors.brandText} /> : <Ionicons name="sparkles" size={16} color={colors.brandText} />}
    </Pressable>
  );
}

/** A small round icon button inside a card (shuffle, remove). */
export function SmallRound({ icon, label, onPress, color = systemGround.label }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.rewrite, styles.soft, pressed && styles.pressed]}>
      <Ionicons name={icon} size={17} color={color} />
    </Pressable>
  );
}

/** A row that opens or closes the card's extra part. */
export function Disclosure({ label, open, onPress }: { label: string; open: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      style={({ pressed }) => [styles.disclosure, pressed && styles.pressed]}>
      <Txt style={[styles.disclosureText, styles.grow]}>{label}</Txt>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

/** The bottom: one big peach button over a fade of the ground, a line under it, and room for an error. */
export function BottomBar({
  label,
  onPress,
  disabled,
  busy,
  left,
  caption,
  error,
  secondary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  left?: ReactNode;
  caption?: string;
  error?: string | null;
  secondary?: { label: string; onPress: () => void };
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.md) }]} pointerEvents="box-none">
      <LinearGradient colors={systemGround.groundFade} style={styles.fade} pointerEvents="none" />
      <View style={styles.barBody}>
        {error ? (
          <Animated.View entering={FadeIn.duration(160)}>
            <Txt style={styles.error}>{error}</Txt>
          </Animated.View>
        ) : null}
        <PressableScale
          onPress={onPress}
          disabled={disabled || busy}
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
          style={[styles.cta, disabled && !busy && styles.ctaOff]}>
          {busy ? <ActivityIndicator color={colors.textOnPrimary} /> : left}
          <Txt style={[styles.ctaText, disabled && !busy && styles.ctaTextOff]} maxFontSizeMultiplier={1.2}>
            {label}
          </Txt>
        </PressableScale>
        {secondary ? (
          <PressableScale onPress={secondary.onPress} scaleTo={0.97} accessibilityRole="button" style={styles.secondary}>
            <Txt style={styles.secondaryText} maxFontSizeMultiplier={1.2}>
              {secondary.label}
            </Txt>
          </PressableScale>
        ) : null}
        {caption ? <Txt style={styles.caption}>{caption}</Txt> : null}
      </View>
    </View>
  );
}

/** How much room the bar takes, so a scroll ends above it. */
export const BOTTOM_BAR_SPACE = 170;

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.sm },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.fill },
  title: { fontFamily: fonts.playful, fontSize: 28, lineHeight: 36, letterSpacing: -0.3, color: systemGround.label },
  card: { marginHorizontal: space.lg, marginTop: 14, padding: space.lg, borderRadius: 24, backgroundColor: systemGround.card, borderWidth: 2, borderColor: 'transparent' },
  cardProblem: { borderColor: systemColors.red },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  cardTitle: { fontFamily: fonts.playful, fontSize: 20, lineHeight: 26, color: systemGround.label },
  problem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: space.sm },
  problemText: { flex: 1, fontSize: 14, fontWeight: '600', color: systemColors.red },
  field: { marginTop: space.sm },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32, marginBottom: 6 },
  label: { fontFamily: fonts.playfulBold, fontSize: 14, color: colors.textSecondary },
  count: { fontSize: 12, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 14,
    backgroundColor: systemGround.fill,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
    color: colors.text,
  },
  pair: { flexDirection: 'row', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 19, backgroundColor: systemGround.fill },
  chipOn: { backgroundColor: systemGround.label },
  chipText: { fontFamily: fonts.playfulBold, fontSize: 14.5, color: systemGround.label },
  chipTextOn: { color: systemGround.ground },
  rewrite: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySofter },
  soft: { backgroundColor: systemGround.fill },
  pressed: { opacity: 0.6 },
  off: { opacity: 0.4 },
  disclosure: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginTop: space.sm },
  // Reads as a card title: the closed card is its own section.
  disclosureText: { fontFamily: fonts.playful, fontSize: 20, lineHeight: 26, color: systemGround.label },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: systemGround.ground },
  // The ground fades in above the bar; behind it the ground is solid, so nothing shows through.
  fade: { position: 'absolute', left: 0, right: 0, top: -28, height: 28 },
  barBody: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm, backgroundColor: systemGround.ground },
  cta: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.primaryFill,
  },
  // Off: a solid soft fill, never see-through.
  ctaOff: { backgroundColor: systemGround.fill },
  ctaTextOff: { color: colors.textFaint },
  // System bold: the button's words come in every script.
  ctaText: { fontSize: 18, fontWeight: '700', color: colors.textOnPrimary },
  caption: { textAlign: 'center', fontSize: 13, color: colors.textSecondary },
  secondary: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.fill },
  secondaryText: { fontFamily: fonts.playfulBold, fontSize: 16, color: systemGround.label },
  error: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: systemColors.red },
});
