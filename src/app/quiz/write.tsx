import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HELPLINE_URL } from '@/ai/safety';
import { BUY_BAR_SPACE, GroupLabel, StoreBuyBar } from '@/components/plans/store-look';
import { GlassBar, GlassButton, InsetGroup, LargeTitle, PressableScale, Screen, Txt, useScrolledPast } from '@/components/ui';
import {
  OPTION_MAX,
  OPTIONS_MAX,
  QUESTION_MAX,
  QUIZ_MAX_QUESTIONS,
  QUIZ_TITLE_MAX,
  checkQuiz,
  cleanQuiz,
} from '@/lib/quiz';
import { useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, space, systemColors } from '@/theme';

type Draft = { text: string; options: string[] };
const blank = (): Draft => ({ text: '', options: ['', ''] });

/** Alert.alert is a no-op on web; fall back to the browser's confirm there (as in group info). */
function confirm(title: string, message: string, action: string, onConfirm: () => void, cancel: string) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * Write a quiz (F29, approved prototype): a name and up to 5 questions with 2 to 4 answers.
 * Free; any friend plays it and answers in their own way. `id` edits a saved quiz. An iOS form
 * on the grouped ground like Create character: each question is an inset group of answer rows.
 */
export default function WriteQuizScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = useAppStore((s) => s.userQuizzes.find((q) => q.id === id));
  const saveQuiz = useAppStore((s) => s.saveQuiz);
  const deleteQuiz = useAppStore((s) => s.deleteQuiz);

  const [title, setTitle] = useState(editing?.title ?? '');
  const [questions, setQuestions] = useState<Draft[]>(
    editing ? editing.questions.map((q) => ({ text: q.text, options: [...q.options] })) : [blank()],
  );
  const [crisis, setCrisis] = useState(false);
  const { scrolled, onScroll } = useScrolledPast(40);

  const draft = { title, questions };
  const problem = checkQuiz(draft);
  const ready = cleanQuiz(draft).questions.length;

  const change = (fn: (list: Draft[]) => Draft[]) => {
    setCrisis(false);
    setQuestions(fn);
  };
  const setText = (i: number, text: string) => change((l) => l.map((q, j) => (j === i ? { ...q, text } : q)));
  const setOption = (i: number, o: number, text: string) =>
    change((l) => l.map((q, j) => (j === i ? { ...q, options: q.options.map((x, k) => (k === o ? text : x)) } : q)));
  const addOption = (i: number) =>
    change((l) =>
      l.map((q, j) => (j === i && q.options.length < OPTIONS_MAX ? { ...q, options: [...q.options, ''] } : q)),
    );
  const removeQuestion = (i: number) => change((l) => (l.length > 1 ? l.filter((_, j) => j !== i) : l));
  const addQuestion = () => change((l) => (l.length < QUIZ_MAX_QUESTIONS ? [...l, blank()] : l));

  const save = () => {
    const result = saveQuiz(draft, editing?.id);
    if (result.status === 'crisis') return setCrisis(true);
    if (result.status === 'saved') router.back();
  };

  const remove = () =>
    editing &&
    confirm(
      t('quizWrite.deleteTitle'),
      t('quizWrite.deleteBody'),
      t('quizWrite.delete'),
      () => {
        deleteQuiz(editing.id);
        router.back();
      },
      t('common.cancel'),
    );

  const label =
    problem === 'noTitle'
      ? t('quizWrite.needTitle')
      : problem === 'noQuestions'
        ? t('quizWrite.needQuestion')
        : t('quizWrite.save');
  const screenTitle = editing ? t('quizWrite.titleEdit') : t('quizWrite.titleNew');

  return (
    <Screen background={colors.bg}>
      <GlassBar
        title={screenTitle}
        scrolled={scrolled}
        right={editing ? <GlassButton icon="trash-outline" accessibilityLabel={t('quizWrite.delete')} onPress={remove} /> : undefined}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: BUY_BAR_SPACE + insets.bottom }}
          keyboardShouldPersistTaps="handled">
          <LargeTitle>{screenTitle}</LargeTitle>

          <GroupLabel>{t('quizWrite.name')}</GroupLabel>
          <InsetGroup>
            <TextInput
              value={title}
              onChangeText={(text) => {
                setCrisis(false);
                setTitle(text);
              }}
              placeholder={t('quizWrite.namePlaceholder')}
              placeholderTextColor={colors.textFaint}
              accessibilityLabel={t('quizWrite.name')}
              maxLength={QUIZ_TITLE_MAX}
              style={styles.nameInput}
            />
          </InsetGroup>

          <GroupLabel>
            {`${t('quizWrite.questions')} · ${t('quizWrite.count', { count: questions.length, max: QUIZ_MAX_QUESTIONS })}`}
          </GroupLabel>
          {questions.map((q, i) => (
            <InsetGroup key={i} style={i > 0 && styles.groupGap}>
              <View style={[styles.qHead, styles.line]}>
                <View style={styles.flex}>
                  <Txt style={styles.qLabel}>{t('quizWrite.question', { n: i + 1 })}</Txt>
                  <TextInput
                    value={q.text}
                    onChangeText={(text) => setText(i, text)}
                    placeholder={t('quizWrite.questionPlaceholder')}
                    placeholderTextColor={colors.textFaint}
                    accessibilityLabel={t('quizWrite.question', { n: i + 1 })}
                    maxLength={QUESTION_MAX}
                    multiline
                    style={styles.qInput}
                  />
                </View>
                {questions.length > 1 ? (
                  // iOS's red minus, as in Contacts' edit mode.
                  <PressableScale
                    onPress={() => removeQuestion(i)}
                    hitSlop={hitSlop}
                    scaleTo={0.88}
                    accessibilityRole="button"
                    accessibilityLabel={t('quizWrite.removeQuestion', { n: i + 1 })}>
                    <Ionicons name="remove-circle" size={24} color={systemColors.red} />
                  </PressableScale>
                ) : null}
              </View>
              {q.options.map((o, k) => (
                <View key={k} style={styles.answer}>
                  <View style={styles.letter}>
                    <Txt style={styles.letterText}>{String.fromCharCode(65 + k)}</Txt>
                  </View>
                  <View style={[styles.answerBody, (k < q.options.length - 1 || q.options.length < OPTIONS_MAX) && styles.line]}>
                    <TextInput
                      value={o}
                      onChangeText={(text) => setOption(i, k, text)}
                      placeholder={t('quizWrite.answer', { n: k + 1 })}
                      placeholderTextColor={colors.textFaint}
                      accessibilityLabel={`${t('quizWrite.question', { n: i + 1 })}, ${t('quizWrite.answer', { n: k + 1 })}`}
                      maxLength={OPTION_MAX}
                      style={styles.answerInput}
                    />
                  </View>
                </View>
              ))}
              {q.options.length < OPTIONS_MAX ? (
                <AddRow
                  label={t('quizWrite.addAnswer')}
                  accessibilityLabel={`${t('quizWrite.question', { n: i + 1 })}, ${t('quizWrite.addAnswer')}`}
                  onPress={() => addOption(i)}
                />
              ) : null}
            </InsetGroup>
          ))}
          {questions.length < QUIZ_MAX_QUESTIONS ? (
            <InsetGroup style={styles.groupGap}>
              <AddRow label={t('quizWrite.addQuestion')} onPress={addQuestion} />
            </InsetGroup>
          ) : null}
          <Txt style={styles.footer}>{t('quizWrite.hint')}</Txt>

          {crisis ? (
            <InsetGroup style={[styles.groupGap, styles.crisis]}>
              <View accessibilityLiveRegion="polite" style={styles.crisisText}>
                <Txt style={styles.crisisTitle}>{t('quizWrite.crisisTitle')}</Txt>
                <Txt style={styles.crisisBody}>{t('quizWrite.crisisBody')}</Txt>
              </View>
              <PressableScale
                scaleTo={0.96}
                accessibilityRole="link"
                onPress={() => void Linking.openURL(HELPLINE_URL)}
                style={styles.helpline}>
                <Txt style={styles.helplineText}>{t('safety.helplineAction')}</Txt>
              </PressableScale>
            </InsetGroup>
          ) : null}
        </ScrollView>

        {/* The Store's bar: the one button and the line on what it costs (nothing). */}
        <StoreBuyBar
          label={label}
          disabled={!ready || problem === 'noTitle' || crisis}
          caption={t('quizWrite.saveHint')}
          onPress={save}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** iOS's "add" row: a green plus and the action in the tint. */
function AddRow({ label, accessibilityLabel, onPress }: { label: string; accessibilityLabel?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
      <Ionicons name="add-circle" size={24} color={systemColors.green} />
      <Txt style={styles.addText}>{label}</Txt>
    </Pressable>
  );
}

const LETTER = 26;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfaceAlt },
  groupGap: { marginTop: space.md },
  nameInput: { minHeight: 50, paddingHorizontal: space.lg, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  qHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginLeft: space.lg,
    paddingRight: space.lg,
    paddingTop: 12,
    paddingBottom: 8,
  },
  qLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  qInput: { minHeight: 28, paddingTop: 2, fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  answer: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  letter: {
    width: LETTER,
    height: LETTER,
    borderRadius: LETTER / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: systemColors.fill,
  },
  letterText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  answerBody: { flex: 1, paddingRight: space.lg },
  answerInput: { minHeight: 46, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  add: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  addText: { fontSize: 17, letterSpacing: -0.4, color: colors.brandText },
  footer: { marginTop: space.sm, marginHorizontal: space.lg * 2, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  crisis: { padding: space.lg, gap: space.md, alignItems: 'flex-start' },
  crisisText: { gap: 4 },
  crisisTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  crisisBody: { fontSize: 15, lineHeight: 20, color: colors.textSecondary },
  helpline: { height: 36, paddingHorizontal: 16, borderRadius: 18, justifyContent: 'center', backgroundColor: systemColors.fill },
  helplineText: { fontSize: 15, fontWeight: '600', color: colors.brandText },
});
