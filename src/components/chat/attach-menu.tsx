import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBackToClose } from '@/components/chat/message-menu';
import { moduleTile, PressableScale, Txt } from '@/components/ui';
// Only chats open it, and a chat is always dark (appearance B): the night tokens in both themes.
import { bottomRoom, nightColors as colors, moduleFills, space, systemColors } from '@/theme';

export type AttachKey = 'scene' | 'timeSkip' | 'photo' | 'secretNote' | 'quiz' | 'truthOrDare' | 'date' | 'dailyCalls' | 'diary';

/**
 * Three rows of three (canvas v1 `Plus`): what you send, what you do together, the story. Modules
 * wear their own colour (`moduleTile`), the same as on Today; the games take hues no module here
 * uses. No Voice here: the mic in the field records.
 */
const ITEMS: { key: AttachKey; icon: keyof typeof Ionicons.glyphMap; fill: string }[] = [
  { key: 'photo', icon: 'image', fill: moduleFills.photo },
  { key: 'secretNote', ...moduleTile('note') },
  { key: 'diary', ...moduleTile('diary') },
  { key: 'date', ...moduleTile('date') },
  { key: 'truthOrDare', icon: 'dice', fill: systemColors.purple },
  { key: 'quiz', icon: 'help', fill: systemColors.indigo },
  { key: 'scene', icon: 'film', fill: systemColors.teal },
  // A clock's grey, as iOS's Clock: story time, not a module.
  { key: 'timeSkip', icon: 'time', fill: systemColors.gray },
  { key: 'dailyCalls', ...moduleTile('calls') },
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
              accessibilityLabel={t(`chat.attachments.${item.key}`)}
              onPress={() => onPick(item.key)}>
              <View style={[styles.icon, { backgroundColor: item.fill }]}>
                <Ionicons name={item.icon} size={26} color={colors.white} />
              </View>
              <Txt style={styles.label} center lines={2}>
                {t(`chat.attachments.${item.key}`)}
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
