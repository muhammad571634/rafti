import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { moduleTile, SFIcon, Sheet, Txt } from '@/components/ui';
import { colors, space, systemColors } from '@/theme';

export type PublishKind = 'plan' | 'diary' | 'board';

/** iOS-style icons (approved prototype `UsAdd.dc.html`): Calendar red, then Diary and Board in their Today colours. */
const OPTIONS: { kind: PublishKind; ios: SFSymbol; icon: keyof typeof Ionicons.glyphMap; fill: string }[] = [
  { kind: 'plan', ios: 'calendar', icon: 'calendar', fill: systemColors.red },
  { kind: 'diary', ...moduleTile('diary') },
  { kind: 'board', ...moduleTile('board') },
];

/** The [Us] "+": add a plan, write a diary page or pin a note on the board. */
export function PublishSheet({
  visible,
  onClose,
  onPick,
  name,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (kind: PublishKind) => void;
  /** The friend picked on Us, named in the hints. */
  name: string;
}) {
  const { t } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('us.add')}>
      <View style={styles.group}>
        {OPTIONS.map(({ kind, ios, icon, fill }, i) => (
          <Pressable
            key={kind}
            onPress={() => onPick(kind)}
            accessibilityRole="button"
            accessibilityLabel={`${t(`us.publishKind.${kind}`)}, ${t(`us.publishHint.${kind}`, { name })}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={[styles.icon, { backgroundColor: fill }]}>
              <SFIcon ios={ios} icon={icon} size={16} color={colors.white} />
            </View>
            <View style={[styles.body, i < OPTIONS.length - 1 && styles.line]}>
              <View style={styles.text}>
                <Txt style={styles.title}>{t(`us.publishKind.${kind}`)}</Txt>
                <Txt style={styles.hint}>{t(`us.publishHint.${kind}`, { name })}</Txt>
              </View>
              <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
            </View>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: 14, backgroundColor: colors.bg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  pressed: { backgroundColor: colors.surfaceAlt },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.lg },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  text: { flex: 1, gap: 1 },
  title: { fontSize: 17, letterSpacing: -0.4 },
  hint: { fontSize: 13, color: colors.textSecondary },
});
