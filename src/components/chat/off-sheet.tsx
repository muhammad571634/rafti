import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, Sheet } from '@/components/ui';
import { OFF_REASONS, type OffReason } from '@/lib/reply-rating';
import { space } from '@/theme';

/**
 * "What was off?" after 👎 on their reply (Character.AI teardown §12, flows.md D109): one reason,
 * then New reply, which asks for a version that fixes it. A simple task the user finishes and
 * returns from (HIG Sheets); × closes it and the 👎 stays. The friend never sees any of it.
 */
export function OffSheet({
  visible,
  name,
  reason,
  onPick,
  onClose,
  onNewReply,
}: {
  visible: boolean;
  /** The friend's name, for "Not like Kai". */
  name: string;
  reason?: OffReason;
  onPick: (reason: OffReason | undefined) => void;
  onClose: () => void;
  onNewReply: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={t('chat.offTitle')}>
      <View style={styles.chips}>
        {OFF_REASONS.map((r) => (
          <Chip
            key={r}
            label={t(`chat.off.${r}`, { name })}
            active={reason === r}
            onPress={() => onPick(reason === r ? undefined : r)}
          />
        ))}
      </View>
      <Button label={t('chat.newReply')} size="lg" full onPress={onNewReply} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
});
