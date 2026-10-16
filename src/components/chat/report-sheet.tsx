import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { REPORT_REASONS, type ReportReason } from '@/ai/safety';
import { Button, Sheet, Txt } from '@/components/ui';
import { colors, space } from '@/theme';

/**
 * "What's wrong?" for a reported message (approved prototype `SheetReport.dc.html`): the reasons
 * in a grey inset group; once sent, a green tick and a thank-you with Done.
 */
export function ReportSheet({
  visible,
  reported,
  onClose,
  onReport,
}: {
  visible: boolean;
  /** True once a reason was sent: the sheet thanks instead of asking. */
  reported: boolean;
  onClose: () => void;
  onReport: (reason: ReportReason) => void;
}) {
  const { t } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={reported ? undefined : t('safety.reportTitle')}>
      {reported ? (
        <View style={styles.thanks}>
          <View style={styles.tick}>
            <Ionicons name="checkmark" size={30} color={colors.white} />
          </View>
          <Txt style={styles.thanksText} center accessibilityRole="header">
            {t('safety.reportThanks')}
          </Txt>
          <Button label={t('safety.done')} size="lg" variant="secondary" full onPress={onClose} />
        </View>
      ) : (
        <View style={styles.group}>
          {REPORT_REASONS.map((reason, i) => (
            <Pressable
              key={reason}
              onPress={() => onReport(reason)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, i < REPORT_REASONS.length - 1 && styles.rowLine, pressed && styles.pressed]}>
              <Txt style={styles.rowText}>{t(`safety.reasons.${reason}`)}</Txt>
              <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
            </Pressable>
          ))}
        </View>
      )}
    </Sheet>
  );
}

/** iOS system green: "sent". */
const SENT = '#34C759';

const styles = StyleSheet.create({
  group: { borderRadius: 14, backgroundColor: colors.bg, overflow: 'hidden' },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfaceAlt },
  rowText: { flex: 1, fontSize: 17, letterSpacing: -0.4 },
  thanks: { alignItems: 'center', gap: space.md, paddingTop: space.md },
  tick: { width: 56, height: 56, borderRadius: 28, backgroundColor: SENT, alignItems: 'center', justifyContent: 'center' },
  thanksText: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4, marginBottom: space.sm },
});
