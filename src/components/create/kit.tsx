import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, type KeyboardTypeOptions, type LayoutChangeEvent, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkNavBar } from '@/components/ink';
import { PressableScale, Txt } from '@/components/ui';
import type { CoachLevel, CoachResult } from '@/lib/greeting-coach';
import { bottomRoom, space, systemColors } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';

const GLASS_RIM = 'rgba(255,255,255,0.11)';
const FIELD_BG = '#0E0E14';
const FIELD_RIM = 'rgba(255,255,255,0.10)';
const FIELD_FOCUS = 'rgba(235,173,132,0.55)';
const CHIP_BG = 'rgba(118,118,128,0.22)';
const DOCK_BG = 'rgba(9,9,13,0.94)';

/**
 * Create Character kit (approved Ink Night+ prototype): pinned Apple HIG sticky nav bar, hairline-
 * rimmed obsidian cards, sunken focus-tinted input wells, dark-glass chips & ✦ rewrite buttons,
 * 4-bar Greeting Coach meter, and an anchored obsidian dock with a crisp white primary CTA.
 */

/** Sticky Apple HIG top bar for all Create Character phases. */
export function CreateHead({
  title,
  onBack,
  right,
  scrolled = true,
}: {
  title: string;
  onBack: () => void;
  right?: ReactNode;
  scrolled?: boolean;
}) {
  const { t } = useTranslation();
  return <InkNavBar backLabel={t('common.back')} onBack={onBack} title={title} scrolled={scrolled} right={right} />;
}

/** Compact top-right dark-glass 2-segment toggle for switching between Idea and Form modes. */
export function ModeSwitch({
  mode,
  ideaLabel,
  formLabel,
  onChange,
}: {
  mode: 'idea' | 'form';
  ideaLabel: string;
  formLabel: string;
  onChange: (next: 'idea' | 'form') => void;
}) {
  const options: { key: 'idea' | 'form'; label: string }[] = [
    { key: 'idea', label: ideaLabel },
    { key: 'form', label: formLabel },
  ];
  return (
    <View style={styles.modeTrack} accessibilityRole="tablist">
      {options.map(({ key, label }) => {
        const active = mode === key;
        return (
          <PressableScale
            key={key}
            scaleTo={0.94}
            dimOnPress={false}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            onPress={() => {
              if (!active) onChange(key);
            }}
            style={[styles.modePill, active && styles.modePillOn]}>
            <Txt style={[styles.modeText, active && styles.modeTextOn]} lines={1} maxFontSizeMultiplier={1.15}>
              {label}
            </Txt>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** An Ink Night+ card with a serif title; `problem` rings it in red and names what is missing. */
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

/** A labelled input on a sunken dark well that lights in warm peach on focus; `action` (✦) sits at the label's end. */
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
  const [focused, setFocused] = useState(false);
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={ink.placeholder}
        selectionColor={ink.accent}
        style={[
          styles.input,
          focused && styles.inputFocused,
          multiline && { minHeight: 22 * rows + 22, textAlignVertical: 'top' },
        ]}
        maxLength={max}
        multiline={multiline}
        keyboardType={keyboardType}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** The greeting coach's colour for each level: iOS system colours, warm to green. */
const LEVEL_COLOR: Record<CoachLevel, string> = {
  weak: systemColors.orange,
  okay: systemColors.yellow,
  good: systemColors.green,
  great: systemColors.green,
};

/**
 * The greeting coach under the first message (0z295, `src/lib/greeting-coach.ts`): four equal
 * flex bars and the level on one line, the one thing to do next under it. Nothing while empty.
 */
export function GreetingMeter({ result }: { result: CoachResult | null }) {
  const { t } = useTranslation();
  if (!result) return null;
  const color = LEVEL_COLOR[result.level];
  const level = t(`createCharacter.coach.${result.level}`);
  const tip = result.tip ? t(`createCharacter.coach.tip.${result.tip}`) : null;
  return (
    <View style={styles.meter} accessible accessibilityLabel={tip ? `${level}. ${tip}` : level}>
      <View style={styles.meterRow}>
        <View style={styles.bars}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.meterBar, i < result.score && { backgroundColor: color }]} />
          ))}
        </View>
        <Txt style={[styles.meterLevel, { color }]} lines={1}>
          {level}
        </Txt>
      </View>
      {tip ? <Txt style={styles.meterTip}>{tip}</Txt> : null}
    </View>
  );
}

/** Two short inputs side by side (age and height). */
export function FieldPair({ children }: { children: ReactNode }) {
  return <View style={styles.pair}>{children}</View>;
}

/** One dark-glass Ink Night+ chip: crisp white with dark ink when on. */
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

/** ✦: write this again. Dark-glass circle with warm peach sparkle; a spinner while busy. */
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
      {busy ? <ActivityIndicator size="small" color={ink.accent} /> : <Ionicons name="sparkles" size={15} color={ink.accent} />}
    </Pressable>
  );
}

/** A small round dark-glass icon button inside a card (shuffle, remove). */
export function SmallRound({
  icon,
  label,
  onPress,
  color = ink.text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.rewrite, pressed && styles.pressed]}>
      <Ionicons name={icon} size={16} color={color} />
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
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={ink.text2} />
    </Pressable>
  );
}

/**
 * Anchored obsidian dock: crisp white primary PillButton CTA, error slot above, and clean
 * caption + inline peach secondary action (e.g. "3 of 3 left today" | "Fill in myself") below.
 */
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
  const isDisabled = !!(disabled || busy);
  return (
    <View style={[styles.bar, { paddingBottom: bottomRoom(insets.bottom, space.md) }]}>
      {error ? (
        <Animated.View entering={FadeIn.duration(160)}>
          <Txt style={styles.error}>{error}</Txt>
        </Animated.View>
      ) : null}
      <PressableScale
        onPress={onPress}
        disabled={isDisabled}
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: !!busy }}
        style={[styles.cta, disabled && !busy && styles.ctaOff]}>
        {busy ? <ActivityIndicator color={ink.onAccent} /> : left}
        <Txt style={[styles.ctaText, disabled && !busy && styles.ctaTextOff]} maxFontSizeMultiplier={1.2}>
          {label}
        </Txt>
      </PressableScale>
      {secondary && caption ? (
        <View style={styles.footRow}>
          <Txt style={[styles.captionLeft, styles.tabular]} lines={1}>
            {caption}
          </Txt>
          <PressableScale
            onPress={secondary.onPress}
            hitSlop={8}
            scaleTo={0.95}
            accessibilityRole="button"
            style={styles.secondaryInline}>
            <Txt style={styles.secondaryInlineText} maxFontSizeMultiplier={1.2}>
              {secondary.label}
            </Txt>
          </PressableScale>
        </View>
      ) : secondary ? (
        <PressableScale onPress={secondary.onPress} scaleTo={0.97} accessibilityRole="button" style={styles.secondary}>
          <Txt style={styles.secondaryText} maxFontSizeMultiplier={1.2}>
            {secondary.label}
          </Txt>
        </PressableScale>
      ) : caption ? (
        <Txt style={styles.caption}>{caption}</Txt>
      ) : null}
    </View>
  );
}

/** How much room the dock takes, so a scroll ends cleanly above it. */
export const BOTTOM_BAR_SPACE = 136;

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  tabular: { fontVariant: ['tabular-nums'] },
  modeTrack: {
    height: 36,
    padding: 3,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: CHIP_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modePill: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modePillOn: { backgroundColor: ink.accent },
  modeText: { ...inkFace('caption'), fontSize: 12.5, color: 'rgba(235,235,245,0.68)' },
  modeTextOn: { color: ink.onAccent },
  card: {
    marginHorizontal: inkGutter,
    marginTop: 14,
    padding: 16,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  cardProblem: { borderWidth: 1.5, borderColor: systemColors.red },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: 8 },
  cardTitle: { ...inkFace('cardSmall'), color: ink.text },
  problem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: space.sm },
  problemText: { ...inkFace('subStrong'), flex: 1, color: systemColors.red },
  field: { marginTop: 10 },
  meter: { marginTop: 10, gap: 5 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bars: { flex: 1, flexDirection: 'row', gap: 5 },
  meterBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: ink.hairlineFill },
  meterLevel: { ...inkFace('caption'), fontWeight: '700' },
  meterTip: { ...inkFace('caption'), fontWeight: '400', color: ink.text2 },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 30, marginBottom: 6 },
  label: { ...inkFace('footnoteStrong'), color: ink.text2 },
  count: { ...inkFace('caption'), color: ink.text3, fontVariant: ['tabular-nums'] },
  input: {
    ...inkFace('body'),
    fontSize: 15,
    lineHeight: 21,
    minHeight: 46,
    paddingHorizontal: 13,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: 15,
    borderCurve: 'continuous',
    backgroundColor: FIELD_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FIELD_RIM,
    color: ink.text,
  },
  inputFocused: { borderColor: FIELD_FOCUS },
  pair: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 17,
    backgroundColor: CHIP_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  chipOn: { backgroundColor: 'rgba(235,173,132,0.18)', borderColor: ink.accent, borderWidth: 1.5 },
  chipText: { ...inkFace('footnoteStrong'), fontSize: 13, color: 'rgba(235,235,245,0.82)' },
  chipTextOn: { color: ink.accent },
  rewrite: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
  },
  pressed: { opacity: 0.65 },
  off: { opacity: 0.38 },
  disclosure: { flexDirection: 'row', alignItems: 'center', minHeight: 42 },
  disclosureText: { ...inkFace('cardSmall'), color: ink.text },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: inkGutter,
    paddingTop: 10,
    gap: 8,
    backgroundColor: DOCK_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ink.edge,
  },
  cta: {
    height: 52,
    borderRadius: 26,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ink.accent,
  },
  ctaOff: { backgroundColor: ink.raised },
  ctaText: { ...inkFace('bodyStrong'), color: ink.onAccent },
  ctaTextOff: { color: ink.text3 },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 4,
    minHeight: 28,
  },
  captionLeft: { ...inkFace('caption'), fontWeight: '400', color: ink.text2, flexShrink: 1 },
  secondaryInline: { minHeight: 28, justifyContent: 'center', paddingHorizontal: 4 },
  secondaryInlineText: { ...inkFace('caption'), fontSize: 12.5, color: ink.accent },
  caption: { ...inkFace('caption'), fontWeight: '400', textAlign: 'center', color: ink.text2 },
  secondary: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
  },
  secondaryText: { ...inkFace('subStrong'), color: ink.text },
  error: { ...inkFace('footnoteStrong'), textAlign: 'center', color: systemColors.red },
});
