import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INK_DOCK_SPACE, InkDock, InkIconButton, InkNavBar, InkText, PillButton } from '@/components/ink';
import { BoothPicture } from '@/components/photo-booth/booth-picture';
import { CharacterAvatar, EmptyState, PressableScale, Screen } from '@/components/ui';
import { shortName } from '@/lib/format';
import type { WriteResults } from '@/ai/writes';
import { lineFor, pickSome, WORLD_PASS, WORLD_QUESTIONS } from '@/lib/quiz';
import { phrase } from '@/i18n';
import { localized } from '@/i18n/content';
import { WORLDS } from '@/mock/worlds';
import { displayName, modelIsOn, useAppStore, writeBase, writeWithModel } from '@/store/use-app-store';
import { space, systemColors } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';
import type { Character } from '@/types';

type Phase = 'intro' | 'play' | 'done';

/**
 * A world quiz (F29), in Ink (0z325): a friend from that world asks 5 questions about it and its
 * people, in their voice. 4 right wins the world's Photo Booth frame; a miss can try again at once,
 * with other questions. The host is the friend the user came from, else their closest friend there.
 */
export default function WorldQuizScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ world: string; host?: string }>();
  const world = localized('worlds', WORLDS).find((w) => w.key === params.world);

  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const conversations = useAppStore((s) => s.conversations);
  const blockedIds = useAppStore((s) => s.blockedIds);
  const wonFrames = useAppStore((s) => s.wonFrames);
  const finishWorldQuiz = useAppStore((s) => s.finishWorldQuiz);

  const host = useMemo(() => {
    if (!world) return undefined;
    const friends = characters.filter(
      (c) =>
        c.series === world.series && !blockedIds.includes(c.id) && conversations.some((v) => v.characterId === c.id),
    );
    return (
      friends.find((c) => c.id === params.host) ??
      [...friends].sort((a, b) => (relationships[b.id]?.intimacy ?? 0) - (relationships[a.id]?.intimacy ?? 0))[0]
    );
  }, [world, characters, blockedIds, conversations, relationships, params.host]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<'won' | 'again' | 'lost'>('lost');
  const [shotAt] = useState(() => new Date().toISOString());

  const questions = useMemo(
    () => (world ? pickSome(world.quiz, `${world.key}:${attempt}:${shotAt}`, WORLD_QUESTIONS) : []),
    [world, attempt, shotAt],
  );

  // The questions are facts and stay as written; what the host says is the model's, one call an
  // attempt. Busy, the quiz still plays and the host just gives the verdict.
  const hostId = host?.id;
  const [said, setSaid] = useState<WriteResults['worldLines'] | null>(null);
  useEffect(() => {
    if (!world || !hostId || !modelIsOn()) return;
    const base = writeBase(hostId, true);
    if (!base) return;
    let live = true;
    setSaid(null);
    void writeWithModel({ ...base, kind: 'worldLines', world: world.series, questions }).then((written) => {
      if (live) setSaid(written);
    });
    return () => {
      live = false;
    };
  }, [world, hostId, questions]);

  const nav = <InkNavBar backLabel={t('common.back')} onBack={() => router.back()} />;

  if (!world) {
    return (
      <Screen background={ink.ground}>
        {nav}
        <InkText variant="display" style={styles.title}>
          {t('games.quiz')}
        </InkText>
      </Screen>
    );
  }

  const title = t('worldQuiz.title', { world: phrase(world.series) });

  if (!host) {
    return (
      <Screen background={ink.ground}>
        {nav}
        <InkText variant="display" style={styles.title}>
          {title}
        </InkText>
        <EmptyState
          symbol={{ ios: 'safari.fill', icon: 'compass' }}
          title={t('worldQuiz.noHost', { world: phrase(world.series) })}
          actionLabel={t('frames.find')}
          onAction={() => router.replace('/(tabs)/find')}
        />
      </Screen>
    );
  }

  const name = shortName(displayName(host, relationships[host.id]));
  const already = wonFrames.includes(world.key);
  const framed = { style: 'polaroid' as const, seed: 0, createdAt: shotAt, frame: world.frame };

  const restart = () => {
    setAttempt((a) => a + 1);
    setIndex(0);
    setPicked(null);
    setScore(0);
    setPhase('play');
  };
  // The first Start plays the questions the host already has lines for; after leaving a quiz, new ones.
  const startPlay = () => (index > 0 || picked != null ? restart() : setPhase('play'));

  // 1. The host's intro and the prize.
  if (phase === 'intro') {
    return (
      <Screen background={ink.ground}>
        {nav}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: INK_DOCK_SPACE + insets.bottom }}>
          <InkText variant="display" style={styles.title}>
            {title}
          </InkText>
          <View style={styles.prize}>
            <BoothPicture photo={framed} character={host} width={176} style={styles.tilt} />
          </View>
          {modelIsOn() ? said ? <Says host={host} text={said.intro} /> : null : <Says host={host} text={world.intro} />}
          <InkText variant="footnote" color={ink.text2} center style={styles.rule}>
            {already ? t('worldQuiz.alreadyBody') : t('worldQuiz.rule')}
          </InkText>
        </ScrollView>
        <InkDock>
          <PillButton label={t('worldQuiz.start')} onPress={startPlay} />
        </InkDock>
      </Screen>
    );
  }

  // 3. How it went.
  if (phase === 'done') {
    const total = questions.length;
    return (
      <Screen background={ink.ground}>
        {nav}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: INK_DOCK_SPACE + insets.bottom }}>
          <View style={styles.result}>
            {result === 'lost' ? (
              <View style={styles.ring}>
                <CharacterAvatar character={host} size={96} />
              </View>
            ) : (
              <BoothPicture photo={framed} character={host} width={192} develop={result === 'won'} style={styles.tilt} />
            )}
            <InkText variant="title" center accessibilityRole="header" style={styles.resultTitle}>
              {result === 'won'
                ? t('worldQuiz.wonTitle', { world: phrase(world.series) })
                : result === 'again'
                  ? t('worldQuiz.alreadyTitle', { score, total })
                  : t('worldQuiz.lostTitle', { score, total })}
            </InkText>
            <InkText variant="body" color={ink.text2} center>
              {result === 'won'
                ? t('worldQuiz.wonBody')
                : result === 'again'
                  ? t('worldQuiz.alreadyBody')
                  : t('worldQuiz.lostBody')}
            </InkText>
            <PressableScale scaleTo={0.96} accessibilityRole="button" onPress={() => router.back()} style={styles.secondary}>
              <InkText variant="subStrong" color={ink.accent}>
                {t('worldQuiz.back')}
              </InkText>
            </PressableScale>
          </View>
        </ScrollView>
        <InkDock>
          {result === 'lost' ? (
            <PillButton label={t('worldQuiz.again')} onPress={restart} />
          ) : (
            <PillButton
              label={t('worldQuiz.toBooth')}
              onPress={() =>
                router.replace({ pathname: '/photo-booth', params: { frame: `w:${world.key}`, partner: host.id } })
              }
            />
          )}
        </InkDock>
      </Screen>
    );
  }

  // 2. A question.
  const question = questions[index];
  const last = index === questions.length - 1;
  const right = picked != null && picked === question.answer;
  const seed = `${world.key}:${attempt}:${index}`;

  const pick = (option: number) => {
    if (picked != null) return;
    setPicked(option);
    if (option === question.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (!last) {
      setIndex((i) => i + 1);
      setPicked(null);
      return;
    }
    const wonNow = finishWorldQuiz(world.key, host.id, score, questions.length);
    setResult(wonNow ? 'won' : score >= WORLD_PASS && already ? 'again' : 'lost');
    setPhase('done');
  };

  return (
    <Screen background={ink.ground}>
      <View style={styles.playBar}>
        <InkIconButton icon="close" size={22} accessibilityLabel={t('common.close')} onPress={() => setPhase('intro')} />
        <View style={styles.dots} accessible accessibilityLabel={`${index + 1} / ${questions.length}`}>
          {questions.map((_, i) => (
            <View key={i} style={[styles.dot, i <= index && styles.dotOn]} />
          ))}
        </View>
        <View style={styles.hostRing}>
          <CharacterAvatar character={host} size={36} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: picked != null ? INK_DOCK_SPACE + insets.bottom : insets.bottom + space.xl }}>
        <InkText variant="caption" color={ink.text2} style={styles.progress}>
          {t('worldQuiz.progress', { world: phrase(world.series), n: index + 1, total: questions.length })}
        </InkText>
        <InkText variant="title" accessibilityRole="header" style={styles.question}>
          {question.text}
        </InkText>
        <View style={styles.options}>
          {question.options.map((text, option) => {
            const isRight = picked != null && option === question.answer;
            const isWrongPick = picked === option && option !== question.answer;
            return (
              <PressableScale
                key={option}
                // No `disabled`: it would fade the answer too; `pick` ignores taps after the first.
                scaleTo={picked != null ? 1 : 0.97}
                accessibilityRole="button"
                accessibilityState={{ selected: picked === option, disabled: picked != null }}
                style={[styles.option, isRight && styles.right, isWrongPick && styles.wrong]}
                onPress={() => pick(option)}>
                {/* The other answers fade by their text: PressableScale owns the card's opacity. */}
                <InkText variant="bodyStrong" style={[styles.flex, picked != null && !isRight && !isWrongPick && styles.dim]}>
                  {text}
                </InkText>
                {isRight ? <Ionicons name="checkmark-circle" size={24} color={systemColors.green} /> : null}
                {isWrongPick ? <Ionicons name="close-circle" size={24} color={systemColors.red} /> : null}
              </PressableScale>
            );
          })}
        </View>

        {picked != null ? (
          <Says
            host={host}
            label={right ? t('worldQuiz.right') : t('worldQuiz.wrong')}
            labelColor={right ? systemColors.green : systemColors.red}
            text={
              modelIsOn()
                ? (said && (right ? said.lines[index].right : said.lines[index].wrong)) || ''
                : right
                  ? lineFor(world.right, seed)
                  : lineFor(world.wrong, seed, question.options[question.answer])
            }
          />
        ) : (
          <InkText variant="footnote" color={ink.text2} center style={styles.rule}>
            {t('worldQuiz.rule')} · {name}
          </InkText>
        )}
      </ScrollView>

      {picked != null ? (
        <InkDock>
          <PillButton label={last ? t('worldQuiz.seeResult') : t('worldQuiz.next')} onPress={next} />
        </InkDock>
      ) : null}
    </Screen>
  );
}

/** The host speaking: their face and a chat bubble on the ground, with an optional verdict on top. */
function Says({ host, text, label, labelColor }: { host: Character; text: string; label?: string; labelColor?: string }) {
  return (
    <View style={styles.says} accessibilityLiveRegion="polite">
      <CharacterAvatar character={host} size={32} />
      <View style={styles.bubble}>
        {label ? (
          <InkText variant="footnoteStrong" color={labelColor}>
            {label}
          </InkText>
        ) : null}
        {text ? <InkText variant="body">{text}</InkText> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { marginTop: 2, marginHorizontal: inkGutter },
  playBar: { minHeight: 56, paddingHorizontal: inkGutter, paddingTop: 4, flexDirection: 'row', alignItems: 'center', gap: space.md },
  prize: { alignItems: 'center', paddingTop: space.xxl, paddingBottom: space.lg },
  tilt: { transform: [{ rotate: '-2deg' }] },
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
  rule: { marginTop: space.lg, marginHorizontal: space.xl },
  result: { alignItems: 'center', gap: space.md, paddingTop: space.xl, paddingHorizontal: space.xl },
  ring: { padding: 4, borderRadius: 52, backgroundColor: ink.hairlineFill },
  resultTitle: { marginTop: space.md },
  secondary: { marginTop: space.sm, minHeight: 44, paddingHorizontal: space.lg, borderRadius: inkRadius.pill, justifyContent: 'center', backgroundColor: ink.raised },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { flex: 1, maxWidth: 34, height: 6, borderRadius: inkRadius.pill, backgroundColor: ink.hairlineFill },
  dotOn: { backgroundColor: ink.accent },
  hostRing: { padding: 2, borderRadius: 20, backgroundColor: ink.hairlineFill },
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
  right: { borderColor: systemColors.green },
  wrong: { borderColor: systemColors.red },
  dim: { opacity: 0.4 },
});
