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
  IconTile,
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

/**
 * Free shells, three ways — the reference's daily login, roulette wheel and
 * rewarded videos. Every limit lives in the store so it survives a restart.
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
      <Header title={t('gifts.title')} right={<ShellBadge count={shells} style={styles.balance} />} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <SectionLabel
          title={t('gifts.checkInLabel', { day: Math.max(1, daily.checkInDay), total: DAILY_CHECK_IN.length })}
        />
        <View style={styles.days}>
          {DAILY_CHECK_IN.map((amount, index) => {
            const day = index + 1;
            const claimed = day <= daily.checkInDay;
            const isToday = checkedInToday && day === daily.checkInDay;
            const last = index === DAILY_CHECK_IN.length - 1;
            // The surprise day shows its floor ("80+") until it is rolled.
            const shown = last
              ? isToday
                ? String(daily.checkInAmount ?? amount)
                : t('common.atLeast', { count: amount })
              : String(amount);
            const worth =
              last && !isToday ? t('common.range', { min: amount, max: DAILY_CHECK_IN_TOP }) : `+${shown}`;

            return (
              <View
                key={day}
                style={styles.day}
                accessible
                accessibilityLabel={`${isToday ? t('common.today') : t('gifts.day', { count: day })}, ${worth}`}>
                <View style={[styles.dayDot, claimed && styles.dayClaimed, last && !claimed && styles.dayBig]}>
                  {claimed ? (
                    <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />
                  ) : (
                    <Txt variant="smallStrong" color={last ? colors.primary : colors.text}>
                      {day}
                    </Txt>
                  )}
                </View>
                <Txt
                  variant="caption"
                  color={last && !claimed ? colors.primary : colors.textMuted}>
                  {shown}
                </Txt>
              </View>
            );
          })}
        </View>
        <Txt variant="caption" color={colors.textMuted} style={styles.hint}>
          {t('gifts.checkInHint')}
        </Txt>

        <SectionLabel
          title={`${t('gifts.wheel')} · ${
            freeSpinLeft ? t('gifts.freeSpin') : adsLeft ? t('gifts.adSpin') : t('gifts.noSpins')
          }`}
        />
        <View style={styles.wheel}>
          <LuckyWheel
            size={264}
            disabled={!canSpin}
            onSpin={() => spinWheel()?.index ?? null}
            onStop={(index) => setReward(WHEEL_SEGMENTS[index])}
          />
        </View>

        {/* Next: 3D clay icons for invite, share and the ad row, see docs/icons-3d.md step 4. */}
        <SectionLabel title={t('gifts.invite', { count: INVITE_REWARD })} />
        <View style={styles.invite}>
          <View style={styles.codeRow}>
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
          <View
            style={styles.steps}
            accessible
            accessibilityLabel={t('gifts.inviteProgress', { count: invited, total: INVITES_PER_WEEK })}>
            {Array.from({ length: INVITES_PER_WEEK }, (_, i) => (
              <View key={i} style={[styles.step, i < invited && styles.stepOn]} />
            ))}
          </View>
          <View style={styles.progressRow}>
            <Txt variant="caption" color={colors.textMuted}>
              {t('gifts.thisWeek')}
            </Txt>
            <Txt variant="caption" color={colors.textMuted}>
              {invited} / {INVITES_PER_WEEK}
            </Txt>
          </View>
          <Button label={t('gifts.inviteNow')} full onPress={invite} />
          {user.redeemedInvite ? null : (
            <PressableScale scaleTo={0.96} style={styles.haveCode} onPress={() => setRedeemOpen(true)}>
              <Txt variant="smallStrong" color={colors.textSecondary}>
                {t('gifts.haveCode')}
              </Txt>
            </PressableScale>
          )}
        </View>

        <SectionLabel
          title={t('gifts.dailyShare')}
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
        <ListRow
          title={t('gifts.shareReward', { count: SHARE_REWARD })}
          left={<IconTile icon="share-social-outline" />}
          right={
            <Button
              label={sharedToday ? t('gifts.sharedToday') : t('gifts.share')}
              size="sm"
              variant="secondary"
              disabled={sharedToday}
              onPress={shareToday}
            />
          }
        />
      </ScrollView>

      {/* A row, not a pressable: the Watch button beside it is the only control. */}
      <View style={styles.adBar}>
        <ListRow
          title={t('gifts.watchAd')}
          subtitle={adsLeft ? t('gifts.watchAdReward', { count: AD_REWARD, left: adsLeft }) : t('gifts.adsDone')}
          left={<IconTile icon="play-outline" />}
          right={
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
      </View>

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
              left={<IconTile icon={way === 'call' ? 'call-outline' : way === 'board' ? 'pin-outline' : 'person-add-outline'} />}
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

const styles = StyleSheet.create({
  balance: { marginRight: space.sm },
  scroll: { paddingBottom: space.xl },
  days: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.xs },
  day: { alignItems: 'center', gap: space.xs },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayClaimed: { backgroundColor: colors.text, borderColor: colors.text },
  dayBig: { borderColor: colors.primary },
  hint: { paddingHorizontal: space.lg, marginTop: space.md },
  wheel: { alignItems: 'center', paddingTop: space.sm },
  adBar: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: space.md },
  success: { alignItems: 'center', gap: space.md },
  confetti: { position: 'absolute', top: -60 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  invite: { paddingHorizontal: space.lg, gap: space.md },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  code: { flex: 1, letterSpacing: 4 },
  copy: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  steps: { flexDirection: 'row', gap: 4 },
  step: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.border },
  stepOn: { backgroundColor: colors.primary },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -space.xs },
  haveCode: { alignSelf: 'center', minHeight: 40, justifyContent: 'center', paddingHorizontal: space.lg },
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
