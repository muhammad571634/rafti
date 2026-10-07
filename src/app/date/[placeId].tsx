import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Polaroid, sceneImage } from '@/components/date/polaroid';
import { Button, PressableScale, Screen, ShellIcon, Sheet, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { shareForReward } from '@/lib/share';
import { SHARE_REWARD, todayKey } from '@/mock';
import { datePlaceById, maxHearts } from '@/mock/dates';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, gradients, hitSlop, radius, shadows, space } from '@/theme';
import type { DateRecord } from '@/types';

/**
 * One date, already paid for on the map: a few rounds of a scene line and three
 * answers, then a polaroid to keep. Leaving early ends it without one.
 */
export default function DateScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const { placeId, characterId } = useLocalSearchParams<{ placeId: string; characterId: string }>();

  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => (characterId ? s.relationships[characterId] : undefined));
  const conversation = useAppStore((s) => s.conversations.find((c) => c.characterId === characterId));
  const sharedToday = useAppStore((s) => s.daily.shareDay === todayKey());
  const finishDate = useAppStore((s) => s.finishDate);
  // Only a date paid for on the map plays here; a stray link gets the way back.
  const paid = useAppStore((s) => s.activeDate?.placeId === placeId && s.activeDate?.characterId === characterId);

  const place = datePlaceById(placeId ?? '');
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [hearts, setHearts] = useState(0);
  const [record, setRecord] = useState<DateRecord | null>(null);
  const [leaving, setLeaving] = useState(false);

  if (!place || !character || (!paid && !record)) {
    return (
      <Screen>
        <View style={styles.center}>
          <Button label={t('common.back')} onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const name = shortName(displayName(character, relationship));
  const fill = (text: string) => text.replaceAll('{name}', name);
  const title = t(`dating.places.${place.titleKey}`);
  const scene = place.rounds[round];
  const choice = picked != null ? scene.choices[picked] : null;
  const last = round === place.rounds.length - 1;

  const pick = (index: number) => {
    if (picked != null) return;
    setPicked(index);
    setHearts((h) => h + scene.choices[index].hearts);
  };

  const next = () => {
    if (!last) {
      setRound((r) => r + 1);
      setPicked(null);
      return;
    }
    setRecord(finishDate(character.id, place.id, hearts, t(`dating.scenarios.${place.titleKey}`)));
  };

  if (record) {
    const when = new Date(record.createdAt).toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return (
      <Screen background={gradients.home}>
        <ScrollView contentContainerStyle={[styles.end, { paddingBottom: insets.bottom + space.lg }]}>
          <Polaroid
            character={character}
            caption={t('date.caption', { place: title, name })}
            date={when}
            width={Math.min(280, width - space.xxl * 2)}
            style={styles.polaroid}
          />
          <Txt variant="h1" center>
            {t(`date.ending.${record.ending}`)}
          </Txt>
          <View style={styles.gains}>
            <View style={styles.gain}>
              <Txt variant="bodyStrong">
                {'\u{1F497}'} {record.hearts}/{record.maxHearts}
              </Txt>
            </View>
            <View style={styles.gain}>
              <Ionicons name="book-outline" size={18} color={colors.text} />
              <Txt variant="bodyStrong">{t('date.diaryTomorrow')}</Txt>
            </View>
          </View>
          <View style={styles.grow} />
          <Button
            label={t('date.share')}
            size="lg"
            full
            onPress={() => void shareForReward(t('date.shareMessage', { place: title, name }))}
            right={
              sharedToday ? null : (
                <View style={styles.cost}>
                  <Txt variant="bodyStrong" color={colors.textOnPrimary}>
                    +{SHARE_REWARD}
                  </Txt>
                  <ShellIcon size={16} />
                </View>
              )
            }
          />
          <Button
            label={t('date.backToChat')}
            variant="secondary"
            size="lg"
            full
            onPress={() => (conversation ? router.replace(`/chat/${conversation.id}`) : router.back())}
          />
        </ScrollView>
      </Screen>
    );
  }

  const photoH = Math.round(height * 0.4);

  return (
    <Screen background={colors.bgPlain} edgeToEdge>
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}>
        <View style={{ height: photoH }}>
          <Image source={sceneImage(character)} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['transparent', colors.bgPlain]} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
        </View>

        <View style={[styles.say, shadows.card]}>
          <View style={styles.sayHead}>
            <Txt variant="smallStrong" color={colors.brandText} style={styles.grow}>
              {choice ? name : title}
            </Txt>
            {choice && choice.hearts > 0 ? (
              <Txt variant="smallStrong" color={colors.brandText}>
                +{choice.hearts} {'\u{1F497}'}
              </Txt>
            ) : null}
          </View>
          <Txt variant="body" style={styles.sayText}>
            {fill(choice ? choice.reply : scene.line)}
          </Txt>
        </View>

        <View style={styles.choices}>
          {scene.choices.map((c, index) => {
            const chosen = picked === index;
            return (
              <PressableScale
                key={index}
                scaleTo={0.97}
                disabled={picked != null}
                accessibilityRole="button"
                accessibilityState={{ selected: chosen, disabled: picked != null }}
                style={[styles.choice, chosen && styles.choiceOn, picked != null && !chosen && styles.choiceOff]}
                onPress={() => pick(index)}>
                <Txt variant="bodyStrong">{fill(c.text)}</Txt>
              </PressableScale>
            );
          })}
          {picked != null ? (
            <Button label={last ? t('date.finish') : t('date.next')} size="lg" full onPress={next} style={styles.next} />
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <PressableScale
          style={[styles.close, shadows.card]}
          hitSlop={hitSlop}
          scaleTo={0.9}
          accessibilityLabel={t('date.leave')}
          onPress={() => setLeaving(true)}>
          <Ionicons name="close" size={22} color={colors.text} />
        </PressableScale>
        <View style={styles.dots} accessible accessibilityLabel={t('date.round', { n: round + 1, total: place.rounds.length })}>
          {place.rounds.map((_, i) => (
            <View key={i} style={[styles.dot, i <= round && styles.dotOn]} />
          ))}
        </View>
        <View style={[styles.hearts, shadows.card]}>
          <Txt variant="bodyStrong">
            {'\u{1F497}'} {hearts}
          </Txt>
        </View>
      </View>

      <Sheet visible={leaving} onClose={() => setLeaving(false)} center>
        <View style={styles.leave}>
          <Txt variant="h3" center>
            {t('date.leaveTitle', { name })}
          </Txt>
          <Txt variant="small" color={colors.textMuted} center>
            {t('date.leaveHint', { count: maxHearts(place) })}
          </Txt>
          <Button label={t('date.stay')} full onPress={() => setLeaving(false)} />
          <Button
            label={t('date.leave')}
            variant="secondary"
            full
            onPress={() => {
              setLeaving(false);
              router.back();
            }}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', left: space.lg, right: space.lg, top: 0, flexDirection: 'row', alignItems: 'center', gap: space.md },
  close: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 24, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotOn: { backgroundColor: colors.surface },
  hearts: { height: 38, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: colors.surface, justifyContent: 'center' },
  say: {
    marginHorizontal: space.lg,
    marginTop: -space.xxl,
    padding: space.lg,
    gap: space.xs,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  sayHead: { flexDirection: 'row', alignItems: 'center' },
  sayText: { fontSize: 17, lineHeight: 25 },
  choices: { padding: space.lg, gap: space.sm },
  choice: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceOff: { opacity: 0.45 },
  next: { marginTop: space.sm },
  end: { flexGrow: 1, alignItems: 'center', gap: space.lg, paddingHorizontal: space.xl, paddingTop: space.xxl },
  polaroid: { marginBottom: space.sm },
  gains: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  gain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cost: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leave: { gap: space.md },
});
