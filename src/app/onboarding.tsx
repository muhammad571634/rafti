import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandArt, Button, CharacterAvatar, PressableScale, Screen, Sheet, ShellIcon, Txt } from '@/components/ui';
import { setLocale, SUPPORTED_LOCALES } from '@/i18n';
import { shortName } from '@/lib/format';
import { morningGreetings } from '@/mock';
import { requestPushPermission } from '@/notifications/sync';
import { useAppStore, WELCOME_SHELLS } from '@/store/use-app-store';
import { colors, fonts, palette, radius, space, type } from '@/theme';

/** One friend from each world, so the first choice is about taste, not scrolling. */
const PICKS = ['c_kai', 'c_aurelian', 'c_sol', 'c_seren'];
const QUESTIONS = 5;
const MIN_AGE = 18;
const NAME_MAX = 20;
const YEAR_ROW = 44;
const YEAR_VISIBLE = 5;
const DEFAULT_YEAR = 2000;

type Step = 'hello' | 'age' | 'name' | 'meet' | 'notify' | 'gift';
const STEPS: Step[] = ['hello', 'age', 'name', 'meet', 'notify', 'gift'];

/**
 * First launch: Rafti says hello, then five short questions - birth year (18+),
 * name, first friend, notifications - and a welcome gift. It ends in the first
 * chat, where the new friend has already written.
 */
export default function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const characters = useAppStore((s) => s.characters);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const picks = useMemo(
    () => PICKS.map((id) => characters.find((c) => c.id === id)).filter((c) => c != null),
    [characters],
  );

  const [step, setStep] = useState<Step>('hello');
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [name, setName] = useState('');
  const [friendId, setFriendId] = useState(PICKS[0]);
  const [notifications, setNotifications] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const index = STEPS.indexOf(step);
  const friend = picks.find((c) => c.id === friendId) ?? picks[0];
  const friendName = friend ? shortName(friend.name) : '';
  const thisYear = new Date().getFullYear();
  const minor = thisYear - year < MIN_AGE;
  const trimmed = name.trim();

  const next = () => setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]);
  const back = () => setStep(STEPS[Math.max(index - 1, 0)]);

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

  const footer = (() => {
    switch (step) {
      case 'hello':
        return (
          <>
            <Button label={t('onboarding.start')} size="lg" full onPress={next} />
            <Txt variant="caption" color={colors.textMuted} center style={styles.legal}>
              {t('onboarding.legal')}
            </Txt>
          </>
        );
      case 'age':
        return <Button label={t('onboarding.continue')} size="lg" full disabled={minor} onPress={next} />;
      case 'name':
        return <Button label={t('onboarding.continue')} size="lg" full disabled={!trimmed} onPress={next} />;
      case 'meet':
        return <Button label={t('onboarding.meet', { name: friendName })} size="lg" full onPress={next} />;
      case 'notify':
        return (
          <>
            <Button
              label={t('onboarding.allow')}
              size="lg"
              full
              onPress={() => {
                setNotifications(true);
                // Step two of the ask: the system prompt, right after the user said yes here.
                void requestPushPermission();
                next();
              }}
            />
            <PressableScale style={styles.notNow} scaleTo={0.96} onPress={next}>
              <Txt variant="bodyStrong" color={colors.textSecondary}>
                {t('onboarding.notNow')}
              </Txt>
            </PressableScale>
          </>
        );
      case 'gift':
        return <Button label={t('onboarding.sayHi', { name: friendName })} size="lg" full onPress={finish} />;
    }
  })();

  return (
    <Screen background={colors.bg}>
      <View style={styles.top}>
        {index > 0 ? (
          <PressableScale style={styles.back} scaleTo={0.88} accessibilityLabel={t('a11y.back')} onPress={back}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </PressableScale>
        ) : (
          <View style={styles.back} />
        )}

        {index > 0 ? (
          <View
            style={styles.progress}
            accessible
            accessibilityLabel={t('onboarding.step', { index: Math.min(index, QUESTIONS), count: QUESTIONS })}>
            {Array.from({ length: QUESTIONS }, (_, i) => (
              <View key={i} style={[styles.segment, i < index && styles.segmentOn]} />
            ))}
          </View>
        ) : (
          <View style={styles.flex} />
        )}

        {index === 0 && SUPPORTED_LOCALES.length > 1 ? (
          <PressableScale style={styles.lang} scaleTo={0.96} onPress={() => setLangOpen(true)}>
            <Txt variant="smallStrong">
              {SUPPORTED_LOCALES.find((l) => l.code === i18n.language)?.label ?? 'English'}
            </Txt>
            <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
          </PressableScale>
        ) : (
          <View style={styles.back} />
        )}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View key={step} entering={FadeIn.duration(180)} style={styles.body}>
          {step === 'hello' ? (
            <View style={styles.hello}>
              <BrandArt name="sticker" width={190} bob />
              <Txt variant="logo" center style={styles.helloTitle}>
                {t('onboarding.helloTitle')}
              </Txt>
              <Txt variant="body" color={colors.textSecondary} center style={styles.helloBody}>
                {t('onboarding.helloBody')}
              </Txt>
            </View>
          ) : null}

          {step === 'age' ? (
            <>
              <Title title={t('onboarding.ageTitle')} body={t('onboarding.ageBody')} />
              <YearWheel value={year} min={1940} max={thisYear} onChange={setYear} />
              <View style={[styles.note, minor && styles.noteBlocked]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color={minor ? palette.red : colors.textSecondary}
                />
                <Txt variant="small" color={minor ? palette.red : colors.textSecondary} style={styles.flex}>
                  {minor ? t('onboarding.ageBlocked') : t('onboarding.ageNote')}
                </Txt>
              </View>
            </>
          ) : null}

          {step === 'name' ? (
            <>
              <Title title={t('onboarding.nameTitle')} body={t('onboarding.nameBody')} />
              <View style={styles.field}>
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
                  style={styles.input}
                />
                <Txt variant="caption" color={colors.textMuted}>
                  {name.length}/{NAME_MAX}
                </Txt>
              </View>
              {friend ? (
                <View style={styles.preview}>
                  <CharacterAvatar character={friend} size={34} />
                  <View style={styles.bubble}>
                    <Txt variant="body">
                      {t('onboarding.namePreview', { name: trimmed || t('onboarding.nameYou') })}
                    </Txt>
                  </View>
                </View>
              ) : null}
            </>
          ) : null}

          {step === 'meet' ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Title title={t('onboarding.meetTitle')} body={t('onboarding.meetBody')} />
              <View style={styles.list} accessibilityRole="radiogroup">
                {picks.map((c, i) => {
                  const selected = c.id === friendId;
                  return (
                    <PressableScale
                      key={c.id}
                      scaleTo={0.98}
                      style={[styles.row, i > 0 && styles.rowLine, selected && styles.rowSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      onPress={() => setFriendId(c.id)}>
                      <CharacterAvatar character={c} size={56} verified={c.voiceReady} />
                      <View style={styles.flex}>
                        <View style={styles.nameRow}>
                          <Txt variant="title" lines={1} style={styles.keep}>
                            {c.name}
                          </Txt>
                          {c.series ? (
                            <Txt variant="caption" color={colors.textMuted} lines={1} style={styles.shrink}>
                              {c.series}
                            </Txt>
                          ) : null}
                        </View>
                        <Txt variant="small" color={colors.textSecondary} lines={2}>
                          {c.bio}
                        </Txt>
                      </View>
                      <Ionicons
                        name={selected ? 'radio-button-on' : 'radio-button-off'}
                        size={22}
                        color={selected ? colors.primary : colors.textFaint}
                      />
                    </PressableScale>
                  );
                })}
              </View>
              <Txt variant="small" color={colors.textMuted} style={styles.hint}>
                {t('onboarding.meetHint')}
              </Txt>
            </ScrollView>
          ) : null}

          {step === 'notify' && friend ? (
            <>
              <Title title={t('onboarding.notifyTitle', { name: friendName })} body={t('onboarding.notifyBody')} />
              <View style={styles.lock}>
                <Txt variant="heroFigure" color={colors.textOnDark} center>
                  7:30
                </Txt>
                <Txt variant="small" color={colors.onMediaMuted} center style={styles.lockDay}>
                  {tomorrow().toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}
                </Txt>
                <View style={styles.notif}>
                  <CharacterAvatar character={friend} size={38} />
                  <View style={styles.flex}>
                    <View style={styles.notifHead}>
                      <Txt variant="smallStrong" color={colors.textOnDark} lines={1} style={styles.flex}>
                        {friend.name}
                      </Txt>
                      <Txt variant="caption" color={colors.onMediaMuted}>
                        {t('onboarding.notifyNow')}
                      </Txt>
                    </View>
                    <Txt variant="small" color={colors.textOnDark}>
                      {morningGreetings[0]}
                    </Txt>
                  </View>
                </View>
              </View>
              <View style={styles.perks}>
                <Perk text={t('onboarding.notifyPerkMorning')} />
                <Perk text={t('onboarding.notifyPerkPlan')} />
              </View>
            </>
          ) : null}

          {step === 'gift' ? (
            <View style={styles.hello}>
              <BrandArt name="reward" width={230} radius={radius.xxl} />
              <View style={styles.plus}>
                <ShellIcon size={34} />
                <Txt variant="display" color={colors.brandText} style={styles.plusText}>
                  +{WELCOME_SHELLS}
                </Txt>
              </View>
              <Txt variant="body" color={colors.textSecondary} center style={styles.helloBody}>
                {t('onboarding.giftBody')}
              </Txt>
              <View style={styles.facts}>
                <Fact text={t('onboarding.giftDaily')} />
                <Fact text={t('onboarding.giftKeep')} />
              </View>
            </View>
          ) : null}
        </Animated.View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.xl) }]}>{footer}</View>
      </KeyboardAvoidingView>

      <Sheet visible={langOpen} onClose={() => setLangOpen(false)} title={t('onboarding.language')}>
        {SUPPORTED_LOCALES.map((l) => (
          <PressableScale
            key={l.code}
            style={styles.langRow}
            onPress={() => {
              void setLocale(l.code);
              setLangOpen(false);
            }}>
            <Txt variant={l.code === i18n.language ? 'bodyStrong' : 'body'} style={styles.flex}>
              {l.label}
            </Txt>
            {l.code === i18n.language ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
          </PressableScale>
        ))}
      </Sheet>
    </Screen>
  );
}

function Title({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.title}>
      <Txt variant="h1">{title}</Txt>
      <Txt variant="body" color={colors.textSecondary}>
        {body}
      </Txt>
    </View>
  );
}

function Perk({ text }: { text: string }) {
  return (
    <View style={styles.perk}>
      <Ionicons name="checkmark" size={18} color={colors.primary} />
      <Txt variant="small" color={colors.textSecondary} style={styles.flex}>
        {text}
      </Txt>
    </View>
  );
}

function Fact({ text }: { text: string }) {
  return (
    <View style={styles.fact}>
      <Txt variant="chip" color={colors.textSecondary}>
        {text}
      </Txt>
    </View>
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
  const ref = useRef<ScrollView>(null);
  const pad = YEAR_ROW * Math.floor(YEAR_VISIBLE / 2);

  // Start on the current answer; `contentOffset` alone is ignored on web.
  useEffect(() => {
    const id = setTimeout(() => ref.current?.scrollTo({ y: years.indexOf(value) * YEAR_ROW, animated: false }), 0);
    return () => clearTimeout(id);
    // Only on mount: later the wheel follows the finger, not the value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / YEAR_ROW);
    const year = years[Math.max(0, Math.min(years.length - 1, i))];
    if (year !== value) onChange(year);
  };

  return (
    <View style={styles.wheel}>
      <View pointerEvents="none" style={[styles.band, { top: pad }]} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={YEAR_ROW}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: pad }}
        contentOffset={{ x: 0, y: years.indexOf(value) * YEAR_ROW }}
        onScroll={settle}
        scrollEventThrottle={32}
        onMomentumScrollEnd={settle}
        accessibilityLabel={String(value)}>
        {years.map((y) => {
          const d = Math.abs(y - value);
          return (
            <PressableScale
              key={y}
              scaleTo={1}
              style={styles.yearRow}
              onPress={() => {
                onChange(y);
                ref.current?.scrollTo({ y: years.indexOf(y) * YEAR_ROW, animated: true });
              }}>
              <Txt
                style={[
                  styles.year,
                  { color: d === 0 ? colors.text : colors.textFaint, fontSize: d === 0 ? 30 : d === 1 ? 24 : 21 },
                ]}>
                {y}
              </Txt>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  keep: { flexShrink: 0 },
  top: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, gap: space.sm },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: space.xs + 2 },
  segment: { width: 22, height: 4, borderRadius: 2, backgroundColor: colors.border },
  segmentOn: { backgroundColor: colors.primary },
  lang: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: 32,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  body: { flex: 1, paddingHorizontal: space.xxl },
  hello: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  helloTitle: { fontSize: 34, marginTop: space.xl },
  helloBody: { marginTop: space.sm, maxWidth: 300 },
  legal: { marginTop: space.md },
  title: { gap: space.sm, marginTop: space.lg },
  note: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'flex-start',
    marginTop: space.xxl,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteBlocked: { backgroundColor: palette.redSoft, borderColor: palette.redSoft },
  wheel: { height: YEAR_ROW * YEAR_VISIBLE, marginTop: space.xxl, alignSelf: 'center', width: 200 },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: YEAR_ROW,
    borderRadius: radius.md,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  yearRow: { height: YEAR_ROW, alignItems: 'center', justifyContent: 'center' },
  year: { fontFamily: fonts.displaySemi, fontVariant: ['tabular-nums'] },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 56,
    marginTop: space.xxl,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, ...type.h3, paddingVertical: 0 },
  preview: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginTop: space.lg },
  bubble: {
    maxWidth: 250,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm + 2,
    borderRadius: radius.bubble,
    borderBottomLeftRadius: space.xs + 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: {
    marginTop: space.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.divider },
  rowSelected: { backgroundColor: colors.primarySofter },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs + 2 },
  hint: { marginTop: space.md, marginHorizontal: space.xs },
  lock: {
    marginTop: space.xxl,
    paddingTop: space.xl,
    paddingBottom: space.lg,
    paddingHorizontal: space.lg,
    borderRadius: radius.xxl,
    backgroundColor: palette.gray900,
  },
  lockDay: { marginBottom: space.lg },
  notif: {
    flexDirection: 'row',
    gap: space.sm + 2,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.onMediaGlass,
  },
  notifHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  perks: { marginTop: space.lg, gap: space.sm + 2 },
  perk: { flexDirection: 'row', gap: space.sm + 2, alignItems: 'flex-start' },
  plus: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg },
  plusText: { fontSize: 44, lineHeight: 52 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm, marginTop: space.lg },
  fact: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: { paddingHorizontal: space.xxl, paddingTop: space.md },
  notNow: { height: 46, alignItems: 'center', justifyContent: 'center' },
  langRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
});
