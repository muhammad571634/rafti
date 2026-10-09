import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { LuckyWheel } from '@/components/lucky-wheel';
import {
  Anim,
  Button,
  Header,
  ClayIcon,
  type ClayIconName,
  ListRow,
  PressableScale,
  Screen,
  SectionLabel,
  ShellBadge,
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
import { colors, fonts, hitSlop, palette, radius, space } from '@/theme';

/** How long the stand-in "ad" plays before paying out. */
const AD_MS = 1800;
const ROW_ICON = 38;
const WAY_ICON = 36;
const SHARE_WAY_ICONS = { call: 'calls', board: 'board', invite: 'invite' } as const;

/**
 * Free shells: the daily check-in, the lucky wheel, then one "More shells" box
 * (video, share, invite) in the calm-cards style (docs/design-style.md). Every
 * limit lives in the store so it survives a restart.
 */
export default function GiftsScreen() {
  const { t } = useTranslation();

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
    <Screen background={colors.bgPlain}>
      <Header title={t('gifts.title')} right={<ShellBadge count={shells} tone="neutral" style={styles.balance} />} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <SectionLabel
          tone="section"
          title={t('gifts.checkIn')}
          right={
            <Txt variant="small" color={colors.textSecondary}>
              {t('gifts.dayOf', { day: Math.max(1, daily.checkInDay), total: DAILY_CHECK_IN.length })}
            </Txt>
          }
        />
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
                  {claimed ? (
                    <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />
                  ) : (
                    <Txt variant="smallStrong">{day}</Txt>
                  )}
                </View>
                {last && !claimed ? (
                  <View style={styles.offer}>
                    <Txt variant="caption" color={colors.brandText} style={styles.bold}>
                      {shown}
                    </Txt>
                  </View>
                ) : (
                  <Txt variant="caption" color={claimed ? colors.text : colors.textMuted} style={styles.bold}>
                    {shown}
                  </Txt>
                )}
              </View>
            );
          })}
        </View>

        <SectionLabel
          tone="section"
          title={t('gifts.wheel')}
          right={
            <View style={styles.pill}>
              <Txt variant="caption" color={colors.textSecondary} style={styles.bold}>
                {spinStatus}
              </Txt>
            </View>
          }
        />
        <View style={styles.wheel}>
          <LuckyWheel
            size={264}
            disabled={!canSpin}
            onSpin={() => spinWheel()?.index ?? null}
            onStop={(index) => setReward(WHEEL_SEGMENTS[index])}
          />
        </View>

        <SectionLabel
          tone="section"
          title={t('gifts.moreShells')}
          right={
            <PressableScale
              hitSlop={hitSlop}
              scaleTo={0.88}
              accessibilityLabel={t('gifts.shareRulesTitle')}
              onPress={() => setRulesOpen(true)}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
            </PressableScale>
          }
        />
        <View style={styles.ways}>
          <WayRow
            icon="play"
            title={t('gifts.watchAd')}
            subtitle={adsLeft ? t('gifts.watchAdReward', { count: AD_REWARD, left: adsLeft }) : t('gifts.adsDone')}
            action={
              <Button
                label={t('gifts.watch')}
                size="sm"
                variant="secondary"
                onPress={playAd}
                loading={watching}
                disabled={!adsLeft}
              />
            }
          />
          <View style={styles.divider} />
          <WayRow
            icon="plane"
            title={t('gifts.shareTitle')}
            subtitle={t('gifts.shareSub', { count: SHARE_REWARD })}
            action={
              <Button
                label={sharedToday ? t('gifts.sharedToday') : t('gifts.share')}
                size="sm"
                variant="secondary"
                disabled={sharedToday}
                onPress={shareToday}
              />
            }
          />
          <View style={styles.divider} />
          <WayRow
            icon="invite"
            title={t('gifts.inviteTitle')}
            subtitle={t('gifts.inviteSub', { count: INVITE_REWARD, done: invited, total: INVITES_PER_WEEK })}
            action={<Button label={t('gifts.inviteNow')} size="sm" variant="secondary" onPress={invite} />}
          />
        </View>

        <View style={styles.codeRow}>
          <View style={styles.codeTile}>
            <Ionicons name="gift-outline" size={19} color={colors.text} />
          </View>
          <Txt variant="bodyStrong" style={styles.flex}>
            {t('gifts.yourCode')}
          </Txt>
          <Txt variant="figure" style={styles.code} selectable>
            {code}
          </Txt>
          <PressableScale
            hitSlop={hitSlop}
            scaleTo={0.88}
            accessibilityLabel={t('gifts.copyCode')}
            style={styles.copy}
            onPress={() => void copyCode()}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.text} />
          </PressableScale>
        </View>
        {user.redeemedInvite ? null : (
          <PressableScale scaleTo={0.96} style={styles.haveCode} onPress={() => setRedeemOpen(true)}>
            <Txt variant="smallStrong" color={colors.textSecondary}>
              {t('gifts.haveCode')}
            </Txt>
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
          <Button
            label={t('gifts.redeem', { count: INVITE_REWARD })}
            full
            disabled={!codeInput.trim()}
            onPress={redeem}
          />
        </View>
      </Sheet>

      <Sheet visible={rulesOpen} onClose={() => setRulesOpen(false)} title={t('gifts.shareRulesTitle')}>
        <View style={styles.rules}>
          {(['call', 'board', 'invite'] as const).map((way) => (
            <ListRow
              key={way}
              title={t(`gifts.shareWays.${way}`)}
              left={<ClayIcon name={SHARE_WAY_ICONS[way]} size={ROW_ICON} />}
            />
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

/** One way to earn shells in the "More shells" box: art, two lines, one secondary button. */
function WayRow({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ClayIconName;
  title: string;
  subtitle: string;
  action: React.ReactNode;
}) {
  return (
    <View style={styles.way}>
      <ClayIcon name={icon} size={WAY_ICON} tile={false} />
      <View style={styles.flex}>
        <Txt variant="bodyStrong">{title}</Txt>
        <Txt variant="small" color={colors.textSecondary}>
          {subtitle}
        </Txt>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  balance: { marginRight: space.sm },
  scroll: { paddingBottom: space.xxl },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: space.lg,
    marginTop: space.sm,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  day: { alignItems: 'center', gap: space.xs + 2 },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayClaimed: { backgroundColor: colors.text },
  // Tomorrow's day: the next one to come back for.
  dayNext: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.text },
  offer: {
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primarySofter,
  },
  pill: {
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  wheel: { alignItems: 'center', paddingTop: space.sm },
  ways: {
    marginHorizontal: space.lg,
    marginTop: space.sm,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  way: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: 14 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 14 + WAY_ICON + space.md },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
  },
  codeTile: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  code: { letterSpacing: 3 },
  copy: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  haveCode: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    marginTop: space.md,
  },
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
