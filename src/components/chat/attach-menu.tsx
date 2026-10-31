import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBackToClose } from '@/components/chat/message-menu';
import { moduleTile, PressableScale, Txt } from '@/components/ui';
import { bottomRoom, colors, isDark, moduleFills, shadows, space, systemColors } from '@/theme';

export type AttachKey = 'scene' | 'timeSkip' | 'voice' | 'photo' | 'secretNote' | 'quiz' | 'truthOrDare' | 'date' | 'dailyCalls' | 'diary';

/**
 * iOS-style app icons: a system-colour circle with a white glyph (approved prototype
 * `Plus.dc.html`). Modules wear their own colour (`moduleTile`), the same as on Today; the
 * games take hues no module here uses. Top to bottom; the most used sit at the bottom.
 */
const ITEMS: { key: AttachKey; icon: keyof typeof Ionicons.glyphMap; fill: string }[] = [
  { key: 'scene', icon: 'film', fill: systemColors.teal },
  // A clock's grey, as iOS's Clock: story time, not a module.
  { key: 'timeSkip', icon: 'time', fill: systemColors.gray },
  { key: 'diary', ...moduleTile('diary') },
  { key: 'dailyCalls', ...moduleTile('calls') },
  { key: 'date', ...moduleTile('date') },
  { key: 'truthOrDare', icon: 'dice', fill: systemColors.purple },
  { key: 'quiz', icon: 'help', fill: systemColors.indigo },
  { key: 'secretNote', ...moduleTile('note') },
  { key: 'photo', icon: 'image', fill: moduleFills.photo },
  { key: 'voice', icon: 'mic', fill: systemColors.red },
];

/** The chat input's "+" and field are 40pt, 12pt in from the edge (`ChatInput`). */
const FIELD = 40;

/**
 * The chat's "+" menu, as in iOS Messages: the chat blurs, the "+" turns into a close button
 * where it stood, and the things to send or start rise above it as icons with large labels.
 */
export function AttachMenu({
  visible,
  onClose,
  onPick,
  blurTarget,
  hide = [],
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (key: AttachKey) => void;
  /** Items this chat has no place for (a group has no scenes or time skips yet). */
  hide?: AttachKey[];
  /** The chat's BlurTargetView: what the menu blurs on Android. */
  blurTarget: RefObject<ViewInstance | null>;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  useBackToClose(visible, onClose);
  if (!visible) return null;
  // Same bottom gap as the input bar, so the close button lands right on the "+".
  const bottom = bottomRoom(insets.bottom, space.md);

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')}>
        <BlurView
          intensity={28}
          tint={isDark ? 'dark' : 'light'}
          // Android blurs only with a native method and the screen's BlurTargetView.
          blurMethod="dimezisBlurView"
          blurReductionFactor={2}
          blurTarget={blurTarget}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.dim} />
      </Pressable>

      <View style={[styles.list, { bottom: bottom + FIELD + space.lg }]} accessibilityRole="menu">
        {ITEMS.filter((item) => !hide.includes(item.key)).map((item) => (
          <PressableScale
            key={item.key}
            scaleTo={0.95}
            style={styles.item}
            accessibilityRole="menuitem"
            accessibilityLabel={t(`chat.attachments.${item.key}`)}
            onPress={() => onPick(item.key)}>
            <View style={[styles.icon, { backgroundColor: item.fill }]}>
              <Ionicons name={item.icon} size={22} color={colors.white} />
            </View>
            <Txt style={styles.label}>{t(`chat.attachments.${item.key}`)}</Txt>
          </PressableScale>
        ))}
      </View>

      <PressableScale
        scaleTo={0.9}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        style={[styles.close, { bottom }]}>
        <Ionicons name="close" size={24} color={colors.text} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 10 },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.35)' },
  list: { position: 'absolute', left: space.lg, gap: 4 },
  item: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 14, paddingRight: space.md },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 19, fontWeight: '500', letterSpacing: -0.4 },
  close: {
    position: 'absolute',
    left: space.md,
    width: FIELD,
    height: FIELD,
    borderRadius: FIELD / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassLine,
    ...shadows.glassButton,
  },
});
