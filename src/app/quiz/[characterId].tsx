import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, CharacterAvatar, ClayIcon, Header, PressableScale, Screen, Txt, UserAvatar } from '@/components/ui';
import { shortName } from '@/lib/format';
import { lineFor, partnerPick, pickSome, QUIZ_MAX_QUESTIONS, weekKey } from '@/lib/quiz';
import { QUIZ_LINES, QUIZ_PACKS, SELF_QUIZ } from '@/mock/games';
import { worldOf } from '@/mock/worlds';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, radius, space } from '@/theme';
import type { Character } from '@/types';

/** One play: a pack, the friend's weekly quiz about themselves, or a quiz the user wrote. */
interface Run {
  id: string;
  title: string;
  questions: { text: string; options: readonly string[] }[];
}

const NEW_PACKS = ['qp_late_night', 'qp_habits'];

/**
 * Couple quiz (F29, approved prototype). Home: the friend's own quiz (5 questions about
 * themselves, new each week), their world's quiz that wins a Photo Booth frame, the packs and
 * the quizzes the user wrote. In play the friend's pick shows the moment you answer, with a line
 * in their world's voice; the score goes to the chat as a card and they react.
 */
export default function QuizScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { characterId } = useLocalSearchParams<{ characterId: string }>();

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

  const world = character ? worldOf(character) : undefined;
  const week = useMemo(() => weekKey(new Date()), []);

  if (!character) {
    return (
      <Screen>
        <Header title={t('games.quiz')} />
      </Screen>
    );
  }

  const name = shortName(displayName(character, relationship));
  const backToChat = () => (conversation ? router.replace(`/chat/${conversation.id}`) : router.back());
  const start = (next: Run) => {
    setRun(next);
    setIndex(0);
    setMine(null);
    setMatches(0);
    setDone(false);
  };

  // 1. Home: their quiz, their world's quiz, packs, yours.
  if (!run) {
    const selfRun: Run = {
      id: `self:${week}`,
      title: t('quizHome.selfRun', { name }),
      questions: pickSome(world?.selfQuiz ?? SELF_QUIZ, `${character.id}:${week}`, QUIZ_MAX_QUESTIONS),
    };
    const won = world ? wonFrames.includes(world.key) : false;
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('games.quiz')} right={<CharacterAvatar character={character} size={32} />} />
        <ScrollView contentContainerStyle={[styles.home, { paddingBottom: insets.bottom + space.xl }]}>
          <PressableScale
            scaleTo={0.985}
            accessibilityRole="button"
            accessibilityLabel={t('quizHome.selfPlay', { name })}
            style={styles.selfCard}
            onPress={() => start(selfRun)}>
            <View style={[styles.selfHero, { backgroundColor: world?.tint ?? colors.surfaceAlt }]}>
              <CharacterAvatar character={character} size={64} ring ringColor={colors.surface} />
              {world ? (
                <View style={styles.worldPill}>
                  <Txt variant="caption" style={styles.bold}>
                    {world.series}
                  </Txt>
                </View>
              ) : null}
              <ClayIcon name="quiz" size={52} tile={false} style={styles.selfArt} />
            </View>
            <View style={styles.selfBody}>
              <Txt variant="h3">{t('quizHome.selfTitle', { name })}</Txt>
              <Txt variant="small" color={colors.textSecondary}>
                {t('quizHome.selfBody', { name })}
              </Txt>
              <View style={styles.selfButton}>
                <Txt variant="bodyStrong" color={colors.textOnPrimary}>
                  {t('quizHome.selfPlay', { name })}
                </Txt>
              </View>
            </View>
          </PressableScale>

          {world ? (
            <PressableScale
              scaleTo={0.985}
              accessibilityRole="button"
              accessibilityLabel={t('quizHome.worldWin', { world: world.series })}
              style={styles.row}
              onPress={() =>
                router.push({ pathname: '/quiz/world/[world]', params: { world: world.key, host: character.id } })
              }>
              <View style={[styles.tile, { backgroundColor: world.tint }]}>
                <ClayIcon name="polaroids" size={32} tile={false} />
              </View>
              <View style={styles.grow}>
                <Txt variant="title">{t('quizHome.worldWin', { world: world.series })}</Txt>
                <Txt variant="small" color={won ? colors.bondText : colors.textSecondary}>
                  {won ? t('quizHome.worldWon') : t('quizHome.worldHost', { name })}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </PressableScale>
          ) : null}

          <View style={styles.section}>
            <Txt variant="h3">{t('quizHome.packs')}</Txt>
            {QUIZ_PACKS.map((p) => (
              <PressableScale
                key={p.id}
                scaleTo={0.985}
                accessibilityRole="button"
                style={styles.row}
                onPress={() => start({ id: p.id, title: t(`games.packs.${p.titleKey}`), questions: p.questions })}>
                <View style={styles.tile}>
                  <ClayIcon name={p.icon} size={32} tile={false} />
                </View>
                <View style={styles.grow}>
                  <Txt variant="title">{t(`games.packs.${p.titleKey}`)}</Txt>
                  <Txt variant="small" color={colors.textSecondary}>
                    {t('games.questions', { count: p.questions.length })}
                  </Txt>
                </View>
                {NEW_PACKS.includes(p.id) ? (
                  <View style={styles.newPill}>
                    <Txt variant="caption" color={colors.brandText} style={styles.bold}>
                      {t('quizHome.new')}
                    </Txt>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </PressableScale>
            ))}
          </View>

          <View style={styles.section}>
            <Txt variant="h3">{t('quizHome.yours')}</Txt>
            <View style={styles.box}>
              <PressableScale
                scaleTo={0.985}
                accessibilityRole="button"
                style={styles.boxRow}
                onPress={() => router.push('/quiz/write')}>
                <View style={styles.boxTile}>
                  <Ionicons name="add" size={22} color={colors.text} />
                </View>
                <Txt variant="title" style={styles.grow}>
                  {t('quizHome.write')}
                </Txt>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </PressableScale>
              {userQuizzes.map((q) => (
                <View key={q.id} style={[styles.boxRow, styles.boxDivider]}>
                  <PressableScale
                    scaleTo={0.985}
                    accessibilityRole="button"
                    accessibilityLabel={q.title}
                    style={styles.boxOpen}
                    onPress={() => start({ id: q.id, title: q.title, questions: q.questions })}>
                    <View style={styles.boxTile}>
                      <ClayIcon name="quiz" size={28} tile={false} />
                    </View>
                    <View style={styles.grow}>
                      <Txt variant="title" lines={1}>
                        {q.title}
                      </Txt>
                      <Txt variant="small" color={colors.textSecondary}>
                        {t('quizHome.mineMeta', { count: q.questions.length })}
                      </Txt>
                    </View>
                  </PressableScale>
                  <PressableScale
                    hitSlop={hitSlop}
                    scaleTo={0.9}
                    accessibilityRole="button"
                    accessibilityLabel={t('quizHome.edit', { title: q.title })}
                    onPress={() => router.push({ pathname: '/quiz/write', params: { id: q.id } })}>
                    <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                  </PressableScale>
                </View>
              ))}
            </View>
            <Txt variant="caption" color={colors.textSecondary} center>
              {t('quizHome.only')}
            </Txt>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  const total = run.questions.length;

  // 3. The score.
  if (done) {
    return (
      <Screen background={colors.bgPlain}>
        <View style={[styles.result, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.pair}>
            <UserAvatar user={user} size={72} />
            <CharacterAvatar character={character} size={72} ring ringColor={colors.bgPlain} style={styles.overlap} />
          </View>
          <View style={styles.score}>
            <ClayIcon name="trophy" size={52} tile={false} />
            <Txt variant="heroFigure">
              {matches}/{total}
            </Txt>
          </View>
          <Txt variant="h2" center>
            {run.title}
          </Txt>
          <View style={styles.grow} />
          <Button label={t('games.backToChat', { name })} size="lg" full onPress={backToChat} />
        </View>
      </Screen>
    );
  }

  // 2. A question.
  const question = run.questions[index];
  const theirs = partnerPick(character.id, run.id, index, question.options.length);
  const last = index === total - 1;
  const lines = world ?? QUIZ_LINES;
  const seed = `${character.id}:${run.id}:${index}`;
  const line =
    mine == null
      ? ''
      : mine === theirs
        ? lineFor(lines.match, seed)
        : lineFor(lines.differ, seed, question.options[theirs]);

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
    <Screen background={colors.bgPlain}>
      <View style={styles.top}>
        <PressableScale
          style={styles.close}
          hitSlop={hitSlop}
          scaleTo={0.9}
          accessibilityLabel={t('common.close')}
          onPress={() => setRun(null)}>
          <Ionicons name="close" size={22} color={colors.text} />
        </PressableScale>
        <View style={styles.dots}>
          {run.questions.map((_, i) => (
            <View key={i} style={[styles.dot, i <= index && styles.dotOn]} />
          ))}
        </View>
        <CharacterAvatar character={character} size={36} />
      </View>

      <ScrollView contentContainerStyle={[styles.play, { paddingBottom: insets.bottom + space.lg }]}>
        <Txt variant="smallStrong" color={colors.textMuted}>
          {t('games.progress', { title: run.title, n: index + 1, total })}
        </Txt>
        <Txt variant="h1">{question.text}</Txt>

        <View style={styles.options}>
          {question.options.map((text, option) => (
            <Option
              key={option}
              text={text}
              mine={mine === option}
              theirs={mine != null && theirs === option}
              disabled={mine != null}
              character={character}
              onPress={() => answer(option)}
            />
          ))}
        </View>

        {mine != null ? (
          <>
            <View style={[styles.verdict, mine === theirs ? styles.same : styles.differ]}>
              <Txt variant="bodyStrong" center color={mine === theirs ? colors.bondText : colors.textSecondary}>
                {mine === theirs ? t('games.same', { count: matches, n: index + 1 }) : t('games.differ', { name })}
              </Txt>
            </View>
            {/* Their line, in their world's voice (the server's model writes it from the persona). */}
            <View style={styles.says} accessibilityLiveRegion="polite">
              <CharacterAvatar character={character} size={32} />
              <View style={styles.bubble}>
                <Txt variant="body">{line}</Txt>
              </View>
            </View>
            <Button label={last ? t('games.seeScore') : t('date.next')} size="lg" full onPress={next} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Option({
  text,
  mine,
  theirs,
  disabled,
  character,
  onPress,
}: {
  text: string;
  mine: boolean;
  theirs: boolean;
  disabled: boolean;
  character: Character;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <PressableScale
      scaleTo={0.97}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: mine, disabled }}
      style={[styles.option, mine && theirs ? styles.both : mine ? styles.mine : theirs ? styles.theirs : null]}
      onPress={onPress}>
      <Txt variant="bodyStrong" style={styles.grow}>
        {text}
      </Txt>
      {mine ? (
        <View style={styles.youTag}>
          <Txt variant="tiny" color={colors.textOnPrimary}>
            {t('games.you')}
          </Txt>
        </View>
      ) : null}
      {theirs ? <CharacterAvatar character={character} size={28} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  bold: { fontWeight: '700' },
  home: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.xl },
  selfCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  selfHero: { height: 116, flexDirection: 'row', alignItems: 'flex-end', padding: space.md + 2 },
  worldPill: {
    position: 'absolute',
    top: space.md,
    right: space.md,
    height: 26,
    paddingHorizontal: space.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  selfArt: { position: 'absolute', right: space.lg, bottom: space.sm },
  selfBody: { padding: space.lg, paddingTop: space.md, gap: space.xs },
  selfButton: {
    marginTop: space.sm + 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: space.sm + 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 68,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPill: {
    height: 22,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    justifyContent: 'center',
  },
  box: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  boxRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64, paddingHorizontal: space.md + 2 },
  boxOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 64 },
  boxDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  boxTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 26, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.primary },
  play: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md },
  options: { gap: space.sm, marginTop: space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 58,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  mine: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  theirs: { borderColor: colors.borderStrong },
  both: { borderColor: colors.bond, backgroundColor: colors.bondSoft },
  youTag: {
    height: 26,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdict: { padding: space.md, borderRadius: radius.lg },
  same: { backgroundColor: colors.bondSoft },
  differ: { backgroundColor: colors.surfaceAlt },
  says: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  bubble: {
    flexShrink: 1,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm + 2,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  score: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  result: { flex: 1, alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingTop: space.huge },
  pair: { flexDirection: 'row' },
  overlap: { marginLeft: -space.lg },
});
