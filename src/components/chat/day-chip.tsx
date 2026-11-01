import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui';
import { dayKey, todayKey } from '@/mock';
import { colors, space } from '@/theme';

/**
 * "Today", "Yesterday" or the date, between messages from different days (chats and groups); the
 * time stands under the messages. Plain grey text, as in iOS Messages.
 */
export function DayChip({ iso }: { iso: string }) {
  const { t, i18n } = useTranslation();
  const key = dayKey(iso);
  const label =
    key === todayKey()
      ? t('chat.dayToday')
      : key === dayKey(new Date(Date.now() - 86_400_000))
        ? t('chat.dayYesterday')
        : new Date(iso).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <View style={styles.row}>
      <Txt style={[styles.line, styles.day]} center>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingTop: space.md + 2, paddingBottom: space.sm },
  line: { fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  day: { fontWeight: '600' },
});
