import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui';
import { dayKey, todayKey } from '@/mock';
import { colors, isDark, radius, space } from '@/theme';

/** "Today", "Yesterday" or the date, between messages from different days (chats and groups). */
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
    <View style={styles.dayRow}>
      <View style={styles.dayChip}>
        <Txt variant="caption" color={colors.textSecondary}>
          {label}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dayRow: { alignItems: 'center', marginTop: space.md, marginBottom: space.md },
  dayChip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    backgroundColor: isDark ? 'rgba(28,33,72,0.85)' : colors.onMediaSoft,
  },
});
