import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { IDEA_MAX, SPARKS, SPARKS_MAX, type Spark } from '@/ai/character-draft';
import { DRAFT_MS } from '@/ai/character-studio';
import { DotMatrix, PressableScale, Txt } from '@/components/ui';
import { ROLES } from '@/lib/create-character';
import { colors, fonts, space, systemGround } from '@/theme';
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
            <Ionicons name="document-text" size={20} color={systemGround.label} />
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

/** The waits' dots: a calm green field, the canvas's writing colour, deeper towards the edge. */
const WAIT_DOTS = '#42D98B';
const WAIT_DOTS_EDGE = '#1E7A50';
const FIELD = 220;

/**
 * A model at work, the Ink way (owner, 2026-11-13, from the canvas frame "8 · Model writing", which
 * asks for it at every wait): a rounded square of dots breathing in waves (`DotMatrix`, one shader
 * draw a frame), the title in serif italic, and steps ticking off over `ms` (HIG Progress
 * indicators: say what is happening; the steps are paced, the real answer ends the wait). Reduce
 * Motion holds the field still and the steps still tick.
 */
export function DotWait({ title, steps, ms = DRAFT_MS }: { title: string; steps?: readonly string[]; ms?: number }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!steps?.length) return;
    const timers = steps.slice(1).map((_, i) => setTimeout(() => setStep(i + 1), ((i + 1) * ms) / steps.length));
    return () => timers.forEach(clearTimeout);
  }, [steps, ms]);

  return (
    <View style={styles.wait} accessible accessibilityLiveRegion="polite" accessibilityLabel={[title, steps?.[step]].filter(Boolean).join(', ')}>
      <DotMatrix size={FIELD} color={WAIT_DOTS} color2={WAIT_DOTS_EDGE} cells={15} shape="square" energy={0.75} />
      <Txt style={styles.waitTitle} maxFontSizeMultiplier={1.3}>
        {title}
      </Txt>
      {steps?.length ? (
        <View style={styles.steps}>
          {steps.map((label, i) => {
            const state = i < step ? 'done' : i === step ? 'now' : 'later';
            return (
              <Animated.View key={label} entering={FadeIn.duration(200)} style={styles.step}>
                <StepMark state={state} />
                <Txt style={[styles.stepText, state === 'now' && styles.stepNow]} lines={1}>
                  {label}
                </Txt>
              </Animated.View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** While the draft is written: the dots and four steps (who, how they talk, their picture, the last touches). */
export function WritingSteps() {
  const { t } = useTranslation();
  const steps = useMemo(() => STEPS.map((key) => t(`createCharacter.quick.steps.${key}`)), [t]);
  return <DotWait title={t('createCharacter.quick.writing')} steps={steps} />;
}

/** A step's mark: a green tick once done (it pops in), a green dot now, an empty ring still to come. */
function StepMark({ state }: { state: 'done' | 'now' | 'later' }) {
  const pop = useSharedValue(state === 'done' ? 1 : 0.6);
  useEffect(() => {
    if (state === 'done') pop.value = withSpring(1, { damping: 9, stiffness: 260 });
  }, [pop, state]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <View style={styles.mark}>
      {state === 'done' ? (
        <Animated.View style={style}>
          <Ionicons name="checkmark" size={22} color={WAIT_DOTS} />
        </Animated.View>
      ) : (
        <View style={state === 'now' ? styles.markNow : styles.markLater} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  // Find's section title.
  ask: { marginTop: space.md, marginHorizontal: space.lg, fontFamily: fonts.playful, fontSize: 21, lineHeight: 26, color: systemGround.label },
  idea: { minHeight: 112, fontSize: 18, lineHeight: 24, letterSpacing: -0.3, color: colors.text },
  count: { textAlign: 'right', fontSize: 12, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  continueRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  continueIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.fill },
  continueText: { fontFamily: fonts.playfulBold, fontSize: 16, color: systemGround.label },
  continueButtons: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  smallButton: { flex: 1, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.fill },
  smallOn: { backgroundColor: systemGround.label },
  smallText: { fontFamily: fonts.playfulBold, fontSize: 15, color: systemGround.label },
  smallTextOn: { color: systemGround.ground },
  // The writing wait, centred in the page.
  wait: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, paddingBottom: space.huge },
  waitTitle: { marginTop: space.xl, fontFamily: fonts.serifItalic, fontSize: 30, lineHeight: 38, letterSpacing: -0.3, color: WAIT_DOTS, textAlign: 'center' },
  steps: { marginTop: space.lg, gap: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 40 },
  stepText: { fontSize: 17, lineHeight: 22, letterSpacing: -0.3, color: systemGround.secondaryLabel },
  stepNow: { fontWeight: '600', color: systemGround.label },
  mark: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  markNow: { width: 14, height: 14, borderRadius: 7, backgroundColor: WAIT_DOTS },
  markLater: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: systemGround.secondaryLabel },
});
