import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { MESSAGE_TONES } from '@/ai/tone';
import { useBackToClose } from '@/components/chat/message-menu';
import { PressableScale, Txt } from '@/components/ui';
import { colors, isDark, radius, shadows, space, systemColors } from '@/theme';
import type { MessageTone } from '@/types';

/** Each tone's mark: in this menu and on the corner of a text sent in it. */
export const TONE_LOOK: Record<MessageTone, { icon: keyof typeof Ionicons.glyphMap; fill: string }> = {
  whisper: { icon: 'ear', fill: systemColors.indigo },
  playful: { icon: 'happy', fill: systemColors.orange },
  flirty: { icon: 'heart', fill: systemColors.pink },
  serious: { icon: 'glasses', fill: systemColors.blue },
};

/**
 * What holding send opens, as iOS's context menus do: rows over the dimmed chat, right above the
 * send button, with the composer and the keyboard left as they are. It lives in the chat's own area,
 * so it rides on the keyboard with the composer. Appears at once.
 */
export function ToneMenu({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (tone: MessageTone) => void }) {
  const { t } = useTranslation();
  useBackToClose(visible, onClose);
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} />
      <View style={styles.card} accessibilityRole="menu">
        {MESSAGE_TONES.map((tone, i) => (
          <PressableScale
            key={tone}
            scaleTo={0.97}
            haptic
            accessibilityRole="menuitem"
            accessibilityLabel={t(`chat.tones.${tone}`)}
            onPress={() => onPick(tone)}
            style={[styles.row, i > 0 && styles.divided]}>
            <Txt style={styles.label}>{t(`chat.tones.${tone}`)}</Txt>
            <View style={[styles.icon, { backgroundColor: TONE_LOOK[tone].fill }]}>
              <Ionicons name={TONE_LOOK[tone].icon} size={17} color={colors.white} />
            </View>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 10 },
  dim: { backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.55)' },
  card: {
    position: 'absolute',
    right: space.md,
    bottom: space.sm,
    minWidth: 210,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.lg, paddingLeft: space.lg, paddingRight: space.md },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  label: { fontSize: 17, letterSpacing: -0.4 },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
