import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Sheet, Txt } from '@/components/ui';
import { TIME_SKIPS, type SteerBlock } from '@/lib/chat-steer';
import { colors, space } from '@/theme';
import type { TimeSkip } from '@/types';

const GLYPH: Record<TimeSkip, keyof typeof Ionicons.glyphMap> = {
  later: 'hourglass-outline',
  evening: 'partly-sunny-outline',
  nextMorning: 'sunny-outline',
  week: 'calendar-outline',
};

/**
 * The chat "+" menu's Time skip (Character.AI teardown item 5): how far the story moves on, as
 * equal choices in one grey box, then what it costs and that it is story time only. While the
 * chat cannot move on (a reply on its way, their answer still to come, three in a row) the
 * choices rest and a line says why.
 */
export function TimeSkipSheet({
  visible,
  block,
  onClose,
  onPick,
}: {
  visible: boolean;
  block: SteerBlock | null;
  onClose: () => void;
  onPick: (skip: TimeSkip) => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('chat.skipTitle')}>
      <Txt style={styles.lead}>{t('chat.skipLead')}</Txt>
      <View style={styles.box}>
        {TIME_SKIPS.map((skip, i) => (
          <Pressable
            key={skip}
            disabled={!!block}
            onPress={() => onPick(skip)}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!block }}
            accessibilityLabel={`${t(`chat.skip.${skip}`)}, ${t(`chat.skipHint.${skip}`)}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed, !!block && styles.off]}>
            <View style={styles.tile}>
              <Ionicons name={GLYPH[skip]} size={18} color={colors.text} />
            </View>
            <View style={[styles.body, i < TIME_SKIPS.length - 1 && styles.line]}>
              <View style={styles.text}>
                <Txt style={styles.title}>{t(`chat.skip.${skip}`)}</Txt>
                <Txt style={styles.hint}>{t(`chat.skipHint.${skip}`)}</Txt>
              </View>
              <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
            </View>
          </Pressable>
        ))}
      </View>
      <Txt style={styles.note}>{block ? t(`chat.steerBlocked.${block}`) : t('chat.skipNote')}</Txt>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  lead: { marginBottom: space.md, fontSize: 15, lineHeight: 20, color: colors.textSecondary },
  box: { borderRadius: 14, backgroundColor: colors.bg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  pressed: { backgroundColor: colors.surfaceAlt },
  off: { opacity: 0.45 },
  tile: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  body: { flex: 1, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.lg },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  text: { flex: 1, gap: 1 },
  title: { fontSize: 17, letterSpacing: -0.4, color: colors.text },
  hint: { fontSize: 13, color: colors.textSecondary },
  note: { marginTop: space.md, fontSize: 13, lineHeight: 18, color: colors.textSecondary, textAlign: 'center' },
});
