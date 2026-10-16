import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, ClayIcon, Sheet, Txt } from '@/components/ui';
import { planStatus, PLANS, TOP_UPS } from '@/economy/plans';
import { callClock } from '@/lib/format';
import { minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, palette, space } from '@/theme';

import { planDate, planTime } from './copy';

/**
 * A member's call minutes ran out: before a call, or as one ends. They can add ten
 * minutes with shells, move up to Pro, or leave it there; chat is not affected.
 */
export function OutOfMinutesSheet({
  visible,
  name,
  talked,
  onAdded,
  onNoShells,
  onGetPro,
  onDone,
}: {
  visible: boolean;
  /** Who was on the call; with `talked`, the sheet says they said goodnight. */
  name?: string;
  /** Seconds of calls this period, counting the call that just ran out. */
  talked?: number;
  onAdded: () => void;
  /** Not enough shells for the top-up: the caller opens the shell store. */
  onNoShells: () => void;
  onGetPro: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const wallet = useAppStore((s) => s.wallet);
  const topUpMinutes = useAppStore((s) => s.topUpMinutes);

  const now = Date.now();
  const status = planStatus(wallet.subscription, now);
  const back = minutesOf(wallet, 'call', now).resetsAt;
  const topUp = TOP_UPS.call;

  const add = () => {
    if (topUpMinutes('call') === 'noShells') onNoShells();
    else onAdded();
  };

  return (
    <Sheet visible={visible} onClose={onDone}>
      <View style={styles.head}>
        <ClayIcon name="calls" size={52} tile={false} />
        <View style={styles.flex}>
          <Txt variant="h3">{t('plans.outTitle')}</Txt>
          {name && talked != null ? (
            <Txt variant="body" color={colors.textSecondary}>
              {t('plans.outSaidBye', { name, time: callClock(talked) })}
            </Txt>
          ) : null}
        </View>
      </View>

      {status && back ? (
        <Txt variant="body" color={colors.textSecondary} style={styles.copy}>
          {t('plans.outBody', { plan: t(`plans.name.${status.plan}`), date: planDate(back) })}
        </Txt>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={t('plans.addMinutes', { time: planTime(t, topUp.seconds), count: topUp.shells })}
          size="lg"
          full
          onPress={add}
        />
        <Txt variant="smallStrong" color={palette.shellText} center>
          {t('plans.youHave', { count: wallet.shells })}
        </Txt>
        {status?.plan !== 'pro' ? (
          <Button
            label={t('plans.getPro', { time: planTime(t, PLANS.pro.callSeconds) })}
            variant="secondary"
            full
            onPress={onGetPro}
          />
        ) : null}
        <Button label={t('common.done')} variant="ghost" full onPress={onDone} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  copy: { marginTop: space.lg },
  actions: { gap: space.sm, marginTop: space.xl },
});
