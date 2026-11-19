import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBackToClose } from '@/components/chat/message-menu';
import { moduleTile, PressableScale, Txt } from '@/components/ui';
// Only chats open it, and a chat is always dark (appearance B): the night tokens in both themes.
import { bottomRoom, nightColors as colors, moduleFills, space } from '@/theme';

export type AttachKey = 'scene' | 'timeSkip' | 'photo' | 'secretNote' | 'quiz' | 'truthOrDare' | 'date' | 'dailyCalls' | 'diary' | 'more' | 'branches';

/** More is no module: Apple's grey fill, as iOS's own More rows. */
const MORE_FILL = 'rgba(118,118,128,0.36)';

/**
 * Two rows of three (audit §6.2, prototype `docs/prototypes/more-sheet.html`): the five things people
 * use every day, then More (games and story tools, `MoreSheet`). Modules wear their own colour
 * (`moduleTile`), the same as on Today. No Voice here: the mic in the field records.
 */

const ITEMS: { key: AttachKey; icon: keyof typeof Ionicons.glyphMap; fill: string }[] = [
  { key: 'photo', icon: 'image', fill: moduleFills.photo },
  { key: 'secretNote', ...moduleTile('note') },
  { key: 'diary', ...moduleTile('diary') },
  { key: 'date', ...moduleTile('date') },
  { key: 'dailyCalls', ...moduleTile('calls') },
  // Games and story tools live behind More (audit §6.2): one sheet, the same as Us opens.
  { key: 'more', icon: 'ellipsis-horizontal', fill: MORE_FILL },
];

const COLUMNS = 3;

/**
 * The chat's "+" panel (owner, 2026-11-08, canvas v1): a dark card in the keyboard's place, under
 * the composer, so the chat stays in view above it and the "+" turns into ×. Typing in the field,
 * ×, Android's back or a pick closes it.
 */
export function AttachMenu({
  visible,
  onClose,
  onPick,
  hide = [],
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (key: AttachKey) => void;
  /** Items this chat has no place for (a group has no scenes yet). */
  hide?: AttachKey[];
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  useBackToClose(visible, onClose);
  if (!visible) return null;
  const items = ITEMS.filter((item) => !hide.includes(item.key));
  // More is the sheet's own title, not an attachment.
  const label = (key: AttachKey) => (key === 'more' ? t('more.title') : t(`chat.attachments.${key}`));

  return (
    <View style={[styles.panel, { paddingBottom: bottomRoom(insets.bottom, space.lg) }]} accessibilityRole="menu">
      {Array.from({ length: Math.ceil(items.length / COLUMNS) }, (_, row) => (
        <View key={row} style={styles.row}>
          {items.slice(row * COLUMNS, row * COLUMNS + COLUMNS).map((item) => (
            <PressableScale
              key={item.key}
              scaleTo={0.94}
              style={styles.item}
              accessibilityRole="menuitem"
              accessibilityLabel={label(item.key)}
              onPress={() => onPick(item.key)}>
              <View style={[styles.icon, { backgroundColor: item.fill }]}>
                <Ionicons name={item.icon} size={26} color={colors.white} />
              </View>
              <Txt style={styles.label} center lines={2}>
                {label(item.key)}
              </Txt>
            </PressableScale>
          ))}
          {/* A short last row keeps its tiles in their columns. */}
          {Array.from({ length: COLUMNS - items.slice(row * COLUMNS, row * COLUMNS + COLUMNS).length }, (_, i) => (
            <View key={`gap-${i}`} style={styles.item} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: space.sm,
    paddingTop: space.xl,
    paddingHorizontal: space.md,
    gap: space.lg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row', gap: space.sm },
  item: { flex: 1, alignItems: 'center', gap: space.sm },
  icon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  // Two lines, so a long name ("Секретная записка") is never cut.
  label: { fontSize: 13, lineHeight: 16, minHeight: 32, fontWeight: '600', color: colors.text },
});
