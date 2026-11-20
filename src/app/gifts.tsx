import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Linking,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type ViewInstance,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SFSymbol } from 'sf-symbols-typescript';

import { CoinDropReward, type Point, wobbleAt } from '@/components/coin-drop';
import { InkNavBar, InkText } from '@/components/ink';
import { LuckyWheel } from '@/components/lucky-wheel';
import {
  Anim,
  Button,
  ListRow,
  PressableScale,
  Screen,
  SFIcon,
  Sheet,
  ShellIcon,
  Txt,
  useScrolledPast,
} from '@/components/ui';
import { DEEP_CHAT_LINES, FIRST_STEPS, FRIENDS_TO_MEET, type FirstStepKey } from '@/economy/first-steps';
import { useCountingNumber } from '@/hooks/use-counting-number';
import { useFirstSteps } from '@/hooks/use-first-steps';
import { track } from '@/lib/analytics';
import { count } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { inviteCodeFor, invitesThisWeek } from '@/lib/invite';
import { shareText } from '@/lib/share';
import {
  DAILY_CHECK_IN,
  DAILY_CHECK_IN_TOP,
  FREE_SPINS_PER_DAY,
  INVITE_REWARD,
  INVITES_PER_WEEK,
  todayKey,
  WHEEL_SEGMENTS,
} from '@/mock';
import { pushesAllowed, pushPermission, requestPushPermission } from '@/notifications/sync';
import { useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, palette, radius, space, systemColors } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';

type TileLook = { fill: string; ios: SFSymbol; icon: React.ComponentProps<typeof Ionicons>['name'] };

/** First steps' tiles (0z294): iOS system colours, one per step. */
const STEP_TILES: Record<FirstStepKey, TileLook> = {
  friends: { fill: systemColors.blue, ios: 'person.2.fill', icon: 'people' },
  create: { fill: systemColors.purple, ios: 'sparkles', icon: 'sparkles' },
  deep: { fill: systemColors.green, ios: 'bubble.left.and.bubble.right.fill', icon: 'chatbubbles' },
  plan: { fill: systemColors.orange, ios: 'calendar.badge.plus', icon: 'calendar' },
  notify: { fill: systemColors.red, ios: 'bell.fill', icon: 'notifications' },
};

const ROW_ICON = 34;
const WAY_ICON = 34;
const WAY_TILES: Record<'invite' | 'share' | 'send' | 'join' | 'back', TileLook> = {
  invite: { fill: systemColors.indigo, ios: 'person.badge.plus', icon: 'person-add' },
  share: { fill: systemColors.blue, ios: 'square.and.arrow.up', icon: 'share' },
  send: { fill: systemColors.blue, ios: 'paperplane.fill', icon: 'paper-plane' },
  join: { fill: systemColors.indigo, ios: 'person.badge.plus', icon: 'person-add' },
  back: { fill: systemColors.green, ios: 'calendar', icon: 'calendar' },
};

const GLASS_RIM = 'rgba(255,255,255,0.11)';
const CHECKIN_RIM = 'rgba(248,113,113,0.28)';
const PEACH_SOFT = 'rgba(235,173,132,0.14)';

/**
 * Free gifts (approved Ink Night+ prototype): warm peach horizon glow, sticky Apple HIG nav bar
 * with the live counting shell capsule, stained-glass crimson Daily Check-In card, First steps
 * (Claim in peach, Go in dark glass), obsidian Lucky Wheel card, and invite/share Ink cards.
 */
export default function GiftsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const router = useRouter();
  const { scrolled, onScroll: onScrollPast } = useScrolledPast(34);

  const shells = useAppStore((s) => s.wallet.shells);
  const daily = useAppStore((s) => s.daily);
  const spinWheel = useAppStore((s) => s.spinWheel);
  const { spin: spinParam } = useLocalSearchParams<{ spin?: string }>();
  const user = useAppStore((s) => s.user);
  const redeemInvite = useAppStore((s) => s.redeemInvite);
  const claimFirstStep = useAppStore((s) => s.claimFirstStep);
  const [pushOn, setPushOn] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    void pushesAllowed().then(setPushOn);
  }, []);
  const steps = useFirstSteps(pushOn);

  const [reward, setReward] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Coin Drop Reward measurements + live balance roll.
  const [pour, setPour] = useState<{ amount: number; from: Point; wallet: Point & { left: number } } | null>(null);
  const [pending, setPending] = useState(0);
  const shownShells = useCountingNumber(Math.max(0, shells - pending));
  const wobble = useSharedValue(1);
  const scroll = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);
  const wheelCard = useRef<ViewInstance>(null);
  const capsuleBox = useRef<ViewInstance>(null);
  const shellMark = useRef<ViewInstance>(null);
  const pourTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (pourTimer.current) clearTimeout(pourTimer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );
  const capsuleStyle = useAnimatedStyle(() => {
    const w = wobbleAt(wobble.get());
    return { transform: [{ scaleX: 1 + 0.1 * w }, { scaleY: 1 - 0.08 * w }] };
  });

  const prizeWon = (amount: number) => {
    if (!CoinDropReward) return setReward(amount);
    setPending(amount);
    const wasScrolled = scrollY.current > 1;
    if (wasScrolled) scroll.current?.scrollTo({ y: 0, animated: true });
    if (pourTimer.current) clearTimeout(pourTimer.current);
    pourTimer.current = setTimeout(() => {
      const wheelRef = wheelCard.current;
      const capRef = capsuleBox.current;
      const markRef = shellMark.current;
      if (!wheelRef || !capRef || !markRef) {
        setPending(0);
        setReward(amount);
        return;
      }
      wheelRef.measureInWindow((wx, wy, ww, wh) => {
        if (ww <= 0 && wh <= 0) {
          setPending(0);
          setReward(amount);
          return;
        }
        capRef.measureInWindow((cx) => {
          markRef.measureInWindow((sx, sy, sw, sh) => {
            setPour({ amount, from: { x: wx + ww / 2, y: wy + wh / 2 }, wallet: { x: sx + sw / 2, y: sy + sh / 2, left: cx } });
          });
        });
      });
    }, wasScrolled ? 380 : 0);
  };

  const code = inviteCodeFor(user);
  const invited = Math.min(INVITES_PER_WEEK, invitesThisWeek(user.inviteCredits));
  const wheelSize = Math.max(0, Math.min(212, width - inkGutter * 2 - space.md * 2));

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1600);
  };

  const invite = () => void shareText(t('gifts.inviteMessage', { code, count: INVITE_REWARD }));
  const share = () => void shareText(t('gifts.shareMessage'));

  const redeem = () => {
    const result = redeemInvite(codeInput);
    if (result !== 'ok') {
      haptic.error();
      return setRedeemError(t(`gifts.redeemError.${result}`));
    }
    haptic.success();
    setRedeemOpen(false);
    setCodeInput('');
    setRedeemError(null);
    setAccepted(true);
  };

  const goToStep = async (key: FirstStepKey) => {
    switch (key) {
      case 'friends':
        return router.push('/(tabs)/find');
      case 'create':
        return router.push('/create-character');
      case 'deep':
        return router.push('/(tabs)/chat');
      case 'plan':
        return router.push('/(tabs)/us');
      case 'notify': {
        if ((await pushPermission()) === 'denied') return void Linking.openSettings();
        await requestPushPermission();
        setPushOn(await pushesAllowed());
      }
    }
  };
  const claimStep = (key: FirstStepKey) => {
    if (!claimFirstStep(key)) return;
    haptic.success();
    track('first_step', { kind: key });
  };
  const stepLine = (key: FirstStepKey, amount: number) => {
    const far = key === 'friends' ? `${steps.progress.friends}/${FRIENDS_TO_MEET} · ` : key === 'deep' ? `${steps.progress.deep}/${DEEP_CHAT_LINES} · ` : '';
    return steps.states[key] === 'claimed' ? undefined : `${far}+${amount}`;
  };

  const today = todayKey();
  const checkedInToday = daily.lastLoginDay === today;
  const spinsUsed = daily.spinDay === today ? daily.spinsUsed : 0;
  const canSpin = spinsUsed < FREE_SPINS_PER_DAY;
  const spinStatus = canSpin ? t('gifts.spinsFree') : t('gifts.spinsNone');

  return (
    <Screen background={ink.ground}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(235,173,132,0.18)', 'rgba(9,9,13,0)']}
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.ambient}
      />

      <InkNavBar
        backLabel={t('common.back')}
        onBack={() => router.back()}
        title={t('gifts.title')}
        scrolled={scrolled}
        right={
          <Animated.View ref={capsuleBox} collapsable={false} style={[styles.capsule, capsuleStyle]}>
            <View
              style={styles.capsuleInner}
              accessible
              accessibilityLabel={t('plans.shells', { count: Math.max(0, shells - pending) })}>
              <View ref={shellMark} collapsable={false}>
                <ShellIcon size={16} />
              </View>
              <Txt style={styles.capsuleText}>{count(shownShells)}</Txt>
            </View>
          </Animated.View>
        }
      />

      <ScrollView
        ref={scroll}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
          onScrollPast(e);
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
        <InkText variant="display" accessibilityRole="header" style={styles.screenTitle}>
          {t('gifts.title')}
        </InkText>

        {/* Calm stained-glass Daily Check-In Hero */}
        <View style={styles.checkIn}>
          <LinearGradient
            colors={['rgba(239,68,68,0.22)', 'rgba(153,27,27,0.10)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.checkInHead}>
            <InkText variant="cardSmall" color={ink.text} lines={1} style={styles.shrink}>
              {t('gifts.checkIn')}
            </InkText>
            <Txt style={styles.checkInDay} lines={1}>
              {t('gifts.dayOf', { day: Math.max(1, daily.checkInDay), total: DAILY_CHECK_IN.length })}
            </Txt>
          </View>
          <View style={styles.days}>
            {DAILY_CHECK_IN.map((amount, index) => {
              const day = index + 1;
              const claimed = day <= daily.checkInDay;
              const isToday = checkedInToday && day === daily.checkInDay;
              const next = day === daily.checkInDay + 1;
              const last = index === DAILY_CHECK_IN.length - 1;
              const shown = last
                ? isToday
                  ? `+${daily.checkInAmount ?? amount}`
                  : claimed
                    ? `+${amount}`
                    : t('common.atLeast', { count: amount })
                : `+${amount}`;
              const worth = last && !claimed ? t('common.range', { min: amount, max: DAILY_CHECK_IN_TOP }) : shown;

              return (
                <View
                  key={day}
                  style={styles.day}
                  accessible
                  accessibilityLabel={`${isToday ? t('common.today') : t('gifts.day', { count: day })}, ${worth}`}>
                  <View style={[styles.dayDot, claimed ? styles.dayClaimed : next && styles.dayNext]}>
                    {claimed ? (
                      <Ionicons name="checkmark" size={16} color={ink.onPill} />
                    ) : (
                      <Txt style={styles.dayNumber}>{day}</Txt>
                    )}
                  </View>
                  <Txt style={[styles.dayAmount, claimed && styles.dayAmountOn, last && styles.dayAmountTop]}>
                    {shown}
                  </Txt>
                </View>
              );
            })}
          </View>
        </View>

        {/* First steps (0z294) */}
        {steps.open ? (
          <>
            <Txt style={styles.sectionLabel}>{t('gifts.firstSteps.title')}</Txt>
            <View style={styles.inkCard}>
              {FIRST_STEPS.map((step, i) => {
                const state = steps.states[step.key];
                return (
                  <WayRow
                    key={step.key}
                    tile={STEP_TILES[step.key]}
                    title={t(`gifts.firstSteps.${step.key}`)}
                    subtitle={stepLine(step.key, step.reward)}
                    action={
                      state === 'claimed' ? (
                        <View accessible accessibilityLabel={t('gifts.firstSteps.done')} style={styles.stepDone}>
                          <Ionicons name="checkmark-circle" size={24} color={systemColors.green} />
                        </View>
                      ) : state === 'ready' ? (
                        <StepPill kind="peach" label={t('gifts.firstSteps.claim')} onPress={() => claimStep(step.key)} />
                      ) : (
                        <StepPill kind="glass" label={t('gifts.firstSteps.go')} onPress={() => void goToStep(step.key)} />
                      )
                    }
                    line={i < FIRST_STEPS.length - 1}
                  />
                );
              })}
            </View>
          </>
        ) : null}

        <View style={styles.labelRow}>
          <Txt style={styles.sectionLabel}>{t('gifts.wheel')}</Txt>
          <View style={styles.statusPill}>
            <Txt style={styles.statusText}>{spinStatus}</Txt>
          </View>
        </View>
        <View ref={wheelCard} collapsable={false} style={[styles.inkCard, styles.wheel]}>
          <LuckyWheel
            size={wheelSize}
            disabled={!canSpin}
            onSpin={() => spinWheel().then((result) => result?.index ?? null)}
            onStop={(index) => prizeWon(WHEEL_SEGMENTS[index])}
            autoSpin={spinParam === '1'}
          />
        </View>

        <View style={styles.labelRow}>
          <Txt style={styles.sectionLabel}>{t('gifts.moreShells')}</Txt>
          <PressableScale
            hitSlop={hitSlop}
            scaleTo={0.88}
            accessibilityRole="button"
            accessibilityLabel={t('gifts.inviteRulesTitle')}
            style={styles.info}
            onPress={() => setRulesOpen(true)}>
            <Ionicons name="information-circle-outline" size={19} color={ink.text2} />
          </PressableScale>
        </View>
        <View style={styles.inkCard}>
          <WayRow
            tile={WAY_TILES.invite}
            title={t('gifts.inviteTitle')}
            subtitle={t('gifts.inviteSub', { count: INVITE_REWARD, done: invited, total: INVITES_PER_WEEK })}
            action={<StepPill kind="peach" label={t('gifts.inviteNow')} onPress={invite} />}
            line
          />
          <WayRow
            tile={WAY_TILES.share}
            title={t('gifts.shareTitle')}
            action={<StepPill kind="glass" label={t('gifts.share')} onPress={share} />}
          />
        </View>

        <View style={[styles.inkCard, styles.codeRow]}>
          <View style={styles.codeTile}>
            <SFIcon ios="gift.fill" icon="gift" size={17} color={colors.white} />
          </View>
          <View style={styles.codeBody}>
            <Txt style={styles.codeLabel}>{t('gifts.yourCode')}</Txt>
            <Txt style={styles.code} selectable>
              {code}
            </Txt>
          </View>
          <PressableScale
            hitSlop={hitSlop}
            scaleTo={0.88}
            accessibilityRole="button"
            accessibilityLabel={t('gifts.copyCode')}
            style={styles.copy}
            onPress={() => void copyCode()}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? systemColors.green : ink.accent} />
          </PressableScale>
        </View>

        {user.invitePending ? (
          <Txt style={styles.pending}>{t('gifts.invitePending', { count: INVITE_REWARD })}</Txt>
        ) : user.redeemedInvite ? null : (
          <PressableScale scaleTo={0.96} accessibilityRole="button" style={styles.haveCode} onPress={() => setRedeemOpen(true)}>
            <Txt style={styles.haveCodeText}>{t('gifts.haveCode')}</Txt>
          </PressableScale>
        )}
      </ScrollView>

      <Sheet visible={redeemOpen} onClose={() => setRedeemOpen(false)} title={t('gifts.haveCode')} avoidKeyboard>
        <View style={styles.redeem}>
          <TextInput
            value={codeInput}
            onChangeText={(v) => {
              setCodeInput(v);
              setRedeemError(null);
            }}
            placeholder="ABC234"
            accessibilityLabel={t('gifts.haveCode')}
            placeholderTextColor={ink.placeholder}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={14}
            style={styles.codeInput}
            onSubmitEditing={redeem}
          />
          {redeemError ? (
            <Txt variant="small" color={ink.danger} center>
              {redeemError}
            </Txt>
          ) : null}
          <Button label={t('gifts.useCode')} full disabled={!codeInput.trim()} onPress={redeem} />
        </View>
      </Sheet>

      <Sheet visible={accepted} onClose={() => setAccepted(false)} center>
        <View style={styles.success}>
          <Tile look={WAY_TILES.back} size={56} />
          <Txt variant="h3" center>
            {t('gifts.codeAccepted')}
          </Txt>
          <Txt variant="body" color={ink.text2} center>
            {t('gifts.codeAcceptedBody', { count: INVITE_REWARD })}
          </Txt>
          <Button label={t('common.done')} onPress={() => setAccepted(false)} full />
        </View>
      </Sheet>

      <Sheet visible={rulesOpen} onClose={() => setRulesOpen(false)} title={t('gifts.inviteRulesTitle')}>
        <View style={styles.rules}>
          {(['send', 'join', 'back'] as const).map((step) => (
            <ListRow key={step} title={t(`gifts.inviteSteps.${step}`)} left={<Tile look={WAY_TILES[step]} size={ROW_ICON} />} />
          ))}
          <Txt variant="caption" color={ink.text2} center>
            {t('gifts.inviteRulesNote', { count: INVITE_REWARD, total: INVITES_PER_WEEK })}
          </Txt>
        </View>
      </Sheet>

      <Sheet visible={reward != null} onClose={() => setReward(null)} center>
        <View style={styles.success}>
          <Anim name="confetti" size={220} loop={false} style={styles.confetti} />
          <Anim name="giftBox" size={120} loop={false} />
          <Txt variant="h3" center>
            {t('gifts.won', { count: reward ?? 0 })}
          </Txt>
          <View style={styles.rewardRow}>
            <ShellIcon size={26} />
            <Txt style={styles.rewardFigure} color={palette.shellText}>
              +{reward ?? 0}
            </Txt>
          </View>
          <Button label={t('common.done')} onPress={() => setReward(null)} full />
        </View>
      </Sheet>

      {CoinDropReward && pour ? (
        <CoinDropReward
          amount={pour.amount}
          from={pour.from}
          wallet={pour.wallet}
          wobble={wobble}
          onAbsorb={() => setPending(0)}
          onDone={() => setPour(null)}
        />
      ) : null}
    </Screen>
  );
}

function StepPill({ kind, label, onPress }: { kind: 'peach' | 'glass'; label: string; onPress: () => void }) {
  return (
    <PressableScale
      scaleTo={0.94}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.stepPill, kind === 'peach' ? styles.stepPillPeach : styles.stepPillGlass]}>
      <InkText variant="caption" color={kind === 'peach' ? ink.onAccent : ink.text} lines={1}>
        {label}
      </InkText>
    </PressableScale>
  );
}

function Tile({ look, size }: { look: TileLook; size: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: Math.round(size * 0.28), backgroundColor: look.fill }]}>
      <SFIcon ios={look.ios} icon={look.icon} size={Math.round(size * 0.52)} color={colors.white} />
    </View>
  );
}

function WayRow({
  tile,
  title,
  subtitle,
  action,
  line,
}: {
  tile: TileLook;
  title: string;
  subtitle?: string;
  action: React.ReactNode;
  line?: boolean;
}) {
  return (
    <View style={styles.way}>
      <Tile look={tile} size={WAY_ICON} />
      <View style={styles.wayBody}>
        <Txt style={styles.wayTitle}>{title}</Txt>
        {subtitle ? <Txt style={styles.waySub}>{subtitle}</Txt> : null}
      </View>
      {action}
      {line ? <View style={styles.wayLine} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  shrink: { flexShrink: 1 },
  screenTitle: { marginTop: 2, marginHorizontal: inkGutter },
  stepDone: { minWidth: 38, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  capsule: {
    height: 36,
    borderRadius: inkRadius.pill,
    backgroundColor: 'rgba(22,22,30,0.86)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
  },
  capsuleInner: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 11, paddingRight: 13 },
  capsuleText: { ...inkFace('footnoteStrong'), color: ink.text, fontVariant: ['tabular-nums'] },
  checkIn: {
    marginTop: 14,
    marginHorizontal: inkGutter,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CHECKIN_RIM,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  checkInHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm, paddingHorizontal: 2 },
  checkInDay: { ...inkFace('caption'), color: 'rgba(255,255,255,0.72)', fontVariant: ['tabular-nums'] },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  day: { alignItems: 'center', gap: 6, flex: 1 },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayClaimed: { backgroundColor: ink.pill, borderColor: ink.pill },
  dayNext: { backgroundColor: 'rgba(235,173,132,0.22)', borderWidth: 1.5, borderColor: ink.accent },
  dayNumber: { ...inkFace('caption'), color: ink.text },
  dayAmount: { ...inkFace('caption'), fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.58)', fontVariant: ['tabular-nums'] },
  dayAmountOn: { color: ink.text, fontWeight: '700' },
  dayAmountTop: { color: ink.accent, fontWeight: '700' },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 8,
    marginHorizontal: inkGutter + 6,
    ...inkFace('footnoteStrong'),
    color: ink.text2,
  },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  inkCard: {
    marginHorizontal: inkGutter,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  statusPill: {
    height: 24,
    marginBottom: 8,
    marginRight: inkGutter,
    paddingHorizontal: 10,
    borderRadius: inkRadius.pill,
    justifyContent: 'center',
    backgroundColor: PEACH_SOFT,
  },
  statusText: { ...inkFace('caption'), color: ink.accent },
  wheel: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: space.md,
  },
  info: { marginBottom: 6, marginRight: inkGutter + 2, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  tile: { alignItems: 'center', justifyContent: 'center' },
  way: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  wayBody: { flex: 1, minWidth: '45%', gap: 2, paddingVertical: 11 },
  wayTitle: { ...inkFace('subStrong'), fontSize: 15, color: ink.text },
  waySub: { ...inkFace('caption'), fontWeight: '400', color: ink.text2, fontVariant: ['tabular-nums'] },
  wayLine: {
    position: 'absolute',
    left: 60,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: ink.edge,
  },
  stepPill: {
    minWidth: 58,
    height: 30,
    paddingHorizontal: 13,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPillPeach: { backgroundColor: ink.accent },
  stepPillGlass: {
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
  },
  codeRow: { marginTop: 14, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  codeTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: systemColors.indigo,
  },
  codeBody: { flex: 1, minWidth: 0, gap: 1 },
  codeLabel: { ...inkFace('caption'), fontWeight: '400', color: ink.text2 },
  code: { ...inkFace('subStrong'), letterSpacing: 1.5, color: ink.text, fontVariant: ['tabular-nums'] },
  copy: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_RIM,
  },
  haveCode: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: space.lg, marginTop: 8 },
  haveCodeText: { ...inkFace('footnoteStrong'), color: ink.accent },
  pending: { marginTop: space.md, marginHorizontal: inkGutter * 2, textAlign: 'center', ...inkFace('footnote'), color: ink.text2 },
  success: { alignItems: 'center', gap: space.md },
  confetti: { position: 'absolute', top: -60 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rewardFigure: inkFace('figureLarge'),
  redeem: { gap: space.md },
  codeInput: {
    height: 54,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: '#0E0E14',
    paddingHorizontal: space.lg,
    ...inkFace('figureSmall'),
    letterSpacing: 4,
    textAlign: 'center',
    color: ink.text,
  },
  rules: { gap: space.xs },
});
