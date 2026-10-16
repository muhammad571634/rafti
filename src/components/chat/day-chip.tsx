import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui';
import { clockTime } from '@/lib/format';
import { dayKey, todayKey } from '@/mock';
import { colors, space } from '@/theme';

/**
 * "Today 00:58", "Yesterday 23:58" or the date and time, between messages from different days
 * or after an hour of quiet (chats and groups). Plain grey text, as in iOS Messages.
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
      <Txt style={styles.line} center>
        <Txt style={[styles.line, styles.day]}>{label}</Txt> {clockTime(iso)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingTop: space.md + 2, paddingBottom: space.sm },
  line: { fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  day: { fontWeight: '600' },
});
