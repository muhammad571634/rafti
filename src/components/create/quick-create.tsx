import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { IDEA_MAX, SPARKS, SPARKS_MAX, type Spark } from '@/ai/character-draft';
import { DRAFT_MS } from '@/ai/character-studio';
import { InkText } from '@/components/ink';
import { DotMatrix, PressableScale, Txt } from '@/components/ui';
import { ROLES } from '@/lib/create-character';
import { fonts, space } from '@/theme';
import { ink, inkFace, inkGutter } from '@/theme/ink';
import type { CharacterRole } from '@/types';

import { Card, Chip, ChipGroup, SmallRound } from './kit';

/**
 * Quick create's parts of the create screen (Ink Night+ & Apple HIG): editorial serif prompt,
 * hairline-rimmed idea + sparks cards, and the signature green breathing `DotMatrix` writing wait.
 * `Pill` stays exported for the other forms (`personas/edit`, `lore/entry`, `streams/new`).
 */

/** One choice as a dark-glass Ink Night+ capsule, crisp white when chosen (personas, lore, streams). */
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
    onSparks(
      sparks.includes(spark)
        ? sparks.filter((s) => s !== spark)
        : sparks.length < SPARKS_MAX
          ? [...sparks, spark]
          : sparks,
    );

  return (
    <>
      <InkText variant="title" accessibilityRole="header" style={styles.ask}>
        {t('createCharacter.quick.ask')}
      </InkText>

      <Card problem={problem}>
        <TextInput
          value={idea}
          onChangeText={onIdea}
          placeholder={t('createCharacter.quick.ideaPlaceholder')}
          placeholderTextColor={ink.placeholder}
          selectionColor={ink.accent}
          style={styles.idea}
          maxLength={IDEA_MAX}
          multiline
          textAlignVertical="top"
          accessibilityLabel={t('createCharacter.quick.idea')}
        />
        <Txt style={styles.count}>{`${idea.length} / ${IDEA_MAX}`}</Txt>
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
            <Ionicons name="document-text" size={18} color={ink.accent} />
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
const FIELD = 210;

/**
 * A model at work, the Ink way: a rounded square of dots breathing in waves (`DotMatrix`, one
 * shader draw a frame), the title in serif italic, and steps ticking off over `ms`.
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
          <Ionicons name="checkmark" size={20} color={WAIT_DOTS} />
        </Animated.View>
      ) : (
        <View style={state === 'now' ? styles.markNow : styles.markLater} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  ask: { marginTop: 4, marginHorizontal: inkGutter },
  idea: { ...inkFace('body'), fontSize: 15.5, lineHeight: 22, minHeight: 108, color: ink.text },
  count: { ...inkFace('caption'), fontWeight: '400', textAlign: 'right', color: ink.text3, fontVariant: ['tabular-nums'], marginTop: 6 },
  continueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  continueIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(235,173,132,0.14)',
  },
  continueText: { ...inkFace('subStrong'), fontSize: 15.5, color: ink.text },
  continueButtons: { flexDirection: 'row', gap: space.sm, marginTop: 14 },
  smallButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  smallOn: { backgroundColor: ink.accent, borderColor: ink.accent },
  smallText: { ...inkFace('footnoteStrong'), fontSize: 14, color: ink.text },
  smallTextOn: { color: ink.onAccent },
  // The writing wait, centred in the page.
  wait: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, paddingBottom: space.huge },
  waitTitle: { marginTop: 22, fontFamily: fonts.serifItalic, fontSize: 28, lineHeight: 36, letterSpacing: -0.3, color: WAIT_DOTS, textAlign: 'center' },
  steps: { marginTop: space.lg, gap: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 38 },
  stepText: { ...inkFace('body'), fontSize: 15.5, color: ink.text3 },
  stepNow: { fontWeight: '600', color: ink.text },
  mark: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  markNow: { width: 10, height: 10, borderRadius: 5, backgroundColor: WAIT_DOTS },
  markLater: { width: 15, height: 15, borderRadius: 7.5, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)' },
});
