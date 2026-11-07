import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { IDEA_MAX, SPARKS, SPARKS_MAX, type Spark } from '@/ai/character-draft';
import { DRAFT_MS } from '@/ai/character-studio';
import { GroupLabel, STORE } from '@/components/plans/store-look';
import { IconRow, InsetGroup, PressableScale, Txt } from '@/components/ui';
import { ROLES } from '@/lib/create-character';
import { aurora, colors, space, systemColors } from '@/theme';
import type { CharacterRole } from '@/types';

/**
 * Quick create's parts of the create screen (Character.AI's creation chain, teardown §11): the
 * idea with its sparks, the steps while the draft is written, and the ✦ that writes one field
 * of the form again. The look is the form's own (an iOS grouped form); the design pass comes later.
 */

/** One choice as a capsule: system grey, or the Store's tint when chosen. */
export function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      dimOnPress={false}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.pill, active && styles.pillOn]}>
      <Txt style={[styles.pillText, active && styles.pillTextOn]}>{label}</Txt>
    </PressableScale>
  );
}

/** A group label with a control at its end (✦, shuffle). */
export function SectionHead({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <View style={styles.head}>
      <Txt style={[styles.headText, styles.flex]}>{label}</Txt>
      {children}
    </View>
  );
}

/** ✦: write this field again. A spinner while it is being written. */
export function RewriteButton({ label, busy, disabled, onPress }: { label: string; busy: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: !!disabled }}
      style={styles.icon}>
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name="sparkles" size={18} color={disabled ? colors.textFaint : colors.primary} />
      )}
    </Pressable>
  );
}

/** Six sparks on show: the picked ones first, the rest from the shuffled page. */
function shownSparks(picked: readonly Spark[], page: number) {
  const rest = SPARKS.filter((spark) => !picked.includes(spark));
  const from = (page * 3) % rest.length;
  return [...picked, ...[...rest.slice(from), ...rest.slice(0, from)].slice(0, Math.max(0, 6 - picked.length))];
}

/** The idea: a sentence or two, up to three sparks and, if they like, what the character is to them. */
export function QuickIdea({
  idea,
  onIdea,
  sparks,
  onSparks,
  role,
  onRole,
  onManual,
}: {
  idea: string;
  onIdea: (idea: string) => void;
  sparks: Spark[];
  onSparks: (sparks: Spark[]) => void;
  role?: CharacterRole;
  onRole: (role?: CharacterRole) => void;
  onManual: () => void;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const toggle = (spark: Spark) =>
    onSparks(
      sparks.includes(spark) ? sparks.filter((s) => s !== spark) : sparks.length < SPARKS_MAX ? [...sparks, spark] : sparks,
    );

  return (
    <>
      <InsetGroup style={styles.first}>
        <TextInput
          value={idea}
          onChangeText={onIdea}
          placeholder={t('createCharacter.quick.ideaPlaceholder')}
          placeholderTextColor={colors.textFaint}
          style={styles.idea}
          maxLength={IDEA_MAX}
          multiline
          textAlignVertical="top"
          accessibilityLabel={t('createCharacter.quick.idea')}
        />
        <Txt style={styles.count}>{`${idea.length}/${IDEA_MAX}`}</Txt>
      </InsetGroup>

      <SectionHead label={t('createCharacter.quick.sparks', { count: sparks.length, max: SPARKS_MAX })}>
        <Pressable
          onPress={() => setPage((p) => p + 1)}
          accessibilityRole="button"
          accessibilityLabel={t('createCharacter.quick.shuffle')}
          style={styles.icon}>
          <Ionicons name="shuffle" size={20} color={colors.textSecondary} />
        </Pressable>
      </SectionHead>
      <InsetGroup style={styles.pills}>
        {shownSparks(sparks, page).map((spark) => (
          <Pill key={spark} label={t(`createCharacter.sparks.${spark}`)} active={sparks.includes(spark)} onPress={() => toggle(spark)} />
        ))}
      </InsetGroup>

      <GroupLabel>{t('createCharacter.role')}</GroupLabel>
      <InsetGroup style={styles.pills}>
        {ROLES.map((r) => (
          <Pill key={r} label={t(`createCharacter.roles.${r}`)} active={role === r} onPress={() => onRole(role === r ? undefined : r)} />
        ))}
      </InsetGroup>

      <InsetGroup style={styles.gap}>
        <IconRow icon="create-outline" fill={systemColors.gray} title={t('createCharacter.quick.manual')} last onPress={onManual} />
      </InsetGroup>
    </>
  );
}

const STEPS = ['who', 'talk', 'picture', 'last'] as const;

/** While the draft is written: a glowing portrait and four steps ticking off over `DRAFT_MS`. */
export function WritingSteps() {
  const { t } = useTranslation();
  const still = useReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = STEPS.slice(1).map((_, i) => setTimeout(() => setStep(i + 1), ((i + 1) * DRAFT_MS) / STEPS.length));
    return () => timers.forEach(clearTimeout);
  }, []);

  const glow = useSharedValue(0);
  useEffect(() => {
    if (!still) glow.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [glow, still]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.6 + glow.value * 0.4, transform: [{ scale: 0.96 + glow.value * 0.04 }] }));

  return (
    <View style={styles.writing}>
      <Animated.View style={[styles.portrait, glowStyle]}>
        <Ionicons name="sparkles" size={40} color={colors.white} />
      </Animated.View>
      <Txt style={styles.writingTitle}>{t('createCharacter.quick.writing')}</Txt>
      <InsetGroup style={styles.steps}>
        {STEPS.map((key, i) => (
          <View key={key} style={[styles.step, i < STEPS.length - 1 && styles.line]}>
            {i < step ? (
              <Ionicons name="checkmark-circle" size={22} color={systemColors.green} />
            ) : i === step ? (
              <ActivityIndicator size="small" color={colors.textSecondary} style={styles.stepMark} />
            ) : (
              <View style={styles.stepMark}>
                <View style={styles.stepDot} />
              </View>
            )}
            <Txt style={[styles.stepText, i > step && styles.stepLater]}>{t(`createCharacter.quick.steps.${key}`)}</Txt>
          </View>
        ))}
      </InsetGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: 14 },
  pill: { height: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: 'center', backgroundColor: systemColors.fill },
  pillOn: { backgroundColor: STORE.tint },
  pillText: { fontSize: 15, letterSpacing: -0.2, color: colors.text },
  pillTextOn: { fontWeight: '600', color: STORE.onTint },
  // Matches GroupLabel, with room for a 44pt control at the end.
  head: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginTop: 10, marginLeft: space.lg * 2, marginRight: space.sm },
  headText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2, color: aurora.textMuted, textTransform: 'uppercase' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  idea: { minHeight: 112, paddingHorizontal: space.lg, paddingTop: 12, fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.text },
  count: { paddingHorizontal: space.lg, paddingBottom: 10, textAlign: 'right', fontSize: 13, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  first: { marginTop: 14 },
  gap: { marginTop: space.xxl },
  writing: { alignItems: 'center', paddingTop: space.huge },
  portrait: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryFill },
  writingTitle: { marginTop: 26, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 0.3, color: colors.text },
  steps: { alignSelf: 'stretch', marginTop: 28 },
  step: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: space.md, marginLeft: space.lg, paddingRight: space.lg },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  stepMark: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  stepDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.track },
  stepText: { flex: 1, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  stepLater: { color: colors.textSecondary },
});
