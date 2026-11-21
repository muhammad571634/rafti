import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INK_DOCK_SPACE, InkDock, InkIconButton, InkNavBar, InkText, PillButton } from '@/components/ink';
import { Anim, CharacterAvatar, MODULE_GLYPH, PressableScale, Screen, SFIcon, SymbolTile, UserAvatar, useScrolledPast } from '@/components/ui';
import { phrase } from '@/i18n';
import { shortName } from '@/lib/format';
import type { QuizItem, QuizPick } from '@/ai/writes';
import { lineFor, partnerPick, pickSome, QUIZ_MAX_QUESTIONS, weekKey } from '@/lib/quiz';
import { QUIZ_LINES, QUIZ_PACKS, SELF_QUIZ } from '@/mock/games';
import { localized } from '@/i18n/content';
import { WORLDS } from '@/mock/worlds';
import { askSelfQuiz, displayName, modelIsOn, useAppStore, writeBase, writeWithModel } from '@/store/use-app-store';
import { colors, friendAccent, hitSlop, moduleFills, space, systemColors } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

/** One play: a pack, the friend's weekly quiz about themselves, or a quiz the user wrote. */
interface Run {
  id: string;
  title: string;
  questions: QuizItem[];
  /** Their answers and lines, one a question, when the model plays. */
  picks?: QuizPick[];
}

/** What the model is asked for: a quiz of questions already there, or this week's own (no `questions`). */
interface Asked {
  id: string;
  title: string;
  questions?: QuizItem[];
}

const NEW_PACKS = ['qp_late_night', 'qp_habits'];
/** Quizzes wear indigo, as in the chat "+" menu and Us moments. */
const QUIZ_FILL = systemColors.indigo;

/**
 * Couple quiz (F29), in Ink (0z325). Home: the friend's own quiz (5 questions about themselves, new
 * each week) as the one featured card, their world's quiz that wins a Photo Booth frame, the packs
 * and the quizzes the user wrote, as grouped cards. In play the friend's pick shows the moment you
 * answer, with a line in their world's voice; the score goes to the chat as a card and they react.
 */
export default function QuizScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const { scrolled, onScroll } = useScrolledPast(44);

  const user = useAppStore((s) => s.user);
  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const conversation = useAppStore((s) => s.conversations.find((c) => c.characterId === characterId));
  const userQuizzes = useAppStore((s) => s.userQuizzes);
  const wonFrames = useAppStore((s) => s.wonFrames);
  const finishQuiz = useAppStore((s) => s.finishQuiz);

  const [run, setRun] = useState<Run | null>(null);
  const [index, setIndex] = useState(0);
  const [mine, setMine] = useState<number | null>(null);
  const [matches, setMatches] = useState(0);
  const [done, setDone] = useState(false);
  const [asked, setAsked] = useState<Asked | null>(null);
  const [busy, setBusy] = useState(false);
  // Left the wait before the answer came: it must not start a quiz behind the user's back.
  const asking = useRef(0);

  const worlds = localized('worlds', WORLDS);
  const world = character ? worlds.find((w) => w.series === character.series) : undefined;
  const week = useMemo(() => weekKey(new Date()), []);

  if (!character) {
    return (
      <Screen background={ink.ground}>
        <InkNavBar backLabel={t('common.back')} onBack={() => router.back()} />
        <InkText variant="display" style={styles.title}>
          {t('games.quiz')}
        </InkText>
      </Screen>
    );
  }

  const name = shortName(displayName(character, relationship));
  const backToChat = () => (conversation ? router.replace(`/chat/${conversation.id}`) : router.back());
  const host = (
    <View style={styles.hostRing}>
      <CharacterAvatar character={character} size={36} />
    </View>
  );
  const start = (next: Run) => {
    setAsked(null);
    setRun(next);
    setIndex(0);
    setMine(null);
    setMatches(0);
    setDone(false);
  };

  /** With the model on, it plays their side; with it off, the question list and stock lines do. */
  const ask = async (next: Asked) => {
    const ticket = ++asking.current;
    setAsked(next);
    setBusy(false);
    let run: Run | null = null;
    if (next.questions) {
      const base = writeBase(character.id, true);
      const written = base && (await writeWithModel({ ...base, kind: 'quizPicks', title: next.title, questions: next.questions }));
      if (written) run = { id: next.id, title: next.title, questions: next.questions, picks: written.picks };
    } else {
      const questions = await askSelfQuiz(character.id, week);
      if (questions) run = { id: next.id, title: next.title, questions, picks: questions };
    }
    if (ticket !== asking.current) return;
    if (run) start(run);
    else setBusy(true);
  };
  const leaveAsking = () => {
    asking.current += 1;
    setAsked(null);
  };

  if (asked) {
    return (
      <Screen background={ink.ground}>
        <InkNavBar backLabel={t('common.back')} onBack={leaveAsking} />
        <View style={styles.asking}>
          <CharacterAvatar character={character} size={80} />
          {busy ? (
            <>
              <InkText variant="body" color={ink.text2} center>
                {t('games.busy', { name })}
              </InkText>
              <PillButton label={t('common.retry')} kind="secondary" size="md" full={false} onPress={() => void ask(asked)} />
            </>
          ) : (
            <>
              <Anim name="typing" size={32} tint={ink.accent} />
              <InkText variant="body" color={ink.text2} center>
                {t('common.thinking')}
              </InkText>
            </>
          )}
        </View>
      </Screen>
    );
  }

  const play = (next: Run) => (modelIsOn() ? void ask(next) : start(next));

  // 1. Home: their quiz, their world's quiz, packs, yours.
  if (!run) {
    const selfRun: Run = {
      id: `self:${week}`,
      title: t('quizHome.selfRun', { name }),
      questions: pickSome(world?.selfQuiz ?? localized('selfQuiz', SELF_QUIZ), `${character.id}:${week}`, QUIZ_MAX_QUESTIONS),
    };
    const won = world ? wonFrames.includes(world.key) : false;
    return (
      <Screen background={ink.ground}>
        <InkNavBar backLabel={t('common.back')} onBack={() => router.back()} title={t('games.quiz')} scrolled={scrolled} right={host} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
          <InkText variant="display" style={styles.title}>
            {t('games.quiz')}
          </InkText>

          {/* Their quiz: the one featured card, the screen's main action. */}
          <PressableScale
            scaleTo={0.985}
            accessibilityRole="button"
            accessibilityLabel={t('quizHome.selfPlay', { name })}
            style={[styles.card, styles.selfCard]}
            onPress={() => (modelIsOn() ? void ask({ id: selfRun.id, title: selfRun.title }) : start(selfRun))}>
            {/* The friend's own accent, dimmed (HIG Dark Mode). */}
            <View style={[styles.selfHero, { backgroundColor: `${friendAccent(character.id).strong}4D` }]}>
              <CharacterAvatar character={character} size={64} ring ringColor={ink.card} />
              {world ? (
                <View style={styles.worldPill}>
                  <InkText variant="caption" color={ink.text}>
                    {phrase(world.series)}
                  </InkText>
                </View>
              ) : null}
            </View>
            <View style={styles.selfBody}>
              <InkText variant="card">{t('quizHome.selfTitle', { name })}</InkText>
              <InkText variant="sub">{t('quizHome.selfBody', { name, context: character?.gender })}</InkText>
              <View style={styles.cta}>
                <InkText variant="bodyStrong" color={ink.onAccent} lines={1}>
                  {t('quizHome.selfPlay', { name })}
                </InkText>
              </View>
            </View>
          </PressableScale>

          {world ? (
            <PressableScale
              scaleTo={0.985}
              accessibilityRole="button"
              accessibilityLabel={t('quizHome.worldWin', { world: phrase(world.series) })}
              style={[styles.card, styles.row, styles.worldRow]}
              onPress={() =>
                router.push({ pathname: '/quiz/world/[world]', params: { world: world.key, host: character.id } })
              }>
              <SymbolTile fill={moduleFills.photo} ios="photo.on.rectangle.angled" icon="images" />
              <View style={styles.flex}>
                <InkText variant="body" lines={2}>
                  {t('quizHome.worldWin', { world: phrase(world.series) })}
                </InkText>
                <InkText variant="footnote" color={won ? colors.bondText : ink.text2} style={styles.rowHint}>
                  {won ? t('quizHome.worldWon') : t('quizHome.worldHost', { name })}
                </InkText>
              </View>
              <Ionicons name="chevron-forward" size={15} color={ink.text3} />
            </PressableScale>
          ) : null}

          <InkText variant="footnoteStrong" color={ink.text2} style={styles.section}>
            {t('quizHome.packs')}
          </InkText>
          <View style={styles.card}>
            {localized('quizPacks', QUIZ_PACKS).map((p, i, list) => (
              <PressableScale
                key={p.id}
                scaleTo={0.985}
                accessibilityRole="button"
                style={[styles.row, i < list.length - 1 && styles.rowLine]}
                onPress={() => play({ id: p.id, title: t(`games.packs.${p.titleKey}`), questions: p.questions })}>
                <SymbolTile {...p.look} />
                <View style={styles.flex}>
                  <InkText variant="body">{t(`games.packs.${p.titleKey}`)}</InkText>
                  <InkText variant="footnote" color={ink.text2} style={styles.rowHint}>
                    {t('games.questions', { count: p.questions.length })}
                  </InkText>
                </View>
                {NEW_PACKS.includes(p.id) ? (
                  <View style={styles.newPill}>
                    <InkText variant="caption" color={ink.accent}>
                      {t('quizHome.new')}
                    </InkText>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={15} color={ink.text3} />
              </PressableScale>
            ))}
          </View>

          <InkText variant="footnoteStrong" color={ink.text2} style={styles.section}>
            {t('quizHome.yours')}
          </InkText>
          <View style={styles.card}>
            {/* iOS "add" row: the accent's plus and words, as Reminders' "Add List". */}
            <PressableScale
              scaleTo={0.985}
              accessibilityRole="button"
              style={[styles.row, userQuizzes.length > 0 && styles.rowLine]}
              onPress={() => router.push('/quiz/write')}>
              <SFIcon ios="plus.circle.fill" icon="add-circle" size={30} color={ink.accent} />
              <InkText variant="body" color={ink.accent} style={styles.flex}>
                {t('quizHome.write')}
              </InkText>
            </PressableScale>
            {userQuizzes.map((q, i) => (
              <View key={q.id} style={[styles.row, i < userQuizzes.length - 1 && styles.rowLine]}>
                <PressableScale
                  scaleTo={0.985}
                  accessibilityRole="button"
                  accessibilityLabel={q.title}
                  style={styles.rowOpen}
                  onPress={() => play({ id: q.id, title: q.title, questions: q.questions })}>
                  <SymbolTile fill={QUIZ_FILL} ios="questionmark" icon="help" />
                  <View style={styles.flex}>
                    <InkText variant="body" lines={1}>
                      {q.title}
                    </InkText>
                    <InkText variant="footnote" color={ink.text2} style={styles.rowHint}>
                      {t('quizHome.mineMeta', { count: q.questions.length })}
                    </InkText>
                  </View>
                </PressableScale>
                <PressableScale
                  hitSlop={hitSlop}
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={t('quizHome.edit', { title: q.title })}
                  onPress={() => router.push({ pathname: '/quiz/write', params: { id: q.id } })}>
                  <SFIcon ios="pencil" icon="create-outline" size={20} color={ink.text2} />
                </PressableScale>
              </View>
            ))}
          </View>
          <InkText variant="footnote" color={ink.text2} style={styles.footnote}>
            {t('quizHome.only')}
          </InkText>
        </ScrollView>
      </Screen>
    );
  }

  const total = run.questions.length;

  // 3. The score.
  if (done) {
    return (
      <Screen background={ink.ground}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: INK_DOCK_SPACE + insets.bottom }}>
          <View style={[styles.result, styles.resultTop]}>
            <View style={styles.pair}>
              <UserAvatar user={user} size={80} />
              <CharacterAvatar character={character} size={80} ring ringColor={ink.card} style={styles.overlap} />
            </View>
            <View style={styles.score} accessible accessibilityLabel={`${matches} / ${total}`}>
              <SFIcon ios={MODULE_GLYPH.bond.ios} icon={MODULE_GLYPH.bond.icon} size={36} color={moduleFills.bond} />
              <InkText variant="numeralMid">
                {matches}/{total}
              </InkText>
            </View>
            <InkText variant="title" center accessibilityRole="header">
              {run.title}
            </InkText>
          </View>
        </ScrollView>
        <InkDock>
          <PillButton label={t('games.backToChat', { name })} onPress={backToChat} />
        </InkDock>
      </Screen>
    );
  }

  // 2. A question.
  const question = run.questions[index];
  const modelPick = run.picks?.[index];
  const theirs = modelPick ? modelPick.answer : partnerPick(character.id, run.id, index, question.options.length);
  const last = index === total - 1;
  const lines = world ?? localized('quizLines', QUIZ_LINES);
  const seed = `${character.id}:${run.id}:${index}`;
  const same = mine != null && mine === theirs;
  const stockLine = () => (same ? lineFor(lines.match, seed) : lineFor(lines.differ, seed, question.options[theirs]));
  const line = mine == null ? '' : modelPick ? (same ? modelPick.same : modelPick.differ) : stockLine();

  const answer = (option: number) => {
    if (mine != null) return;
    setMine(option);
    if (option === theirs) setMatches((m) => m + 1);
  };

  const next = () => {
    if (!last) {
      setIndex((i) => i + 1);
      setMine(null);
      return;
    }
    finishQuiz(character.id, run.id, matches, total, run.title);
    setDone(true);
  };

  return (
    <Screen background={ink.ground}>
      <View style={styles.playBar}>
        <InkIconButton icon="close" size={22} accessibilityLabel={t('common.close')} onPress={() => setRun(null)} />
        <View style={styles.dots} accessible accessibilityLabel={`${index + 1} / ${total}`}>
          {run.questions.map((_, i) => (
            <View key={i} style={[styles.dot, i <= index && styles.dotOn]} />
          ))}
        </View>
        {host}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: mine != null ? INK_DOCK_SPACE + insets.bottom : insets.bottom + space.xl }}>
        <InkText variant="caption" color={ink.text2} style={styles.progress}>
          {t('games.progress', { title: run.title, n: index + 1, total })}
        </InkText>
        <InkText variant="title" accessibilityRole="header" style={styles.question}>
          {question.text}
        </InkText>

        <View style={styles.options}>
          {question.options.map((text, option) => (
            <Option
              key={option}
              text={text}
              mine={mine === option}
              theirs={mine != null && theirs === option}
              answered={mine != null}
              character={character}
              onPress={() => answer(option)}
            />
          ))}
        </View>

        {mine != null ? (
          // Their line, in their world's voice (the server's model writes it from the persona).
          <View style={styles.says} accessibilityLiveRegion="polite">
            <CharacterAvatar character={character} size={32} />
            <View style={styles.bubble}>
              <InkText variant="caption" color={same ? colors.bondText : ink.text2}>
                {same ? t('games.same', { count: matches, n: index + 1 }) : t('games.differ', { name })}
              </InkText>
              <InkText variant="body">{line}</InkText>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {mine != null ? (
        <InkDock>
          <PillButton label={last ? t('games.seeScore') : t('date.next')} onPress={next} />
        </InkDock>
      ) : null}
    </Screen>
  );
}

/**
 * One answer as a card. Yours takes a white border and a "You" tag, theirs their face; when both
 * picked it, the border is the bond's mint.
 */
function Option({
  text,
  mine,
  theirs,
  answered,
  character,
  onPress,
}: {
  text: string;
  mine: boolean;
  theirs: boolean;
  answered: boolean;
  character: Character;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <PressableScale
      // No `disabled`: it would fade the answers too; `answer` ignores taps after the first.
      scaleTo={answered ? 1 : 0.97}
      accessibilityRole="button"
      accessibilityState={{ selected: mine, disabled: answered }}
      style={[styles.option, mine && theirs ? styles.both : mine ? styles.mine : null]}
      onPress={onPress}>
      <InkText variant="bodyStrong" style={[styles.flex, answered && !mine && !theirs && styles.dim]}>
        {text}
      </InkText>
      {mine ? (
        <View style={styles.youTag}>
          <InkText variant="caption" color={ink.onPill}>
            {t('games.you')}
          </InkText>
        </View>
      ) : null}
      {theirs ? <CharacterAvatar character={character} size={28} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { marginTop: 2, marginHorizontal: inkGutter },
  playBar: { minHeight: 56, paddingHorizontal: inkGutter, paddingTop: 4, flexDirection: 'row', alignItems: 'center', gap: space.md },
  hostRing: { padding: 2, borderRadius: 20, backgroundColor: ink.hairlineFill },
  card: {
    marginHorizontal: inkGutter,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  selfCard: { marginTop: 20 },
  selfHero: { height: 116, flexDirection: 'row', alignItems: 'flex-end', padding: 14 },
  worldPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.card,
    justifyContent: 'center',
  },
  selfBody: { padding: space.lg, paddingTop: 14, gap: 4 },
  cta: { marginTop: 12, height: 50, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: ink.accent },
  worldRow: { marginTop: space.md },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg, paddingVertical: 8 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.line },
  rowOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowHint: { marginTop: 1 },
  section: { paddingHorizontal: inkGutter + 6, paddingTop: 20, paddingBottom: 8 },
  newPill: { height: 24, paddingHorizontal: 9, borderRadius: inkRadius.pill, justifyContent: 'center', backgroundColor: ink.raised },
  footnote: { marginTop: 8, marginHorizontal: inkGutter + 6 },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { flex: 1, maxWidth: 34, height: 6, borderRadius: inkRadius.pill, backgroundColor: ink.hairlineFill },
  dotOn: { backgroundColor: ink.accent },
  progress: { marginTop: space.md, marginHorizontal: inkGutter, textTransform: 'uppercase' },
  question: { marginTop: 6, marginHorizontal: inkGutter },
  options: { gap: 10, marginTop: space.xl, marginHorizontal: inkGutter },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 58,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderRadius: inkRadius.row,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: ink.edge,
    backgroundColor: ink.card,
  },
  mine: { borderColor: ink.text },
  both: { borderColor: colors.bond },
  dim: { opacity: 0.4 },
  youTag: { height: 24, paddingHorizontal: 9, borderRadius: inkRadius.pill, justifyContent: 'center', backgroundColor: ink.pill },
  says: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginHorizontal: inkGutter, marginTop: space.lg },
  bubble: {
    flexShrink: 1,
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    backgroundColor: ink.card,
  },
  asking: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.xl, paddingBottom: space.huge },
  result: { alignItems: 'center', gap: space.md, paddingHorizontal: space.xl },
  resultTop: { paddingTop: space.huge },
  pair: { flexDirection: 'row' },
  overlap: { marginLeft: -space.lg },
  score: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
});
