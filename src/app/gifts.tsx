import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LuckyWheel } from '@/components/lucky-wheel';
import { PeekingMascot } from '@/components/peeking-mascot';
import { CARD_SHADOW, GroupLabel, STORE } from '@/components/plans/store-look';
import {
  Anim,
  AuroraGlass,
  Button,
  ClayIcon,
  type ClayIconName,
  LargeTitle,
  ListRow,
  PressableScale,
  Screen,
  SFIcon,
  ShellIcon,
  Sheet,
  Txt,
} from '@/components/ui';
import { inviteCodeFor, invitesThisWeek } from '@/lib/invite';
import { shareForReward } from '@/lib/share';
import {
  AD_REWARD,
  INVITE_REWARD,
  INVITES_PER_WEEK,
  SHARE_REWARD,
  DAILY_CHECK_IN,
  DAILY_CHECK_IN_TOP,
  FREE_SPINS_PER_DAY,
  MAX_ADS_PER_DAY,
  WHEEL_SEGMENTS,
  todayKey,
} from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { aurora, colors, fonts, hitSlop, isDark, palette, radius, space } from '@/theme';

/** How long the stand-in "ad" plays before paying out. */
const AD_MS = 1800;
const ROW_ICON = 38;
const WAY_ICON = 36;
const SHARE_WAY_ICONS = { call: 'calls', board: 'board', invite: 'invite' } as const;

/**
 * Free shells: the daily check-in, the lucky wheel, then one "More shells" card (video, share,
 * invite) and your invite code. iOS look on the aurora (2026-10-22, coded at the owner's word):
 * glass back and a shell capsule, large title, white cards, peach capsule buttons as in the
 * Store. Every limit lives in the store so it survives a restart.
 */
export default function GiftsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();

  const shells = useAppStore((s) => s.wallet.shells);
  const daily = useAppStore((s) => s.daily);
  const spinWheel = useAppStore((s) => s.spinWheel);
  const watchAd = useAppStore((s) => s.watchAd);
  const user = useAppStore((s) => s.user);
  const redeemInvite = useAppStore((s) => s.redeemInvite);

  const [reward, setReward] = useState<number | null>(null);
  const [watching, setWatching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const code = inviteCodeFor(user);
  const invited = Math.min(INVITES_PER_WEEK, invitesThisWeek(user.inviteCredits));
  const sharedToday = daily.shareDay === todayKey();

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  // An invite is also a share, so it can pay the day's share reward.
  const invite = () => void shareForReward(t('gifts.inviteMessage', { code, count: INVITE_REWARD }));
  const shareToday = () => void shareForReward(t('gifts.shareMessage'));

  const redeem = () => {
    const result = redeemInvite(codeInput);
    if (result !== 'ok') return setRedeemError(t(`gifts.redeemError.${result}`));
    setRedeemOpen(false);
    setCodeInput('');
    setRedeemError(null);
    setReward(INVITE_REWARD);
  };

  const today = todayKey();
  const checkedInToday = daily.lastLoginDay === today;
  const spinsUsed = daily.spinDay === today ? daily.spinsUsed : 0;
  const adsWatched = daily.adsDay === today ? daily.adsWatched : 0;
  const adsLeft = Math.max(0, MAX_ADS_PER_DAY - adsWatched);
  const freeSpinLeft = spinsUsed < FREE_SPINS_PER_DAY;
  const canSpin = freeSpinLeft || adsLeft > 0;
  const spinStatus = freeSpinLeft ? t('gifts.spinsFree') : adsLeft ? t('gifts.spinsAd') : t('gifts.spinsNone');

  const playAd = () => {
    if (!adsLeft || watching) return;
    setWatching(true);
    // Real builds show an AdMob rewarded video and credit in its reward callback.
    setTimeout(() => {
      setWatching(false);
      const amount = watchAd();
      if (amount) setReward(amount);
    }, AD_MS);
  };

  return (
    <Screen background="aurora">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
        <View style={styles.bar}>
          <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()}>
            <AuroraGlass style={styles.round}>
              <Ionicons name="chevron-back" size={22} color={colors.text} style={styles.backIcon} />
            </AuroraGlass>
          </PressableScale>
          <AuroraGlass style={styles.capsule}>
            <View style={styles.capsuleInner} accessible accessibilityLabel={t('plans.shells', { count: shells })}>
              <ShellIcon size={18} />
              <Txt style={styles.capsuleText}>{shells.toLocaleString('en-US')}</Txt>
            </View>
          </AuroraGlass>
        </View>
        <LargeTitle>{t('gifts.title')}</LargeTitle>

        <View style={styles.labelRow}>
          <GroupLabel>{t('gifts.checkIn')}</GroupLabel>
          <Txt style={styles.labelValue}>
            {t('gifts.dayOf', { day: Math.max(1, daily.checkInDay), total: DAILY_CHECK_IN.length })}
          </Txt>
        </View>
        <View style={[styles.card, styles.days]}>
          <PeekingMascot width={PEEK_WIDTH} />
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
                  {claimed ? <Ionicons name="checkmark" size={17} color="#FFFFFF" /> : <Txt style={styles.dayNumber}>{day}</Txt>}
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

        <View style={styles.labelRow}>
          <GroupLabel>{t('gifts.wheel')}</GroupLabel>
          <View style={styles.statusPill}>
            <Txt style={styles.statusText}>{spinStatus}</Txt>
          </View>
        </View>
        <View style={[styles.card, styles.wheel]}>
          <LuckyWheel
            size={264}
            disabled={!canSpin}
            onSpin={() => spinWheel()?.index ?? null}
            onStop={(index) => setReward(WHEEL_SEGMENTS[index])}
          />
        </View>

        <View style={styles.labelRow}>
          <GroupLabel>{t('gifts.moreShells')}</GroupLabel>
          <PressableScale
            hitSlop={hitSlop}
            scaleTo={0.88}
            accessibilityRole="button"
            accessibilityLabel={t('gifts.shareRulesTitle')}
            style={styles.info}
            onPress={() => setRulesOpen(true)}>
            <Ionicons name="information-circle-outline" size={20} color={aurora.textMuted} />
          </PressableScale>
        </View>
        <View style={styles.card}>
          <WayRow
            icon="play"
            title={t('gifts.watchAd')}
            subtitle={adsLeft ? t('gifts.watchAdReward', { count: AD_REWARD, left: adsLeft }) : t('gifts.adsDone')}
            action={<Capsule label={t('gifts.watch')} onPress={playAd} loading={watching} disabled={!adsLeft} />}
            line
          />
          <WayRow
            icon="plane"
            title={t('gifts.shareTitle')}
            subtitle={t('gifts.shareSub', { count: SHARE_REWARD })}
            action={<Capsule label={sharedToday ? t('gifts.sharedToday') : t('gifts.share')} disabled={sharedToday} onPress={shareToday} />}
            line
          />
          <WayRow
            icon="invite"
            title={t('gifts.inviteTitle')}
            subtitle={t('gifts.inviteSub', { count: INVITE_REWARD, done: invited, total: INVITES_PER_WEEK })}
            action={<Capsule label={t('gifts.inviteNow')} onPress={invite} />}
          />
        </View>

        <View style={[styles.card, styles.codeRow]}>
          <View style={styles.codeTile}>
            <SFIcon ios="gift.fill" icon="gift" size={17} color="#FFFFFF" />
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
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={17} color={STORE.peachInk} />
          </PressableScale>
        </View>
        {user.redeemedInvite ? null : (
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
          <Button label={t('gifts.redeem', { count: INVITE_REWARD })} full disabled={!codeInput.trim()} onPress={redeem} />
        </View>
      </Sheet>

      <Sheet visible={rulesOpen} onClose={() => setRulesOpen(false)} title={t('gifts.shareRulesTitle')}>
        <View style={styles.rules}>
          {(['call', 'board', 'invite'] as const).map((way) => (
            <ListRow key={way} title={t(`gifts.shareWays.${way}`)} left={<ClayIcon name={SHARE_WAY_ICONS[way]} size={ROW_ICON} />} />
          ))}
          <Txt variant="caption" color={colors.textMuted} center>
            {t('gifts.shareRulesLimit', { count: SHARE_REWARD })}
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
    </Screen>
  );
}

/** One way to earn shells: art, two lines, one capsule button. */
function WayRow({
  icon,
  title,
  subtitle,
  action,
  line,
}: {
  icon: ClayIconName;
  title: string;
  subtitle: string;
  action: React.ReactNode;
  line?: boolean;
}) {
  return (
    <View style={styles.way}>
      <ClayIcon name={icon} size={WAY_ICON} tile={false} />
      <View style={styles.wayBody}>
        <Txt style={styles.wayTitle}>{title}</Txt>
        <Txt style={styles.waySub}>{subtitle}</Txt>
      </View>
      {action}
      {line ? <View style={styles.wayLine} /> : null}
    </View>
  );
}

/** The peach capsule button of a way row (the Store's top-up look). */
function Capsule({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <PressableScale
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.capsuleButton, disabled && styles.capsuleOff]}>
      {loading ? <ActivityIndicator size="small" color={STORE.peachInk} /> : <Txt style={styles.capsuleButtonText}>{label}</Txt>}
    </PressableScale>
  );
}

/** The check-in mascot: 104pt wide, about 72pt of it stands above the card. */
const PEEK_WIDTH = 104;
const PEEK_ROOM = 40;
const WELL = isDark ? 'rgba(118,118,128,0.24)' : '#F2F2F7';

const styles = StyleSheet.create({
  bar: {
    height: 44,
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backIcon: { marginLeft: -2 },
  capsule: { height: 40, borderRadius: 20 },
  capsuleInner: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 14 },
  capsuleText: { fontSize: 15, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  card: { marginHorizontal: space.lg, borderRadius: 20, backgroundColor: aurora.card, ...CARD_SHADOW },
  labelRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  labelValue: { marginBottom: 6, marginRight: space.lg * 2, fontSize: 13, color: aurora.textMuted },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // Room for the mascot peeking over the card, between the label's two texts.
    marginTop: PEEK_ROOM,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
  },
  day: { alignItems: 'center', gap: 6 },
  dayDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: WELL, alignItems: 'center', justifyContent: 'center' },
  dayClaimed: { backgroundColor: aurora.tint },
  // Tomorrow's day: the next one to come back for.
  dayNext: { backgroundColor: aurora.card, borderWidth: 2, borderColor: aurora.tint },
  dayNumber: { fontSize: 15, fontWeight: '700', color: colors.text },
  dayAmount: { fontSize: 12, fontWeight: '700', color: aurora.textMuted, fontVariant: ['tabular-nums'] },
  dayAmountOn: { color: colors.text },
  offer: { paddingHorizontal: 6, borderRadius: 9, backgroundColor: STORE.peachSoft },
  offerText: { fontSize: 12, fontWeight: '700', color: STORE.peachInk },
  statusPill: {
    height: 24,
    marginBottom: 4,
    marginRight: space.lg,
    paddingHorizontal: 10,
    borderRadius: 12,
    justifyContent: 'center',
    backgroundColor: STORE.peachSoft,
  },
  statusText: { fontSize: 13, fontWeight: '700', color: STORE.peachInk },
  wheel: { alignItems: 'center', paddingVertical: space.lg },
  info: { marginBottom: 2, marginRight: space.lg + 4, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  way: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  wayBody: { flex: 1, minWidth: 0, gap: 2, paddingVertical: 10 },
  wayTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  waySub: { fontSize: 13, color: aurora.textMuted },
  wayLine: {
    position: 'absolute',
    left: 14 + WAY_ICON + 12,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: aurora.separator,
  },
  capsuleButton: {
    minWidth: 64,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STORE.peachSoft,
  },
  capsuleOff: { opacity: 0.5 },
  capsuleButtonText: { fontSize: 15, fontWeight: '700', color: STORE.peachInk },
  codeRow: { marginTop: 22, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  codeTile: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF2D55' },
  codeLabel: { flex: 1, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  code: { fontSize: 17, fontWeight: '700', letterSpacing: 3, color: colors.text },
  copy: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: STORE.peachSoft },
  haveCode: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: space.lg, marginTop: space.sm },
  haveCodeText: { fontSize: 15, fontWeight: '600', color: STORE.peachInk },
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
