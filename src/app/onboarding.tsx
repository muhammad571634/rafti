import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { type ComponentRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutUp,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { HEROES } from '@/assets/heroes/registry';
import { PORTRAITS } from '@/assets/portraits/registry';
import { portraitPosition } from '@/components/chat/chat-ground';
import { InkText } from '@/components/ink';
import { NightDeck } from '@/components/onboarding/night-deck';
import { FriendGift } from '@/components/onboarding/friend-gift';
import { MoonOrbit, NightMoon } from '@/components/onboarding/night-moon';
import { EASE_IN_OUT, EASE_OUT, type MoonPlace, moonPlaces, slowFor } from '@/components/onboarding/night-motion';
import { NightSky } from '@/components/onboarding/night-sky';
import { NightYearWheel, type YearWheelHandle } from '@/components/onboarding/night-year-wheel';
import { useAiConsent } from '@/components/privacy/use-ai-consent';
import { LanguageList, pickLanguage } from '@/components/profile/language-list';
import { Anim, PressableScale, Sheet } from '@/components/ui';
import { characterImage } from '@/components/ui/avatar';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { getSavedLocaleSync, SUPPORTED_LOCALES } from '@/i18n';
import { localCharacter } from '@/i18n/content';
import { shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { deckForHour, greetingKeys, isQuietHour, partOfDay } from '@/lib/night-hour';
import { firstName, NAME_MAX } from '@/lib/profile';
import { useAppStore, WELCOME_SHELLS } from '@/store/use-app-store';
import { bottomRoom, night, NightScope, space } from '@/theme';
import { ink, inkGutter, inkRadius, inkType } from '@/theme/ink';
import type { Character, Pronouns } from '@/types';
import { track } from '@/lib/analytics';

/** The four people most talk to (docs/cast-2.md §5): two for her, two for him; the hour picks who leads (`deckForHour`). */
const PICKS = ['c_milo', 'c_caleb', 'c_mia', 'c_sam'];
const MIN_AGE = 18;
const MIN_YEAR = 1930;
const DEFAULT_YEAR = 2000;
const HEADER = 44;
const BUDDY = 68;

// Order (audit 2026-11-15 §10): the friend is picked before the name, so that friend greets you by it.
// No notifications scene (§6.4): the friend asks in the chat after the first real exchange.
type Step = 'intro' | 'age' | 'friend' | 'name' | 'gender' | 'gift';
const STEPS: Step[] = ['intro', 'age', 'friend', 'name', 'gender', 'gift'];
const QUESTIONS = STEPS.length - 1;
const GENDERS: { value: Pronouns; label: string }[] = [
  { value: 'she', label: 'onboarding.genderShe' },
  { value: 'he', label: 'onboarding.genderHe' },
  { value: 'they', label: 'onboarding.genderThey' },
];

/** Developer and preview builds, as in Profile. */
const SHOW_DEV = __DEV__ || Updates.channel === 'preview';

/**
 * Onboarding is a one-way door: a link to it (`sigmazam://onboarding`) after it is done lands on
 * the tabs instead of starting over. Read once on mount, so finishing here (which sets
 * `onboardedAt` and then navigates on its own) never races this redirect.
 */
export default function OnboardingRoute() {
  // Dev / preview only: `sigmazam://onboarding?preview=1` walks the flow on an onboarded phone; its last
  // button goes back instead of creating a profile, so nothing of the account changes.
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const [done] = useState(() => !!useAppStore.getState().user.onboardedAt);
  if (SHOW_DEV && preview === '1') return <OnboardingScreen preview />;
  if (done) return <Redirect href="/(tabs)" />;
  return <OnboardingScreen />;
}

/**
 * The first run as one night scene (0z250, `docs/prototypes/onboarding-motion.html`, owner's yes
 * 2026-11-16): the moon is the progress (a crescent that fills one answer at a time and is full on
 * the gift), the night tilts up as you go, the picked friend's colour rises on the horizon, the
 * picked card becomes the face that greets you by name, that friend gives the welcome gift (their
 * picture fills the last step, `FriendGift`, owner 2026-11-17), and the white pill turns into the
 * first chat's message field. The hour sets the greeting, who leads
 * the deck and how lively the sky is (quiet after midnight).
 */
function OnboardingScreen({ preview = false }: { preview?: boolean }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();

  const characters = useAppStore((s) => s.characters);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const consent = useAiConsent();

  // The hour of the first launch holds for the whole run (the scene never flips mid-way).
  const [part] = useState(() => partOfDay(new Date().getHours()));
  const quiet = isQuietHour(part);
  const k = slowFor(quiet);

  // In the screen language (the deck's quote and relation), again when the language chip changes it.
  const lang = i18n.language;
  const picks = useMemo(
    () => PICKS.map((id) => characters.find((c) => c.id === id)).filter((c) => c != null).map((c) => localCharacter(c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [characters, lang],
  );
  const [order, setOrder] = useState(() => deckForHour(PICKS, part));
  const cards = useMemo(() => order.map((id) => picks.find((c) => c.id === id)).filter((c): c is Character => c != null), [order, picks]);
  const friend = cards[0];
  const friendName = friend ? shortName(friend.name) : '';
  const hue = friend ? night.friendAccent(friend.id).strong : ink.text;

  const [step, setStep] = useState<Step>('intro');
  const [dir, setDir] = useState<1 | -1>(1);
  // Where new people stop (analytics.onboarding); the dev walk-through on an onboarded phone does not count.
  useEffect(() => {
    if (!preview) track('onboarding_step', { step });
  }, [preview, step]);
  // HIG Entering data: what the system already knows is not asked again.
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState<Pronouns | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  // Kept in state: the React Compiler caches a plain read during render, so the ✓ stayed on the launch choice.
  const [savedLang, setSavedLang] = useState(getSavedLocaleSync);
  const [handoff, setHandoff] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  // "Say hi" lights up once the gift has settled (`FriendGift` onReady), so a fast tap cannot skip it.
  const [giftReady, setGiftReady] = useState(false);
  const markGiftReady = useCallback(() => setGiftReady(true), []);
  const busy = useRef(false);
  const wheel = useRef<YearWheelHandle>(null);
  const frontRef = useRef<ComponentRef<typeof View>>(null);
  // The keyboard covers the system bar, so its inset would only lift the button over the field.
  const keyboardUp = useKeyboardVisible();

  const index = STEPS.indexOf(step);
  const thisYear = new Date().getFullYear();
  const minor = thisYear - year < MIN_AGE;
  const trimmed = name.trim();
  // The friend greets them by their first name, as people do; the profile keeps the whole name.
  const called = firstName(trimmed);

  const places = useMemo(() => moonPlaces(width, height, insets.top), [width, height, insets.top]);
  // On the gift the friend's picture takes the stage; the full moon stays small in the header.
  const moonPlace: MoonPlace = leaving ? 'gone' : step === 'intro' ? 'hero' : 'header';
  const footerRoom = space.sm + 56 + bottomRoom(insets.bottom, space.lg) + 6;
  const phase = step === 'intro' ? 0.12 : index / QUESTIONS;
  const contentTop = insets.top + 8 + HEADER + 16;
  const buddyTop = contentTop;

  const go = useCallback(
    (to: Step, d: 1 | -1 = 1) => {
      if (busy.current) return;
      busy.current = true;
      setDir(d);
      if (to === 'gift') setGiftReady(false);
      setStep(to);
      // One step at a time: a second tap mid-change would skip a scene.
      setTimeout(() => (busy.current = false), 420);
    },
    [],
  );
  const back = useCallback(() => {
    if (handoff || leaving) return;
    go(STEPS[Math.max(0, index - 1)], -1);
  }, [go, handoff, leaving, index]);

  // Android's own Back goes where the arrow goes; on the intro it leaves, as on any first screen.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'intro') return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [step, back]);

  // The picked card becomes the face that will greet you: measure it, then fly a copy into the avatar.
  const chooseFriend = () => {
    if (!friend || busy.current) return;
    haptic.tap();
    const node = frontRef.current;
    if (!node || reduce) return go('name');
    node.measureInWindow((x, y, w, h) => {
      if (w > 0) setHandoff({ x, y, w, h });
      go('name');
    });
  };

  // HIG Onboarding: one tap answers; the ✓ shows for a beat, then the next scene.
  const choosePronouns = (value: Pronouns) => {
    haptic.selection();
    setPronouns(value);
    setTimeout(() => go('gift'), 300);
  };

  const finish = () => {
    // The age gate again at the door: nobody under 18 gets a profile, whatever the steps did.
    if (!friend || leaving || !giftReady || new Date().getFullYear() - year < MIN_AGE) return;
    haptic.tap();
    setLeaving(true);
    setTimeout(() => {
      if (preview) {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)');
        return;
      }
      const conversationId = completeOnboarding({
        name: trimmed,
        birthYear: year,
        pronouns: pronouns ?? 'they',
        characterId: friend.id,
        // Morning and evening hellos stay on; they reach the phone once the system allows pushes.
        notifications: true,
        firstAsk: t('onboarding.firstAsk', { name: called }),
      });
      router.replace('/(tabs)');
      // `via` makes the chat fade in over the morph (its route options), so the field stays where the pill was.
      router.push({ pathname: '/chat/[id]', params: { id: conversationId, via: 'welcome' } });
    }, (reduce ? 120 : 520) * k);
  };

  const pill = (() => {
    switch (step) {
      case 'intro':
        return { label: t('onboarding.start'), onPress: () => go('age') };
      case 'age':
        return {
          label: t('onboarding.continue'),
          disabled: minor,
          // The drum's live year decides, not the last one it reported (Android can report late).
          onPress: () => {
            const live = wheel.current?.year() ?? year;
            if (live !== year) setYear(live);
            if (thisYear - live < MIN_AGE) return haptic.error();
            // The AI ask (App Store 5.1.2(i)) once the age is through, so nobody under 18 sees it; the
            // walk-through on an onboarded phone already has the answer.
            if (consent.agreed || preview) go('friend');
            else consent.ask(() => go('friend'), true);
          },
        };
      case 'friend':
        return { label: t('onboarding.choose', { name: friendName }), onPress: chooseFriend };
      case 'name':
        return { label: t('onboarding.continue'), disabled: !trimmed, onPress: () => go('gender') };
      case 'gender':
        return { label: t('onboarding.continue'), disabled: !pronouns, onPress: () => go('gift') };
      case 'gift':
        return { label: t('onboarding.sayHi', { name: friendName }), disabled: !giftReady, onPress: finish };
    }
  })();

  const enter = reduce
    ? FadeIn.duration(200)
    : (dir > 0 ? FadeInUp : FadeInDown).duration(520 * k).delay(160 * k).easing(EASE_OUT);
  const exit = reduce ? FadeOut.duration(150) : (dir > 0 ? FadeOutUp : FadeOutDown).duration(220).easing(EASE_OUT);
  const greeting = greetingKeys(part);

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

  return (
    <NightScope.Provider value>
      <View style={styles.root}>
        <NightSky part={part} step={index} dawn={index >= 2 && !leaving ? hue : null} dim={leaving} />
        <MoonOrbit visible={step === 'intro'} cx={places.hero.x} cy={places.hero.y} quiet={quiet} />
        {step === 'gift' && friend ? (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(300)} style={StyleSheet.absoluteFill} pointerEvents="none">
            <FriendGift
              picture={faceSource(friend) ?? ''}
              position={HEROES[friend.id] ? undefined : portraitPosition(friend.id, width / Math.round(height * 0.64))}
              name={friendName}
              hello={t('onboarding.namePreview', { name: called })}
              amount={WELCOME_SHELLS}
              line={t('onboarding.gift')}
              hue={hue}
              quiet={quiet}
              leaving={leaving}
              screenHeight={height}
              bottom={footerRoom + space.lg}
              onReady={markGiftReady}
            />
          </Animated.View>
        ) : null}
        {/* Over the gift's picture: the full moon with its full ring is the "done" at the last step. */}
        <NightMoon place={moonPlace} places={places} phase={phase} quiet={quiet} />

        {/* The header: back on the left; the moon and its ring in the middle are the progress (no numbers, owner 2026-11-17). */}
        {index > 0 && !leaving ? (
          <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(200)} style={[styles.header, { top: insets.top + 8 }]}>
            <PressableScale scaleTo={0.92} accessibilityRole="button" accessibilityLabel={t('a11y.back')} onPress={back} style={styles.round}>
              <Ionicons name="chevron-back" size={22} color={ink.text} style={styles.backIcon} />
            </PressableScale>
            {/* Screen readers still hear "Step 2 of 5" where the numbers were. */}
            <View accessible accessibilityLabel={t('onboarding.step', { index, count: QUESTIONS })} style={styles.stepSpot} />
          </Animated.View>
        ) : null}

        {step === 'intro' && SUPPORTED_LOCALES.length > 1 ? (
          <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(200)} style={[styles.langChipBox, { top: insets.top + 8 }]}>
            <PressableScale scaleTo={0.96} accessibilityRole="button" accessibilityLabel={t('onboarding.language')} onPress={() => setLangOpen(true)} style={styles.langChip}>
              <Ionicons name="globe-outline" size={17} color={ink.text} />
              <InkText variant="subStrong" lines={1}>
                {SUPPORTED_LOCALES.find((l) => l.code === i18n.language)?.label ?? 'English'}
              </InkText>
            </PressableScale>
          </Animated.View>
        ) : null}

        {friend ? <Buddy friend={friend} show={(step === 'name' || step === 'gender') && !handoff} top={buddyTop} /> : null}
        {friend && step === 'name' && !handoff ? <Greeting top={buddyTop} name={called} quiet={quiet} /> : null}

        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <View style={styles.flex}>
            <Animated.View
              key={step}
              entering={enter}
              exiting={exit}
              style={[styles.page, { paddingTop: step === 'name' || step === 'gender' ? contentTop + BUDDY + 22 : contentTop }]}>
              {step === 'intro' ? (
                <View style={styles.bottomed}>
                  <InkText variant="display" center>
                    {t(greeting.title)}
                  </InkText>
                  <InkText variant="sub" center style={styles.introLine}>
                    {t(greeting.line)}
                  </InkText>
                </View>
              ) : null}

              {step === 'age' ? (
                <>
                  <InkText variant="display">{t('onboarding.ageTitle')}</InkText>
                  <View style={styles.wheelRoom}>
                    <NightYearWheel initial={year} min={MIN_YEAR} max={thisYear} minAge={MIN_AGE} onChange={setYear} handle={wheel} />
                  </View>
                  <InkText variant="footnote" center color={minor ? '#FF8A82' : ink.text2} style={styles.note}>
                    {minor ? t('onboarding.ageBlocked') : t('onboarding.ageNote')}
                  </InkText>
                </>
              ) : null}

              {step === 'friend' ? (
                <>
                  <InkText variant="display">{t('onboarding.meetTitle')}</InkText>
                  <NightDeck cards={cards} onOrder={setOrder} frontRef={frontRef} />
                  <InkText variant="footnote" center style={styles.note}>
                    {t('onboarding.meetNote')}
                  </InkText>
                </>
              ) : null}

              {step === 'name' ? (
                <>
                  <InkText variant="display">{t('onboarding.nameTitle', { name: friendName })}</InkText>
                  <View style={styles.field}>
                    <TextInput
                      value={name}
                      onChangeText={(v) => setName(v.slice(0, NAME_MAX))}
                      placeholder={t('onboarding.namePlaceholder')}
                      placeholderTextColor={ink.placeholder}
                      selectionColor={hue}
                      autoFocus
                      autoCapitalize="words"
                      autoComplete="given-name"
                      returnKeyType="next"
                      onSubmitEditing={() => trimmed && go('gender')}
                      accessibilityLabel={t('onboarding.namePlaceholder')}
                      style={styles.input}
                    />
                    {name.length >= NAME_MAX - 5 ?<InkText variant="footnote" color={ink.text3}>{`${name.length}/${NAME_MAX}`}</InkText> : null}
                  </View>
                </>
              ) : null}

              {step === 'gender' ? (
                <>
                  <InkText variant="display">{t('onboarding.genderTitle', { name: friendName })}</InkText>
                  <View style={styles.rows} accessibilityRole="radiogroup">
                    {GENDERS.map((g, i) => (
                      <Pressable
                        key={g.value}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: pronouns === g.value }}
                        onPress={() => choosePronouns(g.value)}
                        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                        <View style={[styles.rowBody, i > 0 && styles.rowLine]}>
                          <InkText variant="body">{t(g.label)}</InkText>
                          <Radio on={pronouns === g.value} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

            </Animated.View>
          </View>

          <View style={[styles.footer, { paddingBottom: keyboardUp ? space.sm : bottomRoom(insets.bottom, space.lg) + 6 }]}>
            <MorphPill label={pill.label} disabled={pill.disabled} onPress={pill.onPress} leaving={leaving} bottomShift={keyboardUp ? 0 : bottomRoom(insets.bottom, space.lg) + 6 - bottomRoom(insets.bottom, space.md)} quiet={quiet} />
            {step === 'intro' ? (
              <Animated.View exiting={FadeOut.duration(200)}>
                <InkText variant="caption" center color={ink.text3} style={styles.legal}>
                  {t('onboarding.legal')}
                </InkText>
              </Animated.View>
            ) : null}
          </View>
        </KeyboardAvoidingView>

        {handoff && friend ? <Handoff from={handoff} to={{ x: inkGutter, y: buddyTop, w: BUDDY, h: BUDDY }} friend={friend} onDone={() => setHandoff(null)} /> : null}
        {languageSheet}
      </View>
    </NightScope.Provider>
  );
}

/** The portrait the deck shows, framed for a given shape. */
const faceSource = (c: Character) => HEROES[c.id] ?? PORTRAITS[c.id] ?? characterImage(c);

/** The friend the user picked, on the name and address steps: their face in their colour's ring. */
function Buddy({ friend, show, top }: { friend: Character; show: boolean; top: number }) {
  const o = useSharedValue(0);
  useEffect(() => {
    // Shown at once when the card lands on it (the hand-off already moved), faded when leaving.
    o.set(show ? 1 : withTiming(0, { duration: 220 }));
  }, [show, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  const hue = night.friendAccent(friend.id).strong;
  return (
    <Animated.View pointerEvents="none" style={[styles.buddy, { top, borderColor: hue }, style]}>
      {/* The square avatar, drawn around the face (a crop of the scene showed Milo's hoodie, A51). */}
      <Image source={characterImage(friend) ?? faceSource(friend)} style={styles.buddyImage} contentFit="cover" />
    </Animated.View>
  );
}

/**
 * The friend answers while you type: typing dots as the letters come, then "Hey {name}! Finally."
 * once you pause. The first alive moment of the product (audit §10).
 */
function Greeting({ top, name, quiet }: { top: number; name: string; quiet: boolean }) {
  const { t } = useTranslation();
  const [said, setSaid] = useState(name);
  useEffect(() => {
    if (!name) {
      setSaid('');
      return;
    }
    const id = setTimeout(() => setSaid(name), 700 * slowFor(quiet));
    return () => clearTimeout(id);
  }, [name, quiet]);
  const settled = !!name && said === name;
  return (
    <View pointerEvents="none" style={[styles.bubbleRow, { top: top + 6 }]}>
      <Animated.View entering={FadeInUp.duration(320).delay(200).easing(EASE_OUT)} style={styles.bubble}>
        {settled ? (
          <Animated.View key={said} entering={FadeIn.duration(260)}>
            <InkText variant="body">{t('onboarding.namePreview', { name: said })}</InkText>
          </Animated.View>
        ) : (
          <Anim name="typing" size={34} tint={ink.text2} />
        )}
      </Animated.View>
    </View>
  );
}

/** A radio that fills with a small spring when chosen. */
function Radio({ on }: { on: boolean }) {
  const s = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    s.set(on ? withSpring(1, { duration: 320, dampingRatio: 0.6 }) : withTiming(0, { duration: 120 }));
  }, [on, s]);
  const style = useAnimatedStyle(() => ({ opacity: s.get() > 0.02 ? 1 : 0, transform: [{ scale: 0.6 + 0.4 * s.get() }] }));
  return (
    <View style={styles.radio}>
      <Animated.View style={[styles.radioOn, style]}>
        <Ionicons name="checkmark" size={15} color={ink.onAccent} />
      </Animated.View>
    </View>
  );
}

/**
 * The one brand pill, kept across every step (its words change in place). On "Say hi" its plate
 * becomes the chat's message field: it slides to the field's place and colour, then the chat
 * fades in on top of it. The plate is absolute and childless, so animating its edges lays out nothing else.
 */
function MorphPill({ label, disabled, onPress, leaving, bottomShift, quiet }: { label: string; disabled?: boolean; onPress: () => void; leaving: boolean; bottomShift: number; quiet: boolean }) {
  const m = useSharedValue(0);
  useEffect(() => {
    m.set(withTiming(leaving ? 1 : 0, { duration: 460 * slowFor(quiet), easing: EASE_IN_OUT }));
  }, [leaving, quiet, m]);
  const field = night.colors.surface;
  // The chat's field: the "+" button (54) and a gap (8) take its left side; its edge is 12 from the screen's.
  const plate = useAnimatedStyle(() => ({
    left: interpolate(m.get(), [0, 1], [0, 54 + space.sm + space.md - inkGutter]),
    right: interpolate(m.get(), [0, 1], [0, space.md - inkGutter]),
    top: interpolate(m.get(), [0, 1], [0, 2 + bottomShift]),
    bottom: interpolate(m.get(), [0, 1], [0, -bottomShift]),
    backgroundColor: interpolateColor(m.get(), [0, 1], [ink.accent, field]),
  }));
  const words = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, m.get() * 3) }));
  return (
    <View style={[styles.pill, disabled && styles.off]}>
      <Animated.View style={[styles.plate, plate]} />
      <PressableScale
        scaleTo={0.97}
        disabled={disabled || leaving}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled }}
        style={styles.pillHit}>
        <Animated.View style={words}>
          <Animated.View key={label} entering={FadeIn.duration(180)}>
            <InkText variant="bodyStrong" color={ink.onAccent} lines={1}>
              {label}
            </InkText>
          </Animated.View>
        </Animated.View>
      </PressableScale>
    </View>
  );
}

/** The picked card flying into the avatar: one copy of the photo, its frame eased from card to circle. */
function Handoff({ from, to, friend, onDone }: { from: { x: number; y: number; w: number; h: number }; to: { x: number; y: number; w: number; h: number }; friend: Character; onDone: () => void }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withTiming(1, { duration: 640, easing: EASE_IN_OUT }, (done) => {
      if (done) scheduleOnRN(onDone);
    }));
  }, [p, onDone]);
  const style = useAnimatedStyle(() => {
    const v = p.get();
    return {
      left: from.x + (to.x - from.x) * v,
      top: from.y + (to.y - from.y) * v,
      width: from.w + (to.w - from.w) * v,
      height: from.h + (to.h - from.h) * v,
      borderRadius: inkRadius.card + (to.w / 2 - inkRadius.card) * v,
    };
  });
  // The scene photo gives way to the square avatar on the last stretch, so the landing matches the avatar exactly.
  const face = useAnimatedStyle(() => ({ opacity: interpolate(p.get(), [0.55, 1], [0, 1], 'clamp') }));
  return (
    <Animated.View pointerEvents="none" style={[styles.handoff, style]}>
      <Image source={faceSource(friend)} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={HEROES[friend.id] ? undefined : portraitPosition(friend.id, from.w / from.h)} />
      <Animated.View style={[StyleSheet.absoluteFill, face]}>
        <Image source={characterImage(friend) ?? faceSource(friend)} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ink.ground },
  flex: { flex: 1 },
  page: { ...StyleSheet.absoluteFill, paddingHorizontal: inkGutter },
  bottomed: { flex: 1, justifyContent: 'flex-end', paddingBottom: space.xl },
  introLine: { marginTop: space.sm, fontSize: 17, lineHeight: 22 },
  header: { position: 'absolute', left: inkGutter, right: inkGutter, height: HEADER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 5 },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: ink.photoGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Holds the back button's mirror place, so the moon stays centred; it only speaks the step.
  stepSpot: { width: 44, height: 44 },
  backIcon: { marginLeft: -2 },
  langChipBox: { position: 'absolute', right: inkGutter, zIndex: 5 },
  langChip: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: ink.photoGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.photoGlassRim,
  },
  wheelRoom: { flex: 1, minHeight: 0, justifyContent: 'center' },
  // Two lines always: the red under-18 note never shrinks the wheel's room and shifts the drum mid-turn.
  note: { marginTop: space.md, marginBottom: space.sm, paddingHorizontal: space.sm, minHeight: 36 },
  field: {
    marginTop: 22,
    height: 56,
    borderRadius: inkRadius.field,
    borderCurve: 'continuous',
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  input: { flex: 1, ...inkType.body, paddingVertical: 0 },
  rows: { marginTop: 22, backgroundColor: ink.card, borderRadius: inkRadius.card, borderCurve: 'continuous', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: ink.edge },
  row: { paddingLeft: 18 },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  rowBody: { minHeight: 56, paddingRight: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ink.line },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(235,235,245,0.35)', alignItems: 'center', justifyContent: 'center' },
  radioOn: { position: 'absolute', left: -1.5, top: -1.5, width: 24, height: 24, borderRadius: 12, backgroundColor: ink.accent, alignItems: 'center', justifyContent: 'center' },
  buddy: { position: 'absolute', left: inkGutter, width: BUDDY, height: BUDDY, borderRadius: BUDDY / 2, borderWidth: 2, padding: 2, zIndex: 4 },
  buddyImage: { flex: 1, borderRadius: BUDDY / 2 },
  bubbleRow: { position: 'absolute', left: inkGutter + BUDDY + 12, right: inkGutter, flexDirection: 'row', zIndex: 4 },
  // The friend's side of a chat on the night: a raised bubble with its tail corner toward the face.
  bubble: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 22,
    borderBottomLeftRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: '#1E1E26',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    flexShrink: 1,
  },
  footer: { paddingHorizontal: inkGutter, paddingTop: space.sm },
  pill: { height: 56 },
  off: { opacity: 0.4 },
  plate: { position: 'absolute', borderRadius: 28, borderCurve: 'continuous' },
  pillHit: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  legal: { marginTop: space.sm },
  handoff: { position: 'absolute', overflow: 'hidden', zIndex: 20 },
  langGroup: { marginHorizontal: 0, borderRadius: 0, backgroundColor: 'transparent' },
});
