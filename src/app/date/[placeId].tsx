import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Polaroid, sceneImage } from '@/components/date/polaroid';
import { artLook, placeLook, TicketBadge } from '@/components/date/ticket';
import { Button, CharacterAvatar, InsetGroup, PressableScale, Screen, Sheet, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { shareText } from '@/lib/share';
import { datePlaceById, maxHearts } from '@/mock/dates';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, isDark, shadows, space } from '@/theme';
import type { DateRecord } from '@/types';

/** Hearts on the photo and in the reply pill (iOS systemPink, lighter on the photo). */
const HEART_ON_PHOTO = '#FF6B8A';
const PINK = isDark ? '#FF6B8A' : '#D70F4C';
const PINK_SOFT = isDark ? '#3A1520' : '#FFE3EA';

/**
 * One date, already paid for on the map (canvas "DateRound", 2026-10-22): the place's photo with
 * its ticket chip, a scene card and three answers; the friend's reply comes in as a message with
 * the hearts it earned, then Next. The end is the polaroid with the hearts and the diary page to
 * come. Leaving early ends it without one. The ticket's colour carries through the whole date.
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
  const finishDate = useAppStore((s) => s.finishDate);
  const leaveDate = useAppStore((s) => s.leaveDate);
  // Only a date paid for on the map plays here; a stray link gets the way back.
  const paid = useAppStore((s) => s.activeDate?.placeId === placeId && s.activeDate?.characterId === characterId);

  const official = datePlaceById(placeId ?? '');
  // A user's own date (F28) carries its rounds on the active date; keep them for the end screen.
  const running = useAppStore((s) => (s.activeDate?.placeId === placeId ? s.activeDate?.theme : undefined));
  // Its look comes from the saved date (the theme's id is the date's place id).
  const ownArt = useAppStore((s) => s.dateThemes.find((d) => d.id === placeId)?.art);
  const kept = useRef(running);
  if (running) kept.current = running;
  const place = official ?? kept.current;

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
  const title = official ? t(`dating.places.${official.titleKey}`) : (kept.current?.title ?? '');
  const look = official ? placeLook(official.id) : artLook(ownArt ?? '');
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
    const scenario = official ? t(`dating.scenarios.${official.titleKey}`) : title;
    setRecord(finishDate(character.id, placeId ?? '', hearts, scenario));
  };

  if (record) {
    const when = new Date(record.createdAt).toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return (
      <Screen background={colors.bg}>
        <ScrollView contentContainerStyle={[styles.end, { paddingBottom: insets.bottom + space.xl }]}>
          <Polaroid
            character={character}
            caption={t('date.caption', { place: title, name })}
            date={when}
            width={Math.min(260, width - space.xxl * 2)}
            tilt={-2}
          />
          <Txt style={styles.ending} center>
            {t(`date.ending.${record.ending}`)}
          </Txt>
          <InsetGroup style={styles.results}>
            <View style={[styles.resultRow, styles.resultLine]}>
              <View style={[styles.resultIcon, { backgroundColor: '#FF2D55' }]}>
                <Ionicons name="heart" size={17} color="#FFFFFF" />
              </View>
              <Txt style={styles.resultLabel}>{t('date.hearts')}</Txt>
              <Txt style={styles.resultValue}>{t('date.heartsOf', { n: record.hearts, max: record.maxHearts })}</Txt>
            </View>
            <View style={styles.resultRow}>
              <View style={[styles.resultIcon, { backgroundColor: '#FF9500' }]}>
                <Ionicons name="book-outline" size={17} color="#FFFFFF" />
              </View>
              <Txt style={styles.resultLabel} lines={1}>
                {t('date.diaryOf', { name })}
              </Txt>
              <Txt style={styles.resultValue}>{t('date.tomorrow')}</Txt>
            </View>
          </InsetGroup>
          <View style={styles.grow} />
          <PressableScale
            scaleTo={0.97}
            accessibilityRole="button"
            style={[styles.bigButton, { backgroundColor: look.ink }]}
            onPress={() => void shareText(t('date.shareMessage', { place: title, name }))}>
            <Ionicons name="share-outline" size={19} color="#FFFFFF" />
            <Txt style={styles.bigButtonText}>{t('date.share')}</Txt>
          </PressableScale>
          <PressableScale
            scaleTo={0.97}
            accessibilityRole="button"
            style={[styles.bigButton, styles.greyButton]}
            onPress={() => (conversation ? router.replace(`/chat/${conversation.id}`) : router.back())}>
            <Txt style={[styles.bigButtonText, styles.greyButtonText]}>{t('date.backToChat')}</Txt>
          </PressableScale>
        </ScrollView>
      </Screen>
    );
  }

  const photoH = Math.round(height * 0.4);

  return (
    <Screen background={colors.bg} edgeToEdge>
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <View style={{ height: photoH }}>
          <Image source={sceneImage(character)} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.32)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', colors.bg]}
            locations={[0, 0.3, 0.62, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.glass, styles.placeChip]}>
            <TicketBadge look={look} size={24} />
            <Txt style={styles.placeText} lines={1}>
              {title}
            </Txt>
          </View>
        </View>

        <View style={[styles.sceneCard, shadows.card]}>
          <Txt style={styles.sceneText}>{fill(scene.line)}</Txt>
          {choice ? (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.replyRow}>
              <CharacterAvatar character={character} size={28} />
              <View style={styles.bubble}>
                <Txt style={styles.bubbleText}>{fill(choice.reply)}</Txt>
              </View>
              {choice.hearts > 0 ? (
                <View style={styles.gain}>
                  <Txt style={styles.gainText}>+{choice.hearts}</Txt>
                  <Ionicons name="heart" size={12} color={PINK} />
                </View>
              ) : null}
            </Animated.View>
          ) : null}
        </View>

        <View style={styles.choices}>
          {scene.choices.map((c, index) => {
            const chosen = picked === index;
            return (
              <Pressable
                key={index}
                disabled={picked != null}
                accessibilityRole="button"
                accessibilityState={{ selected: chosen, disabled: picked != null }}
                style={[
                  styles.choice,
                  chosen && { borderColor: look.ink },
                  picked != null && !chosen && styles.choiceOff,
                ]}
                onPress={() => pick(index)}>
                <Txt style={styles.choiceText}>{fill(c.text)}</Txt>
                {chosen ? (
                  <View style={[styles.check, { backgroundColor: look.ink }]}>
                    <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <PressableScale
          style={[styles.glass, styles.close]}
          hitSlop={hitSlop}
          scaleTo={0.9}
          accessibilityLabel={t('date.leave')}
          onPress={() => setLeaving(true)}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </PressableScale>
        <View
          style={styles.progress}
          accessible
          accessibilityLabel={t('date.round', { n: round + 1, total: place.rounds.length })}>
          {place.rounds.map((_, i) => (
            <View key={i} style={[styles.segment, i <= round && styles.segmentOn]} />
          ))}
        </View>
        <View style={[styles.glass, styles.hearts]} accessibilityLabel={`${hearts}`}>
          <Ionicons name="heart" size={15} color={HEART_ON_PHOTO} />
          <Txt style={styles.heartsText}>{hearts}</Txt>
        </View>
      </View>

      {picked != null ? (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.lg) + space.md }]}>
          <PressableScale scaleTo={0.97} accessibilityRole="button" style={[styles.bigButton, { backgroundColor: look.ink }]} onPress={next}>
            <Txt style={styles.bigButtonText}>{last ? t('date.finish') : t('date.next')}</Txt>
          </PressableScale>
        </View>
      ) : null}

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
              // The date ends here, as the sheet says; the place can be booked again.
              leaveDate();
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
  // Glass on the photo: a see-through white fill with a bright rim.
  glass: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  placeChip: {
    position: 'absolute',
    left: space.lg,
    bottom: 54,
    height: 32,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // A soft shadow keeps the white name readable on a bright sky.
  placeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  sceneCard: {
    marginHorizontal: space.lg,
    marginTop: -40,
    padding: 18,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  sceneText: { fontSize: 20, lineHeight: 27, fontWeight: '500', letterSpacing: -0.3, color: colors.text },
  replyRow: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubble: {
    flexShrink: 1,
    maxWidth: 240,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 19,
    borderBottomLeftRadius: 6,
    backgroundColor: colors.bubbleOther,
  },
  bubbleText: { fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.bubbleOtherText },
  gain: {
    marginLeft: 'auto',
    height: 26,
    paddingHorizontal: 9,
    borderRadius: 13,
    backgroundColor: PINK_SOFT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  gainText: { fontSize: 13, fontWeight: '700', color: PINK },
  choices: { marginTop: space.lg, marginHorizontal: space.lg, gap: 10 },
  choice: {
    minHeight: 56,
    paddingHorizontal: space.lg,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  choiceOff: { opacity: 0.45 },
  choiceText: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: '500', letterSpacing: -0.4, color: colors.text },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  top: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  segmentOn: { backgroundColor: '#FFFFFF' },
  hearts: {
    height: 32,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heartsText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: space.lg,
    backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(242,242,247,0.86)',
  },
  bigButton: {
    alignSelf: 'stretch',
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bigButtonText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: '#FFFFFF' },
  greyButton: { marginTop: -6, backgroundColor: isDark ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)' },
  greyButtonText: { fontWeight: '600', color: colors.text },
  end: { flexGrow: 1, alignItems: 'center', gap: 16, paddingHorizontal: space.lg, paddingTop: 70 },
  ending: { marginTop: 12, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.3, color: colors.text },
  results: { alignSelf: 'stretch', marginHorizontal: 0, marginTop: 4, borderRadius: 18 },
  resultRow: { height: 52, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  resultIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  resultLabel: { flex: 1, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  resultValue: { fontSize: 17, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  leave: { gap: space.md },
});
