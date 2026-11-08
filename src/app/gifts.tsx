import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, type ScrollViewInstance, StyleSheet, TextInput, useWindowDimensions, View, type ViewInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SFSymbol } from 'sf-symbols-typescript';

import { CoinDropReward, type Point, wobbleAt } from '@/components/coin-drop';
import { featureStyles, HeroCard, RoundButton, TintCapsule } from '@/components/feature/feature-kit';
import { LuckyWheel } from '@/components/lucky-wheel';
import { PeekingMascot } from '@/components/peeking-mascot';
import { GroupLabel } from '@/components/plans/store-look';
import {
  Anim,
  Button,
  LargeTitle,
  ListRow,
  PressableScale,
  Screen,
  SFIcon,
  ShellIcon,
  Sheet,
  Txt,
} from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { inviteCodeFor, invitesThisWeek } from '@/lib/invite';
import { shareText } from '@/lib/share';
import {
  INVITE_REWARD,
  INVITES_PER_WEEK,
  DAILY_CHECK_IN,
  DAILY_CHECK_IN_TOP,
  FREE_SPINS_PER_DAY,
  WHEEL_SEGMENTS,
  todayKey,
} from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, fonts, hitSlop, palette, radius, signature, space, systemColors, systemGround } from '@/theme';

type TileLook = { fill: string; ios: SFSymbol; icon: React.ComponentProps<typeof Ionicons>['name'] };

const ROW_ICON = 34;
const WAY_ICON = 36;
/** Invites, sharing and the invite steps as iOS system tiles (SF Symbols). */
const WAY_TILES: Record<'invite' | 'share' | 'send' | 'join' | 'back', TileLook> = {
  invite: { fill: systemColors.indigo, ios: 'person.badge.plus', icon: 'person-add' },
  share: { fill: systemColors.blue, ios: 'square.and.arrow.up', icon: 'share' },
  send: { fill: systemColors.blue, ios: 'paperplane.fill', icon: 'paper-plane' },
  join: { fill: systemColors.indigo, ios: 'person.badge.plus', icon: 'person-add' },
  back: { fill: systemColors.green, ios: 'calendar', icon: 'calendar' },
};

/**
 * Free shells: the daily check-in, the lucky wheel, then one "More shells" card (invite, share)
 * and your invite code. No ads anywhere in the app (owner, 2026-10-22): shells are bought, or
 * earned by coming back and bringing friends. An invite pays 50 to both sides once the friend
 * joins with the code and comes back on a later day; sharing pays nothing. A feature screen on
 * Apple's white ground (design-style §10): the check-in as one card in the Gifts tile's red, the
 * wheel and the ways in grey cards, red capsules. Every limit lives in the store so it survives a restart.
 */
export default function GiftsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const router = useRouter();

  const shells = useAppStore((s) => s.wallet.shells);
  const daily = useAppStore((s) => s.daily);
  const spinWheel = useAppStore((s) => s.spinWheel);
  // Today's Spin button opens the screen with `spin=1`: the wheel turns at once.
  const { spin: spinParam } = useLocalSearchParams<{ spin?: string }>();
  const user = useAppStore((s) => s.user);
  const redeemInvite = useAppStore((s) => s.redeemInvite);

  const [reward, setReward] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // The wheel's prize poured into the wallet by hand (Coin Drop Reward, on builds with Skia). Until
  // the drop lands the capsule keeps the old balance, then wobbles and shows the new one.
  const [pour, setPour] = useState<{ amount: number; from: Point; wallet: Point & { left: number } } | null>(null);
  const [pending, setPending] = useState(0);
  const wobble = useSharedValue(1);
  const scroll = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);
  const wheelCard = useRef<ViewInstance>(null);
  const capsuleBox = useRef<ViewInstance>(null);
  const shellMark = useRef<ViewInstance>(null);
  const capsuleStyle = useAnimatedStyle(() => {
    const w = wobbleAt(wobble.get());
    return { transform: [{ scaleX: 1 + 0.1 * w }, { scaleY: 1 - 0.08 * w }] };
  });

  const prizeWon = (amount: number) => {
    if (!CoinDropReward) return setReward(amount);
    setPending(amount);
    // The wallet sits at the top: bring it into view before measuring where the drop goes.
    const scrolled = scrollY.current > 1;
    if (scrolled) scroll.current?.scrollTo({ y: 0, animated: true });
    setTimeout(() => {
      wheelCard.current?.measureInWindow((wx, wy, ww, wh) => {
        capsuleBox.current?.measureInWindow((cx) => {
          shellMark.current?.measureInWindow((sx, sy, sw, sh) => {
            setPour({ amount, from: { x: wx + ww / 2, y: wy + wh / 2 }, wallet: { x: sx + sw / 2, y: sy + sh / 2, left: cx } });
          });
        });
      });
    }, scrolled ? 380 : 0);
  };

  const code = inviteCodeFor(user);
  const invited = Math.min(INVITES_PER_WEEK, invitesThisWeek(user.inviteCredits));
  const wheelSize = Math.max(0, Math.min(224, width - space.lg * 2 - space.md * 2));

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  // Sending the code pays nothing by itself; the friend's shells and the sender's come once the
  // friend joins with it and is back on a later day (the server credits the sender).
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

  const today = todayKey();
  const checkedInToday = daily.lastLoginDay === today;
  const spinsUsed = daily.spinDay === today ? daily.spinsUsed : 0;
  // No ads (owner, 2026-10-22): one free spin a day, nothing to watch for more.
  const canSpin = spinsUsed < FREE_SPINS_PER_DAY;
  const spinStatus = canSpin ? t('gifts.spinsFree') : t('gifts.spinsNone');

  return (
    <Screen background={systemGround.ground}>
      <ScrollView
        ref={scroll}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
        <View style={styles.bar}>
          <RoundButton icon="chevron-back" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
          <Animated.View ref={capsuleBox} style={[styles.capsule, capsuleStyle]}>
            <View style={styles.capsuleInner} accessible accessibilityLabel={t('plans.shells', { count: Math.max(0, shells - pending) })}>
              <View ref={shellMark}>
                <ShellIcon size={18} />
              </View>
              <Txt style={styles.capsuleText}>{Math.max(0, shells - pending).toLocaleString('en-US')}</Txt>
            </View>
          </Animated.View>
        </View>
        <LargeTitle>{t('gifts.title')}</LargeTitle>

        {/* The day's check-in: the screen's one card in the Gifts tile's red, the mascot over its edge. */}
        <HeroCard look={signature.gifts} style={styles.checkIn}>
          <PeekingMascot width={PEEK_WIDTH} />
          <View style={styles.checkInHead}>
            <Txt style={styles.checkInTitle} lines={1}>
              {t('gifts.checkIn')}
            </Txt>
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
              // The surprise day shows its floor ("80+") until it is rolled.
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
                    {claimed ? <Ionicons name="checkmark" size={17} color={signature.gifts.strong} /> : <Txt style={styles.dayNumber}>{day}</Txt>}
                  </View>
                  {last && !claimed ? (
                    <View style={styles.offer}>
                      <Txt style={styles.offerText}>{shown}</Txt>
                    </View>
                  ) : (
                    <Txt style={[styles.dayAmount, claimed && styles.dayAmountOn]}>{shown}</Txt>
                  )}
                </View>
              );
            })}
          </View>
        </HeroCard>

        <View style={styles.labelRow}>
          <GroupLabel>{t('gifts.wheel')}</GroupLabel>
          <View style={styles.statusPill}>
            <Txt style={styles.statusText}>{spinStatus}</Txt>
          </View>
        </View>
        <View ref={wheelCard} style={[featureStyles.card, styles.wheel]}>
          <LuckyWheel
            size={wheelSize}
            disabled={!canSpin}
            onSpin={() => spinWheel().then((result) => result?.index ?? null)}
            onStop={(index) => prizeWon(WHEEL_SEGMENTS[index])}
            autoSpin={spinParam === '1'}
          />
        </View>

        <View style={styles.labelRow}>
          <GroupLabel>{t('gifts.moreShells')}</GroupLabel>
          <PressableScale
            hitSlop={hitSlop}
            scaleTo={0.88}
            accessibilityRole="button"
            accessibilityLabel={t('gifts.inviteRulesTitle')}
            style={styles.info}
            onPress={() => setRulesOpen(true)}>
            <Ionicons name="information-circle-outline" size={20} color={systemGround.secondaryLabel} />
          </PressableScale>
        </View>
        <View style={featureStyles.card}>
          <WayRow
            tile={WAY_TILES.invite}
            title={t('gifts.inviteTitle')}
            subtitle={t('gifts.inviteSub', { count: INVITE_REWARD, done: invited, total: INVITES_PER_WEEK })}
            action={<TintCapsule look={signature.gifts} label={t('gifts.inviteNow')} onPress={invite} />}
            line
          />
          {/* Sharing tells people about Sigmazam but pays nothing (owner, 2026-10-22). */}
          <WayRow tile={WAY_TILES.share} title={t('gifts.shareTitle')} action={<TintCapsule look={signature.gifts} label={t('gifts.share')} onPress={share} />} />
        </View>

        <View style={[featureStyles.card, styles.codeRow]}>
          <View style={styles.codeTile}>
            <SFIcon ios="gift.fill" icon="gift" size={17} color={colors.white} />
          </View>
          <Txt style={styles.codeLabel}>{t('gifts.yourCode')}</Txt>
          <Txt style={styles.code} selectable>
            {code}
          </Txt>
          <PressableScale
            hitSlop={hitSlop}
            scaleTo={0.88}
            accessibilityRole="button"
            accessibilityLabel={t('gifts.copyCode')}
            style={styles.copy}
            onPress={() => void copyCode()}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={17} color={signature.gifts.text} />
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
            placeholderTextColor={colors.textFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={14}
            style={styles.codeInput}
            onSubmitEditing={redeem}
          />
          {redeemError ? (
            <Txt variant="small" color={colors.danger} center>
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
          <Txt variant="body" color={colors.textSecondary} center>
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
          <Txt variant="caption" color={colors.textMuted} center>
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
            <Txt variant="display" color={palette.shellText}>
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

/** A Settings-style tile: an SF Symbol (Ionicons off iPhone) on an iOS system colour. */
function Tile({ look, size }: { look: TileLook; size: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: Math.round(size * 0.26), backgroundColor: look.fill }]}>
      <SFIcon ios={look.ios} icon={look.icon} size={Math.round(size * 0.52)} color={colors.white} />
    </View>
  );
}

/** One way to earn shells: a tile, two lines, one capsule button. */
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

/** The check-in mascot: 104pt wide, about 72pt of it stands above the card. */
const PEEK_WIDTH = 104;
const PEEK_ROOM = 40;
/** On the red card: a day still to come, and the surprise day's chip. */
const ON_RED_SOFT = 'rgba(255,255,255,0.24)';

const styles = StyleSheet.create({
  bar: {
    height: 44,
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  capsule: { height: 40, borderRadius: 20, backgroundColor: systemGround.fill },
  capsuleInner: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 14 },
  capsuleText: { fontSize: 15, fontWeight: '600', color: systemGround.label, fontVariant: ['tabular-nums'] },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  // Room above for the mascot peeking over the card.
  checkIn: { marginTop: PEEK_ROOM + space.lg, borderRadius: 26, paddingTop: 16, paddingBottom: space.lg, paddingHorizontal: space.md },
  checkInHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, paddingHorizontal: 4 },
  checkInTitle: { flexShrink: 1, fontSize: 13, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', color: colors.white },
  checkInDay: { fontSize: 13, fontWeight: '600', color: colors.white, opacity: 0.85 },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  day: { alignItems: 'center', gap: 6 },
  dayDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: ON_RED_SOFT, alignItems: 'center', justifyContent: 'center' },
  dayClaimed: { backgroundColor: colors.white },
  // Tomorrow's day: the next one to come back for.
  dayNext: { backgroundColor: 'transparent', borderWidth: 2.5, borderColor: colors.white },
  dayNumber: { fontSize: 15, fontWeight: '700', color: colors.white },
  dayAmount: { fontSize: 12, fontWeight: '700', color: colors.white, opacity: 0.85, fontVariant: ['tabular-nums'] },
  dayAmountOn: { opacity: 1 },
  offer: { paddingHorizontal: 6, borderRadius: 9, backgroundColor: ON_RED_SOFT },
  offerText: { fontSize: 12, fontWeight: '800', color: colors.white },
  statusPill: {
    height: 24,
    marginBottom: 4,
    marginRight: space.lg,
    paddingHorizontal: 10,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: signature.gifts.soft,
  },
  statusText: { fontSize: 13, fontWeight: '700', color: signature.gifts.text },
  wheel: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.md,
    marginBottom: 23,
  },
  info: { marginBottom: 2, marginRight: space.lg + 4, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  tile: { alignItems: 'center', justifyContent: 'center' },
  way: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  wayBody: { flex: 1, minWidth: 0, gap: 2, paddingVertical: 10 },
  wayTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: systemGround.label },
  waySub: { fontSize: 13, color: systemGround.secondaryLabel },
  wayLine: {
    position: 'absolute',
    left: 14 + WAY_ICON + 12,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderStrong,
  },
  codeRow: { marginTop: 22, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  codeTile: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: signature.gifts.strong },
  codeLabel: { flex: 1, fontSize: 17, letterSpacing: -0.4, color: systemGround.label },
  code: { fontSize: 17, fontWeight: '700', letterSpacing: 3, color: systemGround.label },
  copy: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: signature.gifts.soft },
  haveCode: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: space.lg, marginTop: space.sm },
  haveCodeText: { fontSize: 15, fontWeight: '600', color: signature.gifts.text },
  pending: { marginTop: space.md, marginHorizontal: space.lg * 2, textAlign: 'center', fontSize: 13, lineHeight: 18, color: systemGround.secondaryLabel },
  success: { alignItems: 'center', gap: space.md },
  confetti: { position: 'absolute', top: -60 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  redeem: { gap: space.md },
  codeInput: {
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    fontSize: 22,
    letterSpacing: 4,
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.text,
  },
  rules: { gap: space.xs },
});
