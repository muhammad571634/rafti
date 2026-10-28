import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BUY_BAR_SPACE, CARD_SHADOW, GroupLabel, STORE, StoreBuyBar } from '@/components/plans/store-look';
import {
  AuroraGlass,
  CharacterAvatar,
  LargeTitle,
  MODULE_GLYPH,
  PressableScale,
  Screen,
  SFIcon,
  SymbolTile,
  Txt,
  UserAvatar,
} from '@/components/ui';
import { phrase } from '@/i18n';
import { shortName } from '@/lib/format';
import { lineFor, partnerPick, pickSome, QUIZ_MAX_QUESTIONS, weekKey } from '@/lib/quiz';
import { QUIZ_LINES, QUIZ_PACKS, SELF_QUIZ } from '@/mock/games';
import { localized } from '@/i18n/content';
import { WORLDS } from '@/mock/worlds';
import { displayName, useAppStore } from '@/store/use-app-store';
import { aurora, colors, hitSlop, isDark, moduleFills, space, systemColors } from '@/theme';
import type { Character } from '@/types';

/** One play: a pack, the friend's weekly quiz about themselves, or a quiz the user wrote. */
interface Run {
  id: string;
  title: string;
  questions: { text: string; options: readonly string[] }[];
}

const NEW_PACKS = ['qp_late_night', 'qp_habits'];
/** Quizzes wear indigo, as in the chat "+" menu and Us moments. */
const QUIZ_FILL = systemColors.indigo;

/**
 * Couple quiz (F29), on the aurora like the world quiz it links to. Home: the friend's own quiz
 * (5 questions about themselves, new each week) as the one featured card, their world's quiz that
 * wins a Photo Booth frame, the packs and the quizzes the user wrote, as iOS inset groups. In play
 * the friend's pick shows the moment you answer, with a line in their world's voice; the score
 * goes to the chat as a card and they react.
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

  const worlds = localized('worlds', WORLDS);
  const world = character ? worlds.find((w) => w.series === character.series) : undefined;
  const week = useMemo(() => weekKey(new Date()), []);

  const back = (onPress: () => void, icon: 'chevron-back' | 'close' = 'chevron-back') => (
    <PressableScale
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={icon === 'close' ? t('common.close') : t('common.back')}
      onPress={onPress}>
      <AuroraGlass style={styles.round}>
        <Ionicons name={icon} size={22} color={colors.text} style={icon === 'chevron-back' && styles.backIcon} />
      </AuroraGlass>
    </PressableScale>
  );

  if (!character) {
    return (
      <Screen background="aurora">
        <View style={styles.bar}>{back(() => router.back())}</View>
        <LargeTitle>{t('games.quiz')}</LargeTitle>
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
      questions: pickSome(world?.selfQuiz ?? localized('selfQuiz', SELF_QUIZ), `${character.id}:${week}`, QUIZ_MAX_QUESTIONS),
    };
    const won = world ? wonFrames.includes(world.key) : false;
    return (
      <Screen background="aurora">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
          <View style={styles.bar}>
            {back(() => router.back())}
            <View style={styles.flex} />
            <View style={styles.hostRing}>
              <CharacterAvatar character={character} size={36} />
            </View>
          </View>
          <LargeTitle>{t('games.quiz')}</LargeTitle>

          {/* Their quiz: the one featured card, the screen's main action. */}
          <PressableScale
            scaleTo={0.985}
            accessibilityRole="button"
            accessibilityLabel={t('quizHome.selfPlay', { name })}
            style={[styles.card, styles.selfCard]}
            onPress={() => start(selfRun)}>
            <View style={[styles.selfHero, { backgroundColor: world?.tint ?? aurora.glassOn }]}>
              {/* The world's pastel, quieter in dark mode (HIG Dark Mode: dimmer colours). */}
              {isDark ? <View style={styles.heroShade} /> : null}
              <CharacterAvatar character={character} size={64} ring ringColor={aurora.card} />
              {world ? (
                <View style={styles.worldPill}>
                  <Txt style={styles.worldPillText}>{phrase(world.series)}</Txt>
                </View>
              ) : null}
            </View>
            <View style={styles.selfBody}>
              <Txt style={styles.selfTitle}>{t('quizHome.selfTitle', { name })}</Txt>
              <Txt style={styles.selfText}>{t('quizHome.selfBody', { name })}</Txt>
              <View style={styles.cta}>
                <Txt style={styles.ctaText} lines={1}>
                  {t('quizHome.selfPlay', { name })}
                </Txt>
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
                <Txt style={styles.rowTitle} lines={2}>
                  {t('quizHome.worldWin', { world: phrase(world.series) })}
                </Txt>
                <Txt style={[styles.rowHint, won && styles.won]}>
                  {won ? t('quizHome.worldWon') : t('quizHome.worldHost', { name })}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={15} color={STORE.faint} />
            </PressableScale>
          ) : null}

          <GroupLabel>{t('quizHome.packs')}</GroupLabel>
          <View style={styles.card}>
            {localized('quizPacks', QUIZ_PACKS).map((p, i, list) => (
              <PressableScale
                key={p.id}
                scaleTo={0.985}
                accessibilityRole="button"
                style={[styles.row, i < list.length - 1 && styles.rowLine]}
                onPress={() => start({ id: p.id, title: t(`games.packs.${p.titleKey}`), questions: p.questions })}>
                <SymbolTile {...p.look} />
                <View style={styles.flex}>
                  <Txt style={styles.rowTitle}>{t(`games.packs.${p.titleKey}`)}</Txt>
                  <Txt style={styles.rowHint}>{t('games.questions', { count: p.questions.length })}</Txt>
                </View>
                {NEW_PACKS.includes(p.id) ? (
                  <View style={styles.newPill}>
                    <Txt style={styles.newText}>{t('quizHome.new')}</Txt>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={15} color={STORE.faint} />
              </PressableScale>
            ))}
          </View>

          <GroupLabel>{t('quizHome.yours')}</GroupLabel>
          <View style={styles.card}>
            {/* iOS "add" row: the accent's plus and words, as Reminders' "Add List". */}
            <PressableScale
              scaleTo={0.985}
              accessibilityRole="button"
              style={[styles.row, userQuizzes.length > 0 && styles.rowLine]}
              onPress={() => router.push('/quiz/write')}>
              <SFIcon ios="plus.circle.fill" icon="add-circle" size={30} color={STORE.peachInk} />
              <Txt style={[styles.rowTitle, styles.addText]}>{t('quizHome.write')}</Txt>
            </PressableScale>
            {userQuizzes.map((q, i) => (
              <View key={q.id} style={[styles.row, i < userQuizzes.length - 1 && styles.rowLine]}>
                <PressableScale
                  scaleTo={0.985}
                  accessibilityRole="button"
                  accessibilityLabel={q.title}
                  style={styles.rowOpen}
                  onPress={() => start({ id: q.id, title: q.title, questions: q.questions })}>
                  <SymbolTile fill={QUIZ_FILL} ios="questionmark" icon="help" />
                  <View style={styles.flex}>
                    <Txt style={styles.rowTitle} lines={1}>
                      {q.title}
                    </Txt>
                    <Txt style={styles.rowHint}>{t('quizHome.mineMeta', { count: q.questions.length })}</Txt>
                  </View>
                </PressableScale>
                <PressableScale
                  hitSlop={hitSlop}
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={t('quizHome.edit', { title: q.title })}
                  onPress={() => router.push({ pathname: '/quiz/write', params: { id: q.id } })}>
                  <SFIcon ios="pencil" icon="create-outline" size={20} color={aurora.textMuted} />
                </PressableScale>
              </View>
            ))}
          </View>
          <Txt style={styles.footnote}>{t('quizHome.only')}</Txt>
        </ScrollView>
      </Screen>
    );
  }

  const total = run.questions.length;

  // 3. The score.
  if (done) {
    return (
      <Screen background="aurora">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: BUY_BAR_SPACE + insets.bottom }}>
          <View style={[styles.result, styles.resultTop]}>
            <View style={styles.pair}>
              <UserAvatar user={user} size={80} />
              <CharacterAvatar character={character} size={80} ring ringColor={aurora.card} style={styles.overlap} />
            </View>
            <View style={styles.score} accessible accessibilityLabel={`${matches} / ${total}`}>
              <SFIcon ios={MODULE_GLYPH.bond.ios} icon={MODULE_GLYPH.bond.icon} size={36} color={moduleFills.bond} />
              <Txt variant="heroFigure">
                {matches}/{total}
              </Txt>
            </View>
            <Txt style={styles.resultTitle} center accessibilityRole="header">
              {run.title}
            </Txt>
          </View>
        </ScrollView>
        <StoreBuyBar label={t('games.backToChat', { name })} onPress={backToChat} />
      </Screen>
    );
  }

  // 2. A question.
  const question = run.questions[index];
  const theirs = partnerPick(character.id, run.id, index, question.options.length);
  const last = index === total - 1;
  const lines = world ?? localized('quizLines', QUIZ_LINES);
  const seed = `${character.id}:${run.id}:${index}`;
  const same = mine != null && mine === theirs;
  const line = mine == null ? '' : same ? lineFor(lines.match, seed) : lineFor(lines.differ, seed, question.options[theirs]);

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
    <Screen background="aurora">
      <View style={[styles.bar, styles.playBar]}>
        {back(() => setRun(null), 'close')}
        <View style={styles.dots} accessible accessibilityLabel={`${index + 1} / ${total}`}>
          {run.questions.map((_, i) => (
            <View key={i} style={[styles.dot, i <= index && styles.dotOn]} />
          ))}
        </View>
        <View style={styles.hostRing}>
          <CharacterAvatar character={character} size={36} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: mine != null ? BUY_BAR_SPACE + insets.bottom : insets.bottom + space.xl }}>
        <Txt style={styles.progress}>{t('games.progress', { title: run.title, n: index + 1, total })}</Txt>
        <Txt style={styles.question} accessibilityRole="header">
          {question.text}
        </Txt>

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
              <Txt style={[styles.verdict, { color: same ? colors.bondText : aurora.textMuted }]}>
                {same ? t('games.same', { count: matches, n: index + 1 }) : t('games.differ', { name })}
              </Txt>
              <Txt style={styles.bubbleText}>{line}</Txt>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {mine != null ? <StoreBuyBar label={last ? t('games.seeScore') : t('date.next')} onPress={next} /> : null}
    </Screen>
  );
}

/**
 * One answer as an aurora card. Yours takes an ink border and a "You" tag (ink marks selection),
 * theirs their face; when both picked it, the border is the bond's mint.
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
      <Txt style={[styles.optionText, answered && !mine && !theirs && styles.dim]}>{text}</Txt>
      {mine ? (
        <View style={styles.youTag}>
          <Txt style={styles.youText}>{t('games.you')}</Txt>
        </View>
      ) : null}
      {theirs ? <CharacterAvatar character={character} size={28} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { height: 44, paddingHorizontal: space.lg, paddingTop: space.xs, flexDirection: 'row', alignItems: 'center' },
  playBar: { height: 56, gap: space.md },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backIcon: { marginLeft: -2 },
  hostRing: { padding: 2, borderRadius: 20, backgroundColor: aurora.ring },
  card: { marginHorizontal: space.lg, borderRadius: 20, overflow: 'hidden', backgroundColor: aurora.card, ...CARD_SHADOW },
  selfCard: { marginTop: 20 },
  selfHero: { height: 116, flexDirection: 'row', alignItems: 'flex-end', padding: 14 },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  worldPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: aurora.card,
    justifyContent: 'center',
  },
  worldPillText: { fontSize: 13, fontWeight: '600', color: colors.text },
  selfBody: { padding: space.lg, paddingTop: 14, gap: 4 },
  selfTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3, color: colors.text },
  selfText: { fontSize: 15, lineHeight: 20, color: aurora.textMuted },
  cta: { marginTop: 12, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: STORE.cta },
  ctaText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: STORE.ctaInk },
  worldRow: { marginTop: space.md },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg, paddingVertical: 8 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: aurora.separator },
  rowOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 17, letterSpacing: -0.4, color: colors.text },
  rowHint: { marginTop: 1, fontSize: 13, lineHeight: 17, color: aurora.textMuted },
  won: { color: colors.bondText },
  addText: { flex: 1, color: STORE.peachInk },
  newPill: { height: 24, paddingHorizontal: 9, borderRadius: 12, justifyContent: 'center', backgroundColor: STORE.peachSoft },
  newText: { fontSize: 13, fontWeight: '700', color: STORE.peachInk },
  footnote: { marginTop: 8, marginHorizontal: space.lg * 2, fontSize: 13, lineHeight: 18, color: aurora.textMuted },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { flex: 1, maxWidth: 34, height: 6, borderRadius: 3, backgroundColor: aurora.glassOn },
  dotOn: { backgroundColor: aurora.tint },
  progress: {
    marginTop: space.md,
    marginHorizontal: space.lg,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: aurora.textMuted,
    textTransform: 'uppercase',
  },
  question: { marginTop: 6, marginHorizontal: space.lg, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.2, color: colors.text },
  options: { gap: 10, marginTop: space.xl, marginHorizontal: space.lg },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 58,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: aurora.card,
    ...CARD_SHADOW,
  },
  optionText: { flex: 1, fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  mine: { borderColor: colors.text },
  both: { borderColor: colors.bond },
  dim: { opacity: 0.4 },
  youTag: { height: 24, paddingHorizontal: 9, borderRadius: 12, justifyContent: 'center', backgroundColor: STORE.inkTag },
  youText: { fontSize: 13, fontWeight: '700', color: STORE.inkTagText },
  says: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginHorizontal: space.lg, marginTop: space.lg },
  bubble: {
    flexShrink: 1,
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    backgroundColor: aurora.card,
    ...CARD_SHADOW,
  },
  verdict: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
  bubbleText: { fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.text },
  result: { alignItems: 'center', gap: space.md, paddingHorizontal: space.xl },
  resultTop: { paddingTop: space.huge },
  pair: { flexDirection: 'row' },
  overlap: { marginLeft: -space.lg },
  score: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  resultTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.2, color: colors.text },
});
