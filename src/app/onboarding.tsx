import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInRight,
  FadeInUp,
  interpolate,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { BRAND, BRAND_ASPECT } from '@/assets/brand/registry';
import { HEROES } from '@/assets/heroes/registry';
import { ICONS } from '@/assets/icons/registry';
import { LockPreview } from '@/components/notifications/lock-preview';
import { FirstHello } from '@/components/onboarding/first-hello';
import { CARD_SHADOW, STORE } from '@/components/plans/store-look';
import { AuroraGlass, CharacterAvatar, PressableScale, Screen, Sheet, Txt } from '@/components/ui';
import { LanguageList, pickLanguage } from '@/components/profile/language-list';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { getSavedLocaleSync, phrase, SUPPORTED_LOCALES } from '@/i18n';
import { shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { morningGreetings } from '@/mock';
import { pushPermission, requestPushPermission } from '@/notifications/sync';
import { useAppStore, WELCOME_SHELLS } from '@/store/use-app-store';
import { bottomRoom, aurora, colors, isDark, space, systemColors } from '@/theme';
import type { Character } from '@/types';

/** One friend from each world, so the first choice is about taste, not scrolling. */
const PICKS = ['c_kai', 'c_aurelian', 'c_sol', 'c_seren'];
const MIN_AGE = 18;
const NAME_MAX = 20;
const YEAR_ROW = 44;
const YEAR_VISIBLE = 5;
const DEFAULT_YEAR = 2000;
const STAR = 'M.5 0L.62 .38L1 .5L.62 .62L.5 1L.38 .62L0 .5L.38 .38Z';
const VIOLET = isDark ? '#B9AEFF' : '#9C8CFF';
const NOTE_BG = isDark ? 'rgba(28,28,30,0.8)' : 'rgba(255,255,255,0.72)';
const NOTE_BLOCKED = isDark ? 'rgba(255,69,58,0.18)' : 'rgba(255,59,48,0.10)';
const SMOOTH = Easing.inOut(Easing.ease);

type Step = 'intro' | 'age' | 'name' | 'meet' | 'notify' | 'gift';
const ALL_STEPS: Step[] = ['intro', 'age', 'name', 'meet', 'notify', 'gift'];

/**
 * First launch, reworked on Apple's HIG (Onboarding, Privacy, Entering data; 2026-10-29): the first
 * hello ends with Sigmazam's greeting and the one Start button, with no second hello screen. Then a
 * few short things on the aurora, one scene each: birth year (18+), name, first friend from a deck
 * of cards, notifications (only while the system has not decided; one button that opens the system
 * prompt), and a welcome gift. It ends in the first chat, where the new friend has already written.
 */
export default function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const characters = useAppStore((s) => s.characters);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const picks = useMemo(
    () => PICKS.map((id) => characters.find((c) => c.id === id)).filter((c) => c != null),
    [characters],
  );

  const [step, setStep] = useState<Step>('intro');
  // The first hello has played (or was tapped through): its last frame stays, Start comes up.
  const [played, setPlayed] = useState(false);
  // HIG Entering data: what the system already knows is not asked again.
  const [askPush, setAskPush] = useState(true);
  const asked = useRef(false);
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [name, setName] = useState('');
  const [friendId, setFriendId] = useState(PICKS[0]);
  const [notifications, setNotifications] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  // The keyboard covers the system bar, so its inset would only lift the button over the name preview.
  const keyboardUp = useKeyboardVisible();
  // Kept in state: the React Compiler caches a plain read during render, so the ✓ stayed on the launch choice.
  const [savedLang, setSavedLang] = useState(getSavedLocaleSync);

  useEffect(() => {
    void pushPermission().then((state) => {
      if (state === 'undetermined') return;
      setAskPush(false);
      setNotifications(state === 'granted');
    });
  }, []);

  const steps = useMemo(() => ALL_STEPS.filter((s) => s !== 'notify' || askPush), [askPush]);
  const questions = steps.length - 1;
  // The intro is 0, the questions 1 and up.
  const index = steps.indexOf(step);
  const friendIndex = Math.max(0, picks.findIndex((c) => c.id === friendId));
  const friend = picks[friendIndex];
  const friendName = friend ? shortName(friend.name) : '';
  const thisYear = new Date().getFullYear();
  const minor = thisYear - year < MIN_AGE;
  const trimmed = name.trim();

  const next = () => setStep(steps[Math.min(index + 1, steps.length - 1)]);
  // Once the system has asked, going back skips the notifications scene: there is nothing left to ask.
  const back = () => {
    let i = Math.max(index - 1, 1);
    if (steps[i] === 'notify' && asked.current) i = Math.max(i - 1, 1);
    setStep(steps[i]);
  };

  const finish = () => {
    if (!friend) return;
    const conversationId = completeOnboarding({
      name: trimmed,
      birthYear: year,
      characterId: friend.id,
      notifications,
      firstAsk: t('onboarding.firstAsk', { name: trimmed }),
    });
    router.replace('/(tabs)');
    router.push(`/chat/${conversationId}`);
  };

  const languageSheet = (
    <Sheet visible={langOpen} onClose={() => setLangOpen(false)} title={t('onboarding.language')} scroll>
      <LanguageList
        value={savedLang}
        groupStyle={styles.langGroup}
        onPick={(code) => {
          setSavedLang(code);
          void pickLanguage(code);
          setLangOpen(false);
        }}
      />
    </Sheet>
  );

  if (step === 'intro') {
    // HIG Onboarding: the splash opens onboarding, so it ends on the one thing to do next.
    return (
      <Screen background="aurora">
        <FirstHello onDone={() => setPlayed(true)} />
        {played ? (
          <>
            {SUPPORTED_LOCALES.length > 1 ? (
              <Animated.View entering={FadeIn.duration(300)} style={[styles.top, styles.topEnd, { top: insets.top }]}>
                <PressableScale scaleTo={0.96} accessibilityRole="button" accessibilityLabel={t('onboarding.language')} onPress={() => setLangOpen(true)}>
                  <AuroraGlass style={styles.lang}>
                    <Txt style={styles.langText}>{SUPPORTED_LOCALES.find((l) => l.code === i18n.language)?.label ?? 'English'}</Txt>
                    <Ionicons name="chevron-down" size={13} color={aurora.textMuted} />
                  </AuroraGlass>
                </PressableScale>
              </Animated.View>
            ) : null}
            <Animated.View entering={FadeInUp.duration(360)} style={[styles.introFooter, { paddingBottom: bottomRoom(insets.bottom, space.lg) + 6 }]}>
              <Cta label={t('onboarding.start')} onPress={next} />
              <Txt style={styles.caption}>{t('onboarding.legal')}</Txt>
            </Animated.View>
          </>
        ) : null}
        {languageSheet}
      </Screen>
    );
  }

  const footer = (() => {
    switch (step) {
      case 'age':
        return <Cta label={t('onboarding.continue')} disabled={minor} onPress={next} />;
      case 'name':
        return <Cta label={t('onboarding.continue')} disabled={!trimmed} onPress={next} />;
      case 'meet':
        return (
          <>
            <Cta label={t('onboarding.meet', { name: friendName })} onPress={next} />
            <Txt style={styles.caption}>{t('onboarding.meetNote')}</Txt>
          </>
        );
      case 'notify':
        // HIG Privacy, pre-alert screens: one button, it opens the system prompt, and whatever the
        // answer the flow goes on. No "Allow" wording and no way round the prompt.
        return (
          <Cta
            label={t('onboarding.continue')}
            onPress={() => {
              void requestPushPermission().then((granted) => {
                asked.current = true;
                setNotifications(granted);
                next();
              });
            }}
          />
        );
      case 'gift':
        return <Cta label={t('onboarding.sayHi', { name: friendName })} onPress={finish} />;
    }
  })();

  return (
    <Screen background="aurora">
      <View style={styles.top}>
        {/* HIG Privacy: a pre-alert screen offers no way out but the system prompt. */}
        {index > 1 && step !== 'notify' ? (
          <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('a11y.back')} onPress={back}>
            <AuroraGlass style={styles.round}>
              <Ionicons name="chevron-back" size={22} color={colors.text} style={styles.backIcon} />
            </AuroraGlass>
          </PressableScale>
        ) : (
          <View style={styles.side} />
        )}

        <View style={styles.progress} accessible accessibilityLabel={t('onboarding.step', { index, count: questions })}>
          {Array.from({ length: questions }, (_, i) => (
            <View key={i} style={[styles.segment, i < index && styles.segmentOn]} />
          ))}
        </View>

        <View style={styles.side} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <Animated.View key={step} entering={FadeInRight.duration(360)} style={styles.flex}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.page}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {step === 'age' ? (
              <>
                <Title title={t('onboarding.ageTitle')} body={t('onboarding.ageBody')} />
                <View style={styles.wheelWrap}>
                  {/* Peeks over the card's edge: drawn first, so the card hides the cut. */}
                  <Animated.View entering={FadeInUp.delay(200).springify().damping(14)} style={styles.peek}>
                    <Image source={BRAND.peek} style={StyleSheet.absoluteFill} contentFit="contain" />
                  </Animated.View>
                  <View style={styles.card}>
                    <YearWheel value={year} min={1940} max={thisYear} onChange={setYear} />
                  </View>
                </View>
                <View style={[styles.note, minor && styles.noteBlocked]}>
                  <Ionicons name="lock-closed-outline" size={17} color={minor ? systemColors.red : aurora.textMuted} />
                  <Txt style={[styles.noteText, minor && styles.noteTextBlocked]}>
                    {minor ? t('onboarding.ageBlocked') : t('onboarding.ageNote')}
                  </Txt>
                </View>
              </>
            ) : null}

            {step === 'name' ? (
              <>
                <Title title={t('onboarding.nameTitle')} body={t('onboarding.nameBody')} />
                <View style={[styles.card, styles.field]}>
                  <TextInput
                    value={name}
                    onChangeText={(v) => setName(v.slice(0, NAME_MAX))}
                    placeholder={t('onboarding.namePlaceholder')}
                    placeholderTextColor={colors.textFaint}
                    autoFocus
                    autoCapitalize="words"
                    autoComplete="given-name"
                    returnKeyType="next"
                    onSubmitEditing={() => trimmed && next()}
                    accessibilityLabel={t('onboarding.namePlaceholder')}
                    style={styles.input}
                  />
                  <Txt style={styles.count}>
                    {name.length}/{NAME_MAX}
                  </Txt>
                </View>
                {friend ? (
                  <View style={styles.preview}>
                    <CharacterAvatar character={friend} size={40} />
                    {/* Pops in again when the first letter arrives (and when the field empties). */}
                    <Animated.View key={trimmed ? 'named' : 'empty'} entering={ZoomIn.springify().damping(14)} style={[styles.card, styles.bubble]}>
                      <Txt style={styles.bubbleText}>{t('onboarding.namePreview', { name: trimmed || t('onboarding.nameYou') })}</Txt>
                    </Animated.View>
                  </View>
                ) : null}
              </>
            ) : null}

            {step === 'meet' ? (
              <>
                <Title title={t('onboarding.meetTitle')} body={t('onboarding.meetBody')} />
                <Deck picks={picks} selected={friendIndex} height={height} onSelect={(i) => setFriendId(picks[i].id)} />
                <View style={styles.faces} accessibilityRole="radiogroup">
                  {picks.map((c, i) => {
                    const on = i === friendIndex;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setFriendId(c.id)}
                        accessibilityRole="radio"
                        accessibilityLabel={c.name}
                        accessibilityState={{ checked: on }}
                        style={[styles.face, on && styles.faceOn]}>
                        <CharacterAvatar character={c} size={40} />
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {step === 'notify' && friend ? (
              <>
                <Title title={t('onboarding.notifyTitle', { name: friendName })} body={t('onboarding.notifyBody')} />
                <LockPreview
                  at="7:30"
                  day={tomorrow().toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}
                  character={friend}
                  name={friend.name}
                  line={morningGreetings[0]}
                  dropIn
                  style={styles.lock}
                />
                <View style={styles.perks}>
                  <Perk text={t('onboarding.notifyPerkMorning')} />
                  <Perk text={t('onboarding.notifyPerkPlan')} />
                </View>
              </>
            ) : null}

            {step === 'gift' ? (
              <View style={styles.hello}>
                <GiftArt height={height} />
                <Animated.View entering={FadeInUp.delay(550).duration(400)}>
                  <Txt style={styles.plus}>+{WELCOME_SHELLS}</Txt>
                </Animated.View>
                <Animated.View entering={FadeInUp.delay(700).duration(400)} style={styles.giftText}>
                  <Txt style={[styles.body, styles.center]}>{t('onboarding.giftBody')}</Txt>
                  <View style={styles.facts}>
                    <Txt style={[styles.card, styles.fact]}>{t('onboarding.giftDaily')}</Txt>
                    <Txt style={[styles.card, styles.fact]}>{t('onboarding.giftKeep')}</Txt>
                  </View>
                </Animated.View>
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>

        <View style={[styles.footer, { paddingBottom: keyboardUp ? space.sm : bottomRoom(insets.bottom, space.lg) + 6 }]}>{footer}</View>
      </KeyboardAvoidingView>

    </Screen>
  );
}

/** The Store's peach button. */
function Cta({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <PressableScale scaleTo={0.97} disabled={disabled} onPress={onPress} accessibilityRole="button" style={styles.cta}>
      <Txt style={styles.ctaText} lines={1}>
        {label}
      </Txt>
    </PressableScale>
  );
}

function Title({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.titleBlock}>
      <Txt style={styles.title} accessibilityRole="header">
        {title}
      </Txt>
      <Txt style={styles.body}>{body}</Txt>
    </View>
  );
}

function Perk({ text }: { text: string }) {
  return (
    <View style={styles.perk}>
      <Ionicons name="checkmark" size={18} color={aurora.tint} />
      <Txt style={[styles.noteText, styles.flex]}>{text}</Txt>
    </View>
  );
}

/** A slow float (and a little sway) for a mascot pose; still under Reduce Motion. */
function useFloat(distance: number) {
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    y.value = withRepeat(withSequence(withTiming(-distance, { duration: 1500, easing: SMOOTH }), withTiming(0, { duration: 1500, easing: SMOOTH })), -1);
  }, [reduceMotion, distance, y]);
  return useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${-2 + (y.value / -distance) * 4}deg` }],
  }));
}

/** Gift: Sigmazam hugging a heart, sparks bursting over its head (no shell here: the owner asked, 2026-10-24). */
function GiftArt({ height }: { height: number }) {
  const art = Math.round(Math.min(136, Math.max(110, height * 0.16)));
  const float = useFloat(8);
  return (
    <View style={[styles.giftArt, { height: art * 1.8 }]}>
      {Array.from({ length: 8 }, (_, i) => (
        <GiftSpark key={i} index={i} />
      ))}
      <Animated.View style={[{ width: art, height: art / BRAND_ASPECT.love }, float]}>
        <Image source={BRAND.love} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel="Sigmazam" />
      </Animated.View>
    </View>
  );
}

function GiftSpark({ index }: { index: number }) {
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (!reduceMotion) p.value = withDelay(250, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [reduceMotion, p]);
  const angle = (index * 45 * Math.PI) / 180;
  const r = index % 2 ? 92 : 124;
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.3 ? p.value / 0.3 : 1 - (p.value - 0.3) / 0.7,
    transform: [{ translateX: Math.cos(angle) * r * p.value }, { translateY: Math.sin(angle) * r * p.value }, { scale: 0.2 + 0.8 * p.value }, { rotate: `${90 * p.value}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.giftSpark, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 1 1">
        <Path d={STAR} fill={index % 3 === 1 ? VIOLET : aurora.tint} />
      </Svg>
    </Animated.View>
  );
}

/** The four friends as a stack of portrait cards; a tap brings the next one to the front. */
function Deck({ picks, selected, height, onSelect }: { picks: Character[]; selected: number; height: number; onSelect: (i: number) => void }) {
  const cardH = Math.round(Math.min(340, Math.max(230, height - 500)));
  const cardW = Math.round(cardH * 0.794);
  return (
    // As wide as the front card, so it sits centred; the cards behind fan out past its right edge.
    <View style={[styles.deck, { width: cardW, height: cardH + 30 }]}>
      {picks.map((c, i) => (
        <DeckCard
          key={c.id}
          character={c}
          depth={(i - selected + picks.length) % picks.length}
          width={cardW}
          height={cardH}
          onPress={() => onSelect((selected + 1) % picks.length)}
        />
      ))}
    </View>
  );
}

function DeckCard({ character, depth, width, height, onPress }: { character: Character; depth: number; width: number; height: number; onPress: () => void }) {
  const d = useSharedValue(depth);
  useEffect(() => {
    d.value = withTiming(depth, { duration: 380, easing: Easing.bezier(0.3, 0.7, 0.3, 1) });
  }, [depth, d]);
  const style = useAnimatedStyle(() => ({
    opacity: d.value <= 2 ? 1 : 1 - (d.value - 2),
    transform: [{ translateX: d.value * 16 }, { translateY: d.value * -8 + 22 }, { rotate: `${d.value * 4}deg` }, { scale: 1 - d.value * 0.05 }],
  }));
  return (
    <Animated.View style={[styles.deckCard, { width, height, zIndex: 10 - depth }, style]}>
      <Pressable
        onPress={onPress}
        disabled={depth !== 0}
        accessibilityRole="button"
        accessibilityLabel={`${character.name}${character.series ? `, ${phrase(character.series)}` : ''}`}
        style={StyleSheet.absoluteFill}>
        <Image source={HEROES[character.id] ?? character.avatarUri} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']} style={styles.deckShade} />
        <View style={styles.deckText}>
          <View style={styles.deckChip}>
            <Txt style={styles.deckChipText} lines={1}>
              {character.series ? phrase(character.series) : ''}
            </Txt>
          </View>
          <Txt style={styles.deckName} lines={1}>
            {shortName(character.name)}
          </Txt>
          <Txt style={styles.deckLine} lines={3}>
            {`“${character.greeting}”`}
          </Txt>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** A snapping column of years, newest on top; the row in the band is the answer. */
function YearWheel({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (year: number) => void;
}) {
  const years = useMemo(() => Array.from({ length: max - min + 1 }, (_, i) => max - i), [min, max]);
  const ref = useAnimatedRef<Animated.ScrollView>();
  const pad = YEAR_ROW * Math.floor(YEAR_VISIBLE / 2);
  // Set once: on Android a new `contentOffset` scrolls there, which yanked the wheel to each year mid-drag.
  const [startOffset] = useState(() => ({ x: 0, y: years.indexOf(value) * YEAR_ROW }));
  const scrollY = useSharedValue(startOffset.y);

  // Start on the current answer; `contentOffset` alone is ignored on web.
  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ y: startOffset.y, animated: false }), 0);
    return () => clearTimeout(id);
  }, [ref, startOffset]);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // A tick per year as it reaches the band, as the system's wheels do (HIG Playing haptics).
  const reach = (i: number) => {
    haptic.selection();
    onChange(years[Math.max(0, Math.min(years.length - 1, i))]);
  };
  useAnimatedReaction(
    () => Math.round(scrollY.value / YEAR_ROW),
    (i, prev) => {
      if (prev !== null && i !== prev) scheduleOnRN(reach, i);
    },
  );

  // The band's bold years ride the scroll on the UI thread, clipped to the band (as UIPickerView draws
  // it), so the answer never trails the finger.
  const bandYears = useAnimatedStyle(() => ({ transform: [{ translateY: -scrollY.value }] }));

  return (
    <View style={styles.wheel}>
      <Animated.ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        snapToInterval={YEAR_ROW}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: pad }}
        contentOffset={startOffset}
        onScroll={onScroll}
        scrollEventThrottle={16}
        accessibilityLabel={String(value)}>
        {years.map((y, i) => (
          <WheelYear key={y} year={y} index={i} scrollY={scrollY} onPress={() => ref.current?.scrollTo({ y: i * YEAR_ROW, animated: true })} />
        ))}
      </Animated.ScrollView>
      <View pointerEvents="none" style={[styles.band, styles.bandCover, { top: pad }]}>
        <View style={[StyleSheet.absoluteFill, styles.bandFill]} />
        <Animated.View style={bandYears}>
          {years.map((y) => (
            <View key={y} style={styles.yearRow}>
              <Txt style={[styles.year, styles.yearOn]}>{y}</Txt>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

/** A year outside the band: full size next to it, smaller and fainter further out, following the scroll. */
function WheelYear({ year, index, scrollY, onPress }: { year: number; index: number; scrollY: SharedValue<number>; onPress: () => void }) {
  const fade = useAnimatedStyle(() => {
    const d = Math.abs(scrollY.value / YEAR_ROW - index);
    return {
      // Half the muted colour reads as the faint one, on the light card and on the dark one.
      opacity: interpolate(d, [1, 2], [1, 0.5], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(d, [1, 2], [1, 19 / 21], Extrapolation.CLAMP) }],
    };
  });
  return (
    <PressableScale scaleTo={1} style={styles.yearRow} onPress={onPress}>
      <Animated.View style={fade}>
        <Txt style={[styles.year, styles.yearSide]}>{year}</Txt>
      </Animated.View>
    </PressableScale>
  );
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

const PEEK_W = 120;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  top: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.md },
  side: { width: 40 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backIcon: { marginLeft: -2 },
  progress: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  segment: { width: 28, height: 5, borderRadius: 3, backgroundColor: aurora.glassOn },
  segmentOn: { backgroundColor: aurora.tint },
  lang: { height: 32, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, borderRadius: 16 },
  langText: { fontSize: 13, fontWeight: '600', color: colors.text },
  page: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: space.lg },
  titleBlock: { gap: space.sm },
  // HIG Typography: Large Title 34/41 bold for the question, Body 17/22 under it.
  title: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.4, color: colors.text },
  body: { fontSize: 17, lineHeight: 22, color: aurora.textMuted },
  hello: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topEnd: { position: 'absolute', top: 0, left: 0, right: 0, justifyContent: 'flex-end' },
  introFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, gap: space.sm },
  card: { borderRadius: 26, backgroundColor: aurora.card, ...CARD_SHADOW },
  wheelWrap: { marginTop: 88 },
  peek: { position: 'absolute', right: 18, top: -82, width: PEEK_W, height: PEEK_W / BRAND_ASPECT.peek },
  wheel: { height: YEAR_ROW * YEAR_VISIBLE, marginVertical: 5 },
  band: { position: 'absolute', left: 12, right: 12, height: YEAR_ROW, borderRadius: 12, backgroundColor: systemColors.fill },
  yearRow: { height: YEAR_ROW, alignItems: 'center', justifyContent: 'center' },
  bandCover: { overflow: 'hidden', backgroundColor: aurora.card },
  bandFill: { backgroundColor: systemColors.fill },
  year: { fontWeight: '500', fontVariant: ['tabular-nums'] },
  yearOn: { fontWeight: '700', fontSize: 26, color: colors.text },
  yearSide: { fontSize: 21, color: aurora.textMuted },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, marginTop: 14, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, backgroundColor: NOTE_BG },
  noteBlocked: { backgroundColor: NOTE_BLOCKED },
  noteText: { flex: 1, fontSize: 15, lineHeight: 20, color: aurora.textMuted },
  noteTextBlocked: { color: systemColors.red },
  field: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, height: 60, marginTop: 28, paddingHorizontal: 18, borderRadius: 20 },
  input: { flex: 1, minWidth: 0, fontSize: 20, fontWeight: '600', color: colors.text, paddingVertical: 0 },
  count: { fontSize: 13, color: aurora.textMuted, fontVariant: ['tabular-nums'] },
  preview: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm + 2, marginTop: 36 },
  bubble: { flexShrink: 1, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 21, borderBottomLeftRadius: 6, transformOrigin: '0% 100%' },
  bubbleText: { fontSize: 17, lineHeight: 22, color: colors.text },
  deck: { alignSelf: 'center', marginTop: space.sm },
  deckCard: { position: 'absolute', left: 0, top: 0, borderRadius: 28, overflow: 'hidden', backgroundColor: '#222222', shadowColor: '#28143C', shadowOpacity: 0.22, shadowRadius: 17, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  deckShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '58%' },
  deckText: { position: 'absolute', left: 18, right: 18, bottom: 18, gap: 6 },
  deckChip: { alignSelf: 'flex-start', height: 22, paddingHorizontal: 9, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center' },
  deckChipText: { fontSize: 12, fontWeight: '600', color: colors.white },
  deckName: { fontSize: 26, lineHeight: 30, fontWeight: '800', color: colors.white },
  deckLine: { fontSize: 15, lineHeight: 20, color: 'rgba(255,255,255,0.92)' },
  faces: { flexDirection: 'row', justifyContent: 'center', gap: space.md, marginTop: space.md },
  face: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  faceOn: { borderColor: aurora.tint },
  lock: { marginHorizontal: 0, marginTop: 22 },
  perks: { marginTop: space.lg, gap: space.sm + 2 },
  perk: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm + 2 },
  // The pose sits at the bottom of the box; the sparks burst from just above its head.
  giftArt: { width: 300, alignItems: 'center', justifyContent: 'flex-end' },
  giftSpark: { position: 'absolute', top: 30, left: 144, width: 12, height: 12 },
  plus: { fontSize: 46, lineHeight: 52, fontWeight: '800', color: STORE.peachInk, fontVariant: ['tabular-nums'] },
  giftText: { alignItems: 'center', gap: 14, marginTop: space.xs, maxWidth: 300 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  fact: { overflow: 'hidden', borderRadius: 15, paddingHorizontal: 12, paddingVertical: 6, fontSize: 13, fontWeight: '600', color: aurora.textMuted },
  footer: { paddingHorizontal: 20, paddingTop: space.sm, gap: space.sm },
  cta: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg, backgroundColor: STORE.cta },
  ctaText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: STORE.ctaInk },
  caption: { fontSize: 12, lineHeight: 16, textAlign: 'center', color: aurora.textMuted },
  // Rows straight on the sheet, no card inside the card.
  langGroup: { marginHorizontal: 0, borderRadius: 0, backgroundColor: 'transparent' },
});
