import type { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { PressableScale, SFIcon, Sheet, Txt } from '@/components/ui';
import { fonts, isDark } from '@/theme';

export type PublishKind = 'plan' | 'diary' | 'board';

const INK = isDark ? '#FFFFFF' : '#1F1A17';

/**
 * Three big soft tiles (the four-tab prototype): a plan in apricot, a diary page in paper, a board
 * note in sky; each a light tint with ink on it (deep tints with white in dark mode).
 */
const OPTIONS: { kind: PublishKind; ios: SFSymbol; icon: keyof typeof Ionicons.glyphMap; fill: string }[] = [
  { kind: 'plan', ios: 'calendar', icon: 'calendar', fill: isDark ? '#4A2E1E' : '#FFE6D4' },
  { kind: 'diary', ios: 'book.closed.fill', icon: 'book', fill: isDark ? '#3E3226' : '#F3E2D2' },
  { kind: 'board', ios: 'pin.fill', icon: 'pin', fill: isDark ? '#163A44' : '#CFF2FA' },
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
  // The diary page from here goes to this friend, so its hint says so (the diary's own words).
  const hint = (kind: PublishKind) => (kind === 'diary' ? t('diary.shareWith', { name }) : t(`us.publishHint.${kind}`, { name }));
  return (
    <Sheet visible={visible} onClose={onClose} title={t('us.add')}>
      <View style={styles.tiles}>
        {OPTIONS.map(({ kind, ios, icon, fill }) => (
          <PressableScale
            key={kind}
            scaleTo={0.97}
            onPress={() => onPick(kind)}
            accessibilityRole="button"
            accessibilityLabel={`${t(`us.publishKind.${kind}`)}, ${hint(kind)}`}
            style={[styles.tile, { backgroundColor: fill }]}>
            <View style={styles.icon}>
              <SFIcon ios={ios} icon={icon} size={22} color={INK} />
            </View>
            <View style={styles.text}>
              <Txt style={styles.title} maxFontSizeMultiplier={1.3}>
                {t(`us.publishKind.${kind}`)}
              </Txt>
              <Txt style={styles.hint}>{hint(kind)}</Txt>
            </View>
          </PressableScale>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  tiles: { gap: 10 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)',
  },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.playful, fontSize: 17, lineHeight: 22, color: INK },
  hint: { fontSize: 13, lineHeight: 17, color: INK },
});
