import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useBackToClose } from '@/components/chat/message-menu';
import { Txt } from '@/components/ui';
import { previewFor } from '@/store/use-app-store';
import { aurora, colors, isDark, space } from '@/theme';
import type { Message } from '@/types';

/** The chat the menu is open for, as the Chats tab knows it. */
export interface ChatMenuTarget {
  name: string;
  subtitle: string;
  avatar: ReactNode;
  /** Groups cannot be pinned yet, so they get no Pin item. */
  canPin: boolean;
  pinned: boolean;
  muted: boolean;
  unread: boolean;
}

export interface ChatMenuProps {
  /** null hides the menu. */
  target: ChatMenuTarget | null;
  /** The last few lines of the chat, oldest first. */
  messages: Message[];
  onClose: () => void;
  onPin: () => void;
  onToggleRead: () => void;
  onMute: () => void;
  onDelete: () => void;
  /** The Chats screen's BlurTargetView: what the menu blurs on Android. */
  blurTarget: RefObject<View | null>;
}

/**
 * A long press on a chat (canvas `ChatsMenu.dc.html`), as an iOS context menu: the list blurs,
 * the chat's last lines show in a card, and under it a short menu (HIG Context menus: few items,
 * at most three groups, the destructive one last and red). Every item is also a swipe action,
 * as HIG asks. It appears at once (owner: popups appear instantly); a tap outside closes it.
 */
export function ChatMenu({ target, messages, onClose, onPin, onToggleRead, onMute, onDelete, blurTarget }: ChatMenuProps) {
  const { t } = useTranslation();
  useBackToClose(!!target, onClose);
  if (!target) return null;
  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')}>
        <BlurView
          intensity={28}
          tint={isDark ? 'dark' : 'light'}
          blurMethod="dimezisBlurView"
          blurReductionFactor={2}
          blurTarget={blurTarget}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.dim} />
      </Pressable>

      <View style={styles.stack} pointerEvents="box-none">
        <View style={styles.preview}>
          <View style={styles.head}>
            {target.avatar}
            <View style={styles.flex}>
              <Txt style={styles.name} lines={1}>
                {target.name}
              </Txt>
              <Txt style={styles.subtitle} lines={1}>
                {target.subtitle}
              </Txt>
            </View>
          </View>
          <View style={styles.lines}>
            {messages.map((m) => {
              const mine = m.author === 'me';
              return (
                <View key={m.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Txt style={[styles.bubbleText, mine && styles.mineText]} lines={3}>
                    {previewFor(m)}
                  </Txt>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.menu} accessibilityRole="menu">
          {target.canPin ? (
            <MenuRow label={target.pinned ? t('chatList.unpin') : t('chatList.pin')} icon="pin-outline" onPress={run(onPin)} />
          ) : null}
          <MenuRow
            label={target.unread ? t('chatList.markRead') : t('chatList.markUnread')}
            icon={target.unread ? 'chatbubble-outline' : 'chatbubble-ellipses-outline'}
            line={target.canPin}
            onPress={run(onToggleRead)}
          />
          <MenuRow
            label={target.muted ? t('chatList.unmute') : t('chatList.mute')}
            icon={target.muted ? 'notifications-outline' : 'notifications-off-outline'}
            line
            onPress={run(onMute)}
          />
          <View style={styles.gap} />
          <MenuRow label={t('common.delete')} icon="trash-outline" danger onPress={run(onDelete)} />
        </View>
      </View>
    </View>
  );
}

function MenuRow({
  label,
  icon,
  danger,
  line,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
  line?: boolean;
  onPress: () => void;
}) {
  const tint = danger ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, line && styles.rowLine, pressed && styles.rowPressed]}>
      <Txt style={styles.rowText} color={tint}>
        {label}
      </Txt>
      <Ionicons name={icon} size={20} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 10 },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(30,20,40,0.12)' },
  stack: { flex: 1, justifyContent: 'center', paddingHorizontal: space.lg, gap: 18 },
  flex: { flex: 1, minWidth: 0 },
  preview: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 20 },
    elevation: 16,
  },
  head: {
    height: 60,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: aurora.separator,
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 12, color: aurora.textMuted },
  lines: { padding: 14, gap: 6 },
  bubble: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18 },
  mine: { alignSelf: 'flex-end', maxWidth: '72%', backgroundColor: isDark ? '#E07B3A' : '#EF8A4E' },
  theirs: { alignSelf: 'flex-start', maxWidth: '76%', backgroundColor: isDark ? '#2C2C2E' : '#E9E9EB' },
  bubbleText: { fontSize: 16, lineHeight: 21, color: colors.text },
  mineText: { color: '#FFFFFF' },
  menu: {
    width: 250,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: isDark ? 'rgba(40,40,44,0.82)' : 'rgba(250,248,246,0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
  },
  row: {
    height: 48,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? 'rgba(84,84,88,0.55)' : 'rgba(60,60,67,0.18)' },
  rowPressed: { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
  rowText: { fontSize: 17, letterSpacing: -0.4 },
  // The destructive group sits apart, as iOS separates menu groups.
  gap: { height: 8, backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(60,60,67,0.12)' },
});
