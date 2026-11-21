import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { InkText, PillButton } from '@/components/ink';
import { Sheet, ShellIcon } from '@/components/ui';
import { needsFreeOutNotice } from '@/lib/use-free-messages';
import { useAppStore } from '@/store/use-app-store';
import { space } from '@/theme';
import { ink } from '@/theme/ink';

/**
 * Once a day, at the first message past today's free count (owner, 2026-11-16): the free messages are
 * used, a message now costs a shell, and how many shells there are. Keep talking (or closing it) and
 * the typed message stays in the field for one more tap; Get shells opens the shell packs. Either way
 * it does not come back today.
 */
export function FreeUsedSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const shells = useAppStore((s) => s.wallet.shells);
  const seeFreeOut = useAppStore((s) => s.seeFreeOut);
  const keep = () => {
    seeFreeOut();
    onClose();
  };
  const getShells = () => {
    seeFreeOut();
    onClose();
    router.push('/store/shell?tab=shells');
  };
  return (
    // Closing it any way counts as seen: it never comes back the same day (a backdrop tap on the A51
    // brought it back at the next message).
    <Sheet visible={visible} onClose={keep}>
      <View style={styles.body}>
        <InkText variant="card" center accessibilityRole="header">
          {t('chat.freeUsedTitle')}
        </InkText>
        <View style={styles.balance} accessible accessibilityLabel={t('plans.shells', { count: shells })}>
          <ShellIcon size={28} />
          <InkText variant="numeral">{String(shells)}</InkText>
        </View>
        <InkText variant="sub" center color={ink.text2}>
          {t('chat.freeUsedLine')}
        </InkText>
        <View style={styles.buttons}>
          <PillButton label={t('chat.freeUsedKeep')} onPress={keep} />
          <PillButton label={t('chat.freeUsedShells')} kind="quiet" onPress={getShells} />
        </View>
      </View>
    </Sheet>
  );
}

/**
 * The gate a chat puts before anything that spends a message: `allow(cost)` is false (and the sheet
 * opens) only at today's first paid message; render `sheet` once in the screen.
 */
export function useFreeOutGate() {
  const [open, setOpen] = useState(false);
  const allow = (cost: number) => {
    if (!needsFreeOutNotice(cost)) return true;
    setOpen(true);
    return false;
  };
  return { allow, sheet: <FreeUsedSheet visible={open} onClose={() => setOpen(false)} /> };
}

const styles = StyleSheet.create({
  body: { gap: space.md, paddingTop: space.sm },
  balance: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: space.sm },
  buttons: { gap: space.sm, marginTop: space.sm },
});
