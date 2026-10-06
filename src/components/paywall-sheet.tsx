import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ShellBadge, Button, Icon3D, Sheet, Txt } from '@/components/ui';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';

/**
 * Shown when an action needs more shells than the wallet holds. Every exit leads
 * somewhere useful: buy, earn free ones, or go unlimited with a membership.
 */
export function PaywallSheet({
  need,
  onClose,
  chat = false,
}: {
  /** Shells required; `null` hides the sheet. */
  need: number | null;
  onClose: () => void;
  /** Chat copy explains the per-message price. */
  chat?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const shells = useAppStore((s) => s.wallet.shells);

  const go = (route: '/store/shell' | '/gifts') => {
    onClose();
    router.push(route);
  };

  return (
    <Sheet visible={need != null} onClose={onClose}>
      <View style={styles.head}>
        <Icon3D name="shell" size={56} />
        <View style={styles.flex}>
          <Txt variant="h3">{t('paywall.title')}</Txt>
          <ShellBadge count={shells} style={styles.balance} />
        </View>
      </View>

      <Txt variant="body" color={colors.textSecondary} style={styles.copy}>
        {chat ? t('paywall.chatBody') : t('paywall.body', { count: need ?? 0 })}
      </Txt>

      <View style={styles.actions}>
        <Button label={t('paywall.topUp')} onPress={() => go('/store/shell')} full />
        <Button label={t('paywall.earnFree')} variant="secondary" onPress={() => go('/gifts')} full />
        {chat ? (
          <Button label={t('paywall.member')} variant="ghost" onPress={() => go('/store/shell')} full />
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  balance: { alignSelf: 'flex-start', marginTop: space.xs },
  copy: { marginTop: space.lg, marginBottom: space.xl },
  actions: { gap: space.sm },
});
