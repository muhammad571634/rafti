import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, CharacterAvatar, ClayIcon, Header, PressableScale, Screen, Txt, UserAvatar } from '@/components/ui';
import { shortName } from '@/lib/format';
import { partnerAnswer, QUIZ_PACKS, type QuizPack } from '@/mock/games';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, radius, space } from '@/theme';
import type { Character } from '@/types';

/**
 * Couple quiz: pick a pack, answer five questions, and see their answer the moment
 * you choose. The score goes to the chat as a card and they react to it.
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
  const finishQuiz = useAppStore((s) => s.finishQuiz);

  const [pack, setPack] = useState<QuizPack | null>(null);
  const [index, setIndex] = useState(0);
  const [mine, setMine] = useState<number | null>(null);
  const [matches, setMatches] = useState(0);
  const [done, setDone] = useState(false);

  if (!character) {
    return (
      <Screen>
        <Header title={t('games.quiz')} />
      </Screen>
    );
  }

  const name = shortName(displayName(character, relationship));
  const backToChat = () => (conversation ? router.replace(`/chat/${conversation.id}`) : router.back());

  // 1. Pick a pack.
  if (!pack) {
    return (
      <Screen background={colors.bgPlain}>
        <Header title={t('games.quiz')} />
        <ScrollView contentContainerStyle={styles.packs}>
          {QUIZ_PACKS.map((p) => (
            <PressableScale key={p.id} style={styles.pack} scaleTo={0.97} onPress={() => setPack(p)}>
              <View style={styles.packEmoji}>
                <ClayIcon name={p.icon} size={40} tile={false} />
              </View>
              <View style={styles.grow}>
                <Txt variant="title">{t(`games.packs.${p.titleKey}`)}</Txt>
                <Txt variant="small" color={colors.textMuted}>
                  {t('games.questions', { count: p.questions.length })}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
            </PressableScale>
          ))}
        </ScrollView>
      </Screen>
    );
  }

  const total = pack.questions.length;
  const title = t(`games.packs.${pack.titleKey}`);

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
            {title}
          </Txt>
          <View style={styles.grow} />
          <Button label={t('games.backToChat', { name })} size="lg" full onPress={backToChat} />
        </View>
      </Screen>
    );
  }

  // 2. A question.
  const question = pack.questions[index];
  const theirs = partnerAnswer(character.id, pack.id, index);
  const last = index === total - 1;

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
    finishQuiz(character.id, pack.id, matches, title);
    setDone(true);
  };

  return (
    <Screen background={colors.bgPlain}>
      <View style={styles.top}>
        <PressableScale style={styles.close} hitSlop={hitSlop} scaleTo={0.9} accessibilityLabel={t('common.close')} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={colors.text} />
        </PressableScale>
        <View style={styles.dots}>
          {pack.questions.map((_, i) => (
            <View key={i} style={[styles.dot, i <= index && styles.dotOn]} />
          ))}
        </View>
        <CharacterAvatar character={character} size={36} />
      </View>

      <ScrollView contentContainerStyle={[styles.play, { paddingBottom: insets.bottom + space.lg }]}>
        <Txt variant="smallStrong" color={colors.textMuted}>
          {t('games.progress', { title, n: index + 1, total })}
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
  packs: { padding: space.lg, gap: space.md },
  pack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  packEmoji: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: '#FFE3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdict: { padding: space.md, borderRadius: radius.lg },
  same: { backgroundColor: colors.bondSoft },
  differ: { backgroundColor: colors.surfaceAlt },
  score: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  result: { flex: 1, alignItems: 'center', gap: space.md, paddingHorizontal: space.xl, paddingTop: space.huge },
  pair: { flexDirection: 'row' },
  overlap: { marginLeft: -space.lg },
});
