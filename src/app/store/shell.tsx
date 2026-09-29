import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  ShellIcon,
  Anim,
  Button,
  Card,
  Header,
  Icon3D,
  PressableScale,
  Screen,
  Sheet,
  Txt,
} from '@/components/ui';
import { shortDate } from '@/lib/format';
import { shellCosts, shellPacks, membershipPlans } from '@/mock';
import { memberActive, useAppStore } from '@/store/use-app-store';
import { colors, gradients, palette, radius, shadows, space } from '@/theme';
import type { ShellPack, MemberPlan } from '@/types';

type Success = { kind: 'pack'; amount: number } | { kind: 'plan'; plan: MemberPlan };

export default function ShellStoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const wallet = useAppStore((s) => s.wallet);
  const addShells = useAppStore((s) => s.addShells);
  const subscribe = useAppStore((s) => s.subscribe);

  const [success, setSuccess] = useState<Success | null>(null);
  const isMember = memberActive(wallet);

  const buy = (pack: ShellPack) => {
    // Real builds hand off to StoreKit / Play Billing and credit after the server checks the receipt.
    addShells(pack.shells + pack.bonus);
    setSuccess({ kind: 'pack', amount: pack.shells + pack.bonus });
  };

  const join = (plan: MemberPlan) => {
    subscribe(plan);
    setSuccess({ kind: 'plan', plan });
  };

  return (
    <Screen background={gradients.home}>
      <Header title={t('store.title')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient colors={gradients.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.balance, shadows.card]}>
          <Icon3D name="shell" size={58} />
          <View style={styles.flex}>
            <Txt variant="caption" color={colors.white}>
              {t('store.balance')}
            </Txt>
            <Txt variant="display" color={colors.white}>
              {wallet.shells}
            </Txt>
          </View>
          <PressableScale
            style={styles.freeBtn}
            scaleTo={0.94}
            hitSlop={{ top: 7, bottom: 7 }}
            onPress={() => router.push('/gifts')}>
            <Ionicons name="gift" size={15} color={colors.primary} />
            <Txt variant="caption" color={colors.primary}>
              {t('common.free')}
            </Txt>
          </PressableScale>
        </LinearGradient>

        <View style={styles.grid}>
          {shellPacks.map((pack) => (
            <PressableScale key={pack.id} style={styles.packWrap} scaleTo={0.95} onPress={() => buy(pack)}>
              <View style={[styles.pack, pack.best && styles.packBest, shadows.card]}>
                {pack.best ? (
                  <View style={styles.bestTag}>
                    <Txt variant="tiny" color={colors.white}>
                      {t('store.best')}
                    </Txt>
                  </View>
                ) : null}
                <Icon3D name="shell" size={40} />
                <Txt variant="h3">{pack.shells}</Txt>
                <Txt variant="tiny" color={pack.bonus ? colors.success : 'transparent'}>
                  {t('store.bonus', { count: pack.bonus })}
                </Txt>
                <View style={styles.price}>
                  <Txt variant="smallStrong" color={colors.primary}>
                    {pack.price}
                  </Txt>
                </View>
              </View>
            </PressableScale>
          ))}
        </View>

        <View style={styles.sectionHead}>
          <Icon3D name="crown" size={24} />
          <Txt variant="h3">{t('store.membership')}</Txt>
          {isMember && wallet.memberUntil ? (
            <Txt variant="caption" color={colors.accent} style={styles.until}>
              {t('store.memberUntil', { date: shortDate(wallet.memberUntil) })}
            </Txt>
          ) : null}
        </View>

        {membershipPlans.map((plan) => {
          const active = isMember && wallet.memberPlan === plan.id;
          return (
            <Card key={plan.id} style={[styles.plan, plan.highlight && styles.planHighlight]}>
              <View style={styles.planHead}>
                <Txt variant="title" style={styles.flex}>
                  {t(`store.plans.${plan.id}`)}
                </Txt>
                <Txt variant="h3" color={colors.primary}>
                  {plan.price}
                </Txt>
                <Txt variant="caption" color={colors.textMuted}>
                  {t(`store.periods.${plan.id}`)}
                </Txt>
              </View>
              {plan.perks.map((perk) => (
                <View key={perk} style={styles.perk}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                  <Txt variant="small" color={colors.textSecondary}>
                    {t(`store.perks.${perk}`)}
                  </Txt>
                </View>
              ))}
              <Button
                label={active ? t('store.active') : t('store.subscribe')}
                variant={plan.highlight ? 'primary' : 'soft'}
                size="sm"
                disabled={active}
                onPress={() => join(plan.id)}
                style={styles.planButton}
              />
            </Card>
          );
        })}

        <Card style={styles.costs}>
          <Txt variant="title">{t('store.costs')}</Txt>
          <CostRow label={t('store.costTextMessage')} value={isMember ? 0 : shellCosts.textMessage} />
          <CostRow label={t('store.costListen')} value={shellCosts.voiceReply} />
          <CostRow label={t('store.costCall')} value={shellCosts.callPerMinute} />
          <CostRow label={t('store.costSecretNote')} value={shellCosts.secretNote} />
          <CostRow label={t('store.costPhotoBooth')} value={shellCosts.photoBooth} />
          <CostRow label={t('store.costVoiceClone')} value={shellCosts.characterVoiceClone} />
        </Card>

        <Button label={t('store.restore')} variant="ghost" full />
      </ScrollView>

      <Sheet visible={!!success} onClose={() => setSuccess(null)} center>
        <View style={styles.success}>
          <Anim name="confetti" size={200} loop={false} style={styles.confetti} />
          {success?.kind === 'plan' ? (
            <>
              <Icon3D name="crown" size={84} />
              <Txt variant="h3" center>
                {t('store.welcomeMember', { plan: t(`store.plans.${success.plan}`) })}
              </Txt>
            </>
          ) : (
            <>
              <Icon3D name="shell" size={84} />
              <Txt variant="display" color={palette.shellText} center>
                {t('store.purchased', { count: success?.kind === 'pack' ? success.amount : 0 })}
              </Txt>
            </>
          )}
          <Button label={t('common.done')} onPress={() => setSuccess(null)} full />
        </View>
      </Sheet>
    </Screen>
  );
}

function CostRow({ label, value }: { label: string; value: number }) {
  const { t } = useTranslation();

  return (
    <View style={styles.costRow}>
      <Txt variant="small" color={colors.textSecondary}>
        {label}
      </Txt>
      {value === 0 ? (
        <Txt variant="smallStrong" color={colors.success}>
          {t('common.free')}
        </Txt>
      ) : (
        <View style={styles.costValue}>
          <ShellIcon size={14} />
          <Txt variant="smallStrong">{value}</Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.huge },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.xl,
  },
  freeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  packWrap: { width: '48%' },
  pack: {
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  packBest: { borderColor: colors.primary },
  bestTag: {
    position: 'absolute',
    top: -1,
    right: -1,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  price: {
    marginTop: space.xs,
    paddingHorizontal: space.lg,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  until: { marginLeft: 'auto' },
  plan: { gap: space.sm, borderWidth: 1.5, borderColor: 'transparent' },
  planHighlight: { borderColor: colors.accentBorder, backgroundColor: palette.mint50 },
  planHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  planButton: { marginTop: space.xs },
  costs: { gap: space.sm },
  costRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  costValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  success: { alignItems: 'center', gap: space.md },
  confetti: { position: 'absolute', top: -50 },
});
