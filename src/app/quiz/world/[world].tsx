import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoothPicture } from '@/components/photo-booth/booth-picture';
import { CARD_SHADOW, BUY_BAR_SPACE, STORE, StoreBuyBar } from '@/components/plans/store-look';
import { AuroraGlass, CharacterAvatar, EmptyState, LargeTitle, PressableScale, Screen, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { lineFor, pickSome, WORLD_PASS, WORLD_QUESTIONS } from '@/lib/quiz';
import { phrase } from '@/i18n';
import { localized } from '@/i18n/content';
import { WORLDS } from '@/mock/worlds';
import { displayName, useAppStore } from '@/store/use-app-store';
import { aurora, colors, space, systemColors } from '@/theme';
import type { Character } from '@/types';

type Phase = 'intro' | 'play' | 'done';

/**
 * A world quiz (F29), on the aurora like Find and the World page: a friend from that world asks
 * 5 questions about it and its people, in their voice. 4 right wins the world's Photo Booth frame; a miss can try again at once, with
 * other questions. The host is the friend the user came from, else their closest friend there.
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


  const back = (onPress: () => void = () => router.back(), icon: 'chevron-back' | 'close' = 'chevron-back') => (
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

  if (!world) {
    return (
      <Screen background="aurora">
        <View style={styles.bar}>{back()}</View>
        <LargeTitle>{t('games.quiz')}</LargeTitle>
      </Screen>
    );
  }

  const title = t('worldQuiz.title', { world: phrase(world.series) });

  if (!host) {
    return (
      <Screen background="aurora">
        <View style={styles.bar}>{back()}</View>
        <LargeTitle>{title}</LargeTitle>
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

  // 1. The host's intro and the prize.
  if (phase === 'intro') {
    return (
      <Screen background="aurora">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: BUY_BAR_SPACE }}>
          <View style={styles.bar}>{back()}</View>
          <LargeTitle>{title}</LargeTitle>
          <View style={styles.prize}>
            <BoothPicture photo={framed} character={host} width={176} style={styles.tilt} />
          </View>
          <Says host={host} text={world.intro} />
          <Txt style={styles.rule} center>
            {already ? t('worldQuiz.alreadyBody') : t('worldQuiz.rule')}
          </Txt>
        </ScrollView>
        <StoreBuyBar label={t('worldQuiz.start')} onPress={restart} />
      </Screen>
    );
  }

  // 3. How it went.
  if (phase === 'done') {
    const total = questions.length;
    return (
      <Screen background="aurora">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: BUY_BAR_SPACE }}>
          <View style={styles.bar}>{back()}</View>
          <View style={styles.result}>
            {result === 'lost' ? (
              <View style={styles.ring}>
                <CharacterAvatar character={host} size={96} />
              </View>
            ) : (
              <BoothPicture photo={framed} character={host} width={192} develop={result === 'won'} style={styles.tilt} />
            )}
            <Txt style={styles.resultTitle} center accessibilityRole="header">
              {result === 'won'
                ? t('worldQuiz.wonTitle', { world: phrase(world.series) })
                : result === 'again'
                  ? t('worldQuiz.alreadyTitle', { score, total })
                  : t('worldQuiz.lostTitle', { score, total })}
            </Txt>
            <Txt style={styles.resultBody} center>
              {result === 'won'
                ? t('worldQuiz.wonBody')
                : result === 'again'
                  ? t('worldQuiz.alreadyBody')
                  : t('worldQuiz.lostBody')}
            </Txt>
            <PressableScale scaleTo={0.96} accessibilityRole="button" onPress={() => router.back()} style={styles.secondary}>
              <Txt style={styles.secondaryText}>{t('worldQuiz.back')}</Txt>
            </PressableScale>
          </View>
        </ScrollView>
        {result === 'lost' ? (
          <StoreBuyBar label={t('worldQuiz.again')} onPress={restart} />
        ) : (
          <StoreBuyBar
            label={t('worldQuiz.toBooth')}
            onPress={() =>
              router.replace({ pathname: '/photo-booth', params: { frame: `w:${world.key}`, partner: host.id } })
            }
          />
        )}
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
    <Screen background="aurora">
      <View style={[styles.bar, styles.playBar]}>
        {back(() => setPhase('intro'), 'close')}
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
        contentContainerStyle={{ paddingBottom: picked != null ? BUY_BAR_SPACE : insets.bottom + space.xl }}>
        <Txt style={styles.progress}>
          {t('worldQuiz.progress', { world: phrase(world.series), n: index + 1, total: questions.length })}
        </Txt>
        <Txt style={styles.question} accessibilityRole="header">
          {question.text}
        </Txt>
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
                style={[
                  styles.option,
                  isRight && styles.right,
                  isWrongPick && styles.wrong,
                ]}
                onPress={() => pick(option)}>
                {/* The other answers fade by their text: PressableScale owns the card's opacity. */}
                <Txt style={[styles.optionText, picked != null && !isRight && !isWrongPick && styles.dim]}>{text}</Txt>
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
            text={right ? lineFor(world.right, seed) : lineFor(world.wrong, seed, question.options[question.answer])}
          />
        ) : (
          <Txt style={styles.rule} center>
            {t('worldQuiz.rule')} · {name}
          </Txt>
        )}
      </ScrollView>

      {picked != null ? (
        <StoreBuyBar label={last ? t('worldQuiz.seeResult') : t('worldQuiz.next')} onPress={next} />
      ) : null}
    </Screen>
  );
}

/** The host speaking: their face and a chat bubble on the aurora, with an optional verdict on top. */
function Says({ host, text, label, labelColor }: { host: Character; text: string; label?: string; labelColor?: string }) {
  return (
    <View style={styles.says} accessibilityLiveRegion="polite">
      <CharacterAvatar character={host} size={32} />
      <View style={styles.bubble}>
        {label ? <Txt style={[styles.verdict, { color: labelColor }]}>{label}</Txt> : null}
        <Txt style={styles.bubbleText}>{text}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 44, paddingHorizontal: space.lg, paddingTop: space.xs, flexDirection: 'row', alignItems: 'center' },
  playBar: { height: 56, gap: space.md },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backIcon: { marginLeft: -2 },
  prize: { alignItems: 'center', paddingTop: space.xxl, paddingBottom: space.lg },
  tilt: { transform: [{ rotate: '-2deg' }] },
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
  rule: { marginTop: space.lg, marginHorizontal: space.xl, fontSize: 13, lineHeight: 18, color: aurora.textMuted },
  result: { alignItems: 'center', gap: space.md, paddingTop: space.xl, paddingHorizontal: space.xl },
  ring: { padding: 4, borderRadius: 52, backgroundColor: aurora.ring },
  resultTitle: { marginTop: space.md, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.2, color: colors.text },
  resultBody: { fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: aurora.textMuted },
  secondary: { marginTop: space.sm, height: 40, paddingHorizontal: space.lg, borderRadius: 20, justifyContent: 'center', backgroundColor: STORE.peachSoft },
  secondaryText: { fontSize: 15, fontWeight: '700', color: STORE.peachInk },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { flex: 1, maxWidth: 34, height: 6, borderRadius: 3, backgroundColor: aurora.glassOn },
  dotOn: { backgroundColor: aurora.tint },
  hostRing: { padding: 2, borderRadius: 20, backgroundColor: aurora.ring },
  progress: { marginTop: space.md, marginHorizontal: space.lg, fontSize: 13, fontWeight: '600', letterSpacing: 0.2, color: aurora.textMuted, textTransform: 'uppercase' },
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
  right: { borderColor: systemColors.green },
  wrong: { borderColor: systemColors.red },
  dim: { opacity: 0.4 },
});
