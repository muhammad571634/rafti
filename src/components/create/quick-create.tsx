import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';

import { IDEA_MAX, SPARKS, SPARKS_MAX, type Spark } from '@/ai/character-draft';
import { DRAFT_MS } from '@/ai/character-studio';
import { PressableScale, Txt } from '@/components/ui';
import { ROLES } from '@/lib/create-character';
import { colors, fonts, playful, space, systemColors } from '@/theme';
import type { CharacterRole } from '@/types';

import { Card, Chip, ChipGroup, SmallRound } from './kit';

/**
 * Quick create's parts of the create screen (Character.AI's creation chain, teardown §11), in the
 * main tabs' look (0z149, design-style §10 "beautiful, not toy-like"): the idea in a white card
 * with its sparks and role as soft chips, and a calm portrait that breathes while the draft is
 * written. `Pill` stays for the other forms that use it.
 */

/** One choice as a soft capsule, ink when chosen (personas, lore, streams). */
export function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Chip label={label} on={active} onPress={onPress} />;
}

/** Six sparks on show: the picked ones first, the rest from the shuffled page. */
function shownSparks(picked: readonly Spark[], page: number) {
  const rest = SPARKS.filter((spark) => !picked.includes(spark));
  const from = (page * 3) % rest.length;
  return [...picked, ...[...rest.slice(from), ...rest.slice(0, from)].slice(0, Math.max(0, 6 - picked.length))];
}

/** The idea: a sentence or two, up to three sparks and, if they like, what they are to you. */
export function QuickIdea({
  idea,
  onIdea,
  sparks,
  onSparks,
  role,
  onRole,
  problem,
}: {
  idea: string;
  onIdea: (idea: string) => void;
  sparks: Spark[];
  onSparks: (sparks: Spark[]) => void;
  role?: CharacterRole;
  onRole: (role?: CharacterRole) => void;
  problem?: string | null;
}) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const toggle = (spark: Spark) =>
    onSparks(sparks.includes(spark) ? sparks.filter((s) => s !== spark) : sparks.length < SPARKS_MAX ? [...sparks, spark] : sparks);

  return (
    <>
      <Txt style={styles.ask} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        {t('createCharacter.quick.ask')}
      </Txt>

      <Card problem={problem}>
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
      </Card>

      <Card>
        <ChipGroup
          label={t('createCharacter.quick.sparks', { count: sparks.length, max: SPARKS_MAX })}
          right={<SmallRound icon="shuffle" label={t('createCharacter.quick.shuffle')} onPress={() => setPage((p) => p + 1)} />}>
          {shownSparks(sparks, page).map((spark) => (
            <Chip key={spark} label={t(`createCharacter.sparks.${spark}`)} on={sparks.includes(spark)} onPress={() => toggle(spark)} />
          ))}
        </ChipGroup>
        <ChipGroup label={t('createCharacter.role')}>
          {ROLES.map((r) => (
            <Chip key={r} label={t(`createCharacter.roles.${r}`)} on={role === r} onPress={() => onRole(role === r ? undefined : r)} />
          ))}
        </ChipGroup>
      </Card>
    </>
  );
}

/** A kept, unfinished character offered back: continue it or start again. */
export function ContinueCard({ name, onContinue, onDrop }: { name: string; onContinue: () => void; onDrop: () => void }) {
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <Card>
        <View style={styles.continueRow}>
          <View style={styles.continueIcon}>
            <Ionicons name="document-text" size={20} color={playful.ink} />
          </View>
          <Txt style={[styles.continueText, styles.grow]} lines={2}>
            {name ? t('createCharacter.flow.continueNamed', { name }) : t('createCharacter.flow.continue')}
          </Txt>
        </View>
        <View style={styles.continueButtons}>
          <PressableScale onPress={onContinue} scaleTo={0.96} accessibilityRole="button" style={[styles.smallButton, styles.smallOn]}>
            <Txt style={[styles.smallText, styles.smallTextOn]}>{t('createCharacter.flow.open')}</Txt>
          </PressableScale>
          <PressableScale onPress={onDrop} scaleTo={0.96} accessibilityRole="button" style={styles.smallButton}>
            <Txt style={styles.smallText}>{t('createCharacter.flow.startOver')}</Txt>
          </PressableScale>
        </View>
      </Card>
    </Animated.View>
  );
}

const STEPS = ['who', 'talk', 'picture', 'last'] as const;

/** While the draft is written: an empty portrait breathes, its ring turning, and four steps tick off over `DRAFT_MS`. */
export function WritingSteps() {
  const { t } = useTranslation();
  const still = useReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = STEPS.slice(1).map((_, i) => setTimeout(() => setStep(i + 1), ((i + 1) * DRAFT_MS) / STEPS.length));
    return () => timers.forEach(clearTimeout);
  }, []);

  const breath = useSharedValue(0);
  const turn = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    breath.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
    turn.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1, false);
  }, [breath, turn, still]);
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.96 + breath.value * 0.04 }] }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));

  return (
    <View style={styles.writing}>
      <View style={styles.portraitBox}>
        <Animated.View style={[styles.portraitRing, ringStyle]} />
        <Animated.View style={[styles.portrait, faceStyle]}>
          <Ionicons name="sparkles" size={44} color={colors.primary} />
        </Animated.View>
      </View>
      <Txt style={styles.writingTitle} maxFontSizeMultiplier={1.3}>
        {t('createCharacter.quick.writing')}
      </Txt>
      <Card>
        {STEPS.map((key, i) => (
          <View key={key} style={styles.step}>
            <StepMark state={i < step ? 'done' : i === step ? 'now' : 'later'} />
            <Txt style={[styles.stepText, i > step && styles.stepLater]}>{t(`createCharacter.quick.steps.${key}`)}</Txt>
          </View>
        ))}
      </Card>
    </View>
  );
}

function StepMark({ state }: { state: 'done' | 'now' | 'later' }) {
  const pop = useSharedValue(state === 'done' ? 1 : 0.6);
  useEffect(() => {
    if (state === 'done') pop.value = withSpring(1, { damping: 9, stiffness: 260 });
  }, [pop, state]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  if (state === 'done') {
    return (
      <Animated.View style={[styles.mark, styles.markDone, style]}>
        <Ionicons name="checkmark" size={16} color={colors.white} />
      </Animated.View>
    );
  }
  return <View style={[styles.mark, state === 'now' ? styles.markNow : styles.markLater]} />;
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  // Find's section title.
  ask: { marginTop: space.md, marginHorizontal: space.lg, fontFamily: fonts.playful, fontSize: 21, lineHeight: 26, color: playful.ink },
  idea: { minHeight: 112, fontSize: 18, lineHeight: 24, letterSpacing: -0.3, color: colors.text },
  count: { textAlign: 'right', fontSize: 12, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  continueRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  continueIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: playful.chip },
  continueText: { fontFamily: fonts.playfulBold, fontSize: 16, color: playful.ink },
  continueButtons: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  smallButton: { flex: 1, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: playful.chip },
  smallOn: { backgroundColor: playful.chipOn },
  smallText: { fontFamily: fonts.playfulBold, fontSize: 15, color: playful.ink },
  smallTextOn: { color: playful.chipOnText },
  writing: { alignItems: 'stretch', paddingTop: space.xxl },
  portraitBox: { alignSelf: 'center', width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  // A ring with one bright arc, turning: the iOS activity feel, at portrait size.
  portraitRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: colors.primarySofter, borderTopColor: colors.primary },
  portrait: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: playful.card },
  writingTitle: { alignSelf: 'center', marginTop: space.xl, marginBottom: space.xs, fontFamily: fonts.playful, fontSize: 24, lineHeight: 30, color: playful.ink },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 46 },
  stepText: { flex: 1, fontSize: 17, letterSpacing: -0.3, color: colors.text },
  stepLater: { color: colors.textSecondary },
  mark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  markDone: { backgroundColor: systemColors.green },
  markNow: { borderWidth: 3, borderColor: colors.primary },
  markLater: { borderWidth: 2, borderColor: colors.track },
});
