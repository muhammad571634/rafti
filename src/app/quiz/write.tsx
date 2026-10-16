import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HELPLINE_URL } from '@/ai/safety';
import { Button, Header, PressableScale, Screen, Txt } from '@/components/ui';
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
import { colors, hitSlop, radius, space, type } from '@/theme';

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
 * Free; any friend plays it and answers in their own way. `id` edits a saved quiz.
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

  return (
    <Screen background={colors.bgPlain}>
      <Header
        title={editing ? t('quizWrite.titleEdit') : t('quizWrite.titleNew')}
        right={
          editing ? (
            <PressableScale
              onPress={remove}
              hitSlop={hitSlop}
              scaleTo={0.88}
              accessibilityRole="button"
              accessibilityLabel={t('quizWrite.delete')}>
              <Ionicons name="trash-outline" size={22} color={colors.text} />
            </PressableScale>
          ) : undefined
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Txt variant="h3">{t('quizWrite.name')}</Txt>
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
              style={styles.input}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.titleRow}>
              <Txt variant="h3" style={styles.flex}>
                {t('quizWrite.questions')}
              </Txt>
              <Txt variant="small" color={colors.textSecondary}>
                {t('quizWrite.count', { count: questions.length, max: QUIZ_MAX_QUESTIONS })}
              </Txt>
            </View>
            {questions.map((q, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.titleRow}>
                  <Txt variant="caption" color={colors.textSecondary} style={[styles.flex, styles.bold]}>
                    {t('quizWrite.question', { n: i + 1 })}
                  </Txt>
                  {questions.length > 1 ? (
                    <PressableScale
                      onPress={() => removeQuestion(i)}
                      hitSlop={hitSlop}
                      scaleTo={0.88}
                      accessibilityRole="button"
                      accessibilityLabel={t('quizWrite.removeQuestion', { n: i + 1 })}>
                      <Ionicons name="close" size={18} color={colors.textFaint} />
                    </PressableScale>
                  ) : null}
                </View>
                <TextInput
                  value={q.text}
                  onChangeText={(text) => setText(i, text)}
                  placeholder={t('quizWrite.questionPlaceholder')}
                  placeholderTextColor={colors.textFaint}
                  accessibilityLabel={t('quizWrite.question', { n: i + 1 })}
                  maxLength={QUESTION_MAX}
                  style={styles.question}
                />
                <View style={styles.grid}>
                  {q.options.map((o, k) => (
                    <TextInput
                      key={k}
                      value={o}
                      onChangeText={(text) => setOption(i, k, text)}
                      placeholder={t('quizWrite.answer', { n: k + 1 })}
                      placeholderTextColor={colors.textFaint}
                      accessibilityLabel={`${t('quizWrite.question', { n: i + 1 })}, ${t('quizWrite.answer', { n: k + 1 })}`}
                      maxLength={OPTION_MAX}
                      style={[styles.optionBox, styles.option]}
                    />
                  ))}
                  {q.options.length < OPTIONS_MAX ? (
                    <PressableScale
                      onPress={() => addOption(i)}
                      scaleTo={0.96}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('quizWrite.question', { n: i + 1 })}, ${t('quizWrite.addAnswer')}`}
                      style={[styles.optionBox, styles.addOption]}>
                      <Ionicons name="add" size={18} color={colors.text} />
                      <Txt variant="smallStrong">{t('quizWrite.addAnswer')}</Txt>
                    </PressableScale>
                  ) : null}
                </View>
              </View>
            ))}
            {questions.length < QUIZ_MAX_QUESTIONS ? (
              <PressableScale
                onPress={addQuestion}
                scaleTo={0.98}
                accessibilityRole="button"
                style={styles.addQuestion}>
                <Ionicons name="add" size={20} color={colors.text} />
                <Txt variant="bodyStrong">{t('quizWrite.addQuestion')}</Txt>
              </PressableScale>
            ) : null}
            <Txt variant="small" color={colors.textSecondary}>
              {t('quizWrite.hint')}
            </Txt>
          </View>

          {crisis ? (
            <View style={styles.crisis} accessibilityLiveRegion="polite">
              <Txt variant="title">{t('quizWrite.crisisTitle')}</Txt>
              <Txt variant="small" color={colors.textSecondary}>
                {t('quizWrite.crisisBody')}
              </Txt>
              <Button
                label={t('safety.helplineAction')}
                variant="secondary"
                size="sm"
                onPress={() => void Linking.openURL(HELPLINE_URL)}
              />
            </View>
          ) : null}
        </ScrollView>

        {/* Action bar (docs/design-style.md §3). */}
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          <Button label={label} size="lg" full disabled={!ready || problem === 'noTitle' || crisis} onPress={save} />
          <Txt variant="caption" color={colors.textSecondary} center>
            {t('quizWrite.saveHint')}
          </Txt>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xxl, gap: space.xl },
  section: { gap: space.sm + 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: {
    minHeight: 52,
    paddingHorizontal: space.md + 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    ...type.body,
  },
  card: {
    gap: space.sm + 2,
    padding: space.md + 2,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  question: { color: colors.text, ...type.title, paddingVertical: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  optionBox: {
    width: '48%',
    flexGrow: 1,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  option: { color: colors.text, ...type.small },
  addOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs },
  addQuestion: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  crisis: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'flex-start',
  },
  actionBar: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
