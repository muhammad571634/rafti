import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoothPicture } from '@/components/photo-booth/booth-picture';
import { Button, CharacterAvatar, EmptyState, Header, PressableScale, Screen, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { lineFor, pickSome, WORLD_PASS, WORLD_QUESTIONS } from '@/lib/quiz';
import { worldByKey } from '@/mock/worlds';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, radius, space } from '@/theme';

type Phase = 'intro' | 'play' | 'done';

/**
 * A world quiz (F29): a friend from that world asks 5 questions about it and its people, in
 * their voice. 4 right wins the world's Photo Booth frame; a miss can try again at once, with
 * other questions. The host is the friend the user came from, else their closest friend there.
 */
export default function WorldQuizScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ world: string; host?: string }>();
  const world = worldByKey(params.world ?? '');

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

  if (!world) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('games.quiz')} />
      </Screen>
    );
  }

  const title = t('worldQuiz.title', { world: world.series });

  if (!host) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={title} />
        <EmptyState
          icon="compass"
          title={t('worldQuiz.noHost', { world: world.series })}
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

  // 1. The host's intro and the prize.
  if (phase === 'intro') {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={title} />
        <ScrollView contentContainerStyle={[styles.center, { paddingBottom: insets.bottom + space.lg }]}>
          <BoothPicture photo={framed} character={host} width={168} style={styles.tilt} />
          <View style={styles.says}>
            <CharacterAvatar character={host} size={36} />
            <View style={styles.bubble}>
              <Txt variant="body">{world.intro}</Txt>
            </View>
          </View>
          <Txt variant="small" color={colors.textSecondary} center>
            {already ? t('worldQuiz.alreadyBody') : t('worldQuiz.rule')}
          </Txt>
          <View style={styles.grow} />
          <Button label={t('worldQuiz.start')} size="lg" full onPress={restart} />
        </ScrollView>
      </Screen>
    );
  }

  // 3. How it went.
  if (phase === 'done') {
    const total = questions.length;
    return (
      <Screen background={colors.bgPlain}>
        <Header title={title} />
        <ScrollView contentContainerStyle={[styles.center, { paddingBottom: insets.bottom + space.lg }]}>
          {result === 'lost' ? (
            <CharacterAvatar character={host} size={96} />
          ) : (
            <BoothPicture photo={framed} character={host} width={184} develop={result === 'won'} style={styles.tilt} />
          )}
          <Txt variant="h2" center>
            {result === 'won'
              ? t('worldQuiz.wonTitle', { world: world.series })
              : result === 'again'
                ? t('worldQuiz.alreadyTitle', { score, total })
                : t('worldQuiz.lostTitle', { score, total })}
          </Txt>
          <Txt variant="body" color={colors.textSecondary} center>
            {result === 'won'
              ? t('worldQuiz.wonBody')
              : result === 'again'
                ? t('worldQuiz.alreadyBody')
                : t('worldQuiz.lostBody')}
          </Txt>
          <View style={styles.grow} />
          {result === 'lost' ? (
            <Button label={t('worldQuiz.again')} size="lg" full onPress={restart} />
          ) : (
            <Button
              label={t('worldQuiz.toBooth')}
              size="lg"
              full
              onPress={() =>
                router.replace({ pathname: '/photo-booth', params: { frame: `w:${world.key}`, partner: host.id } })
              }
            />
          )}
          <Button label={t('worldQuiz.back')} variant="secondary" size="lg" full onPress={() => router.back()} />
        </ScrollView>
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
    <Screen background={colors.bgPlain}>
      <View style={styles.top}>
        <PressableScale
          style={styles.close}
          hitSlop={hitSlop}
          scaleTo={0.9}
          accessibilityLabel={t('common.close')}
          onPress={() => setPhase('intro')}>
          <Ionicons name="close" size={22} color={colors.text} />
        </PressableScale>
        <View style={styles.dots}>
          {questions.map((_, i) => (
            <View key={i} style={[styles.dot, i <= index && styles.dotOn]} />
          ))}
        </View>
        <CharacterAvatar character={host} size={36} />
      </View>

      <ScrollView contentContainerStyle={[styles.play, { paddingBottom: insets.bottom + space.lg }]}>
        <Txt variant="smallStrong" color={colors.textMuted}>
          {t('worldQuiz.progress', { world: world.series, n: index + 1, total: questions.length })}
        </Txt>
        <Txt variant="h1">{question.text}</Txt>
        <View style={styles.options}>
          {question.options.map((text, option) => {
            const isRight = picked != null && option === question.answer;
            const isWrongPick = picked === option && option !== question.answer;
            return (
              <PressableScale
                key={option}
                scaleTo={0.97}
                disabled={picked != null}
                accessibilityRole="button"
                accessibilityState={{ selected: picked === option, disabled: picked != null }}
                style={[
                  styles.option,
                  isRight && styles.right,
                  isWrongPick && styles.wrong,
                  picked != null && !isRight && !isWrongPick && styles.dim,
                ]}
                onPress={() => pick(option)}>
                <Txt variant="bodyStrong" style={styles.grow}>
                  {text}
                </Txt>
                {isRight ? <Ionicons name="checkmark-circle" size={22} color={colors.bondText} /> : null}
                {isWrongPick ? <Ionicons name="close-circle" size={22} color={colors.textSecondary} /> : null}
              </PressableScale>
            );
          })}
        </View>

        {picked != null ? (
          <>
            <View style={styles.says} accessibilityLiveRegion="polite">
              <CharacterAvatar character={host} size={32} />
              <View style={styles.bubble}>
                <Txt variant="smallStrong" color={right ? colors.bondText : colors.textSecondary}>
                  {right ? t('worldQuiz.right') : t('worldQuiz.wrong')}
                </Txt>
                <Txt variant="body">
                  {right ? lineFor(world.right, seed) : lineFor(world.wrong, seed, question.options[question.answer])}
                </Txt>
              </View>
            </View>
            <Button label={last ? t('worldQuiz.seeResult') : t('worldQuiz.next')} size="lg" full onPress={next} />
          </>
        ) : null}
        <Txt variant="caption" color={colors.textMuted} center>
          {t('worldQuiz.rule')} · {name}
        </Txt>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  center: { flexGrow: 1, alignItems: 'center', gap: space.lg, paddingHorizontal: space.lg, paddingTop: space.xl },
  tilt: { transform: [{ rotate: '-2deg' }], marginBottom: space.sm },
  says: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, alignSelf: 'stretch' },
  bubble: {
    flexShrink: 1,
    gap: 2,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm + 2,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
  right: { borderColor: colors.bond, backgroundColor: colors.bondSoft },
  wrong: { borderColor: colors.text },
  dim: { opacity: 0.55 },
});
