import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { type RefObject, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Pressable, StyleSheet, View, type ViewInstance } from 'react-native';

import { REACTION_STICKERS, type ReactionName } from '@/assets/brand/registry';
import { ReactionSticker } from '@/components/chat/reaction-sticker';
import { PressableScale, Txt } from '@/components/ui';
import { colors, isDark, shadows, space } from '@/theme';
import type { Message } from '@/types';

const REACTIONS = Object.keys(REACTION_STICKERS) as ReactionName[];
/** Their bubbles start past the avatar column of the chat (12 gutter + 28 avatar + 8 gap). */
const THEIRS_INSET = 36;

export interface MessageMenuProps {
  /** The held message; null hides the menu. */
  message: Message | null;
  onClose: () => void;
  /** The picked sticker, or undefined to take the reaction back. */
  onReact: (message: Message, reaction: ReactionName | undefined) => void;
  onCopy: (message: Message) => void;
  onReport: (message: Message) => void;
  onDelete: (message: Message) => void;
  /** Given only for your newest text: it opens in the field to change (iOS Messages Edit). */
  onEdit?: (message: Message) => void;
  /** Given only for their lines before your newest message (`canRewindTo`). */
  onRewind?: (message: Message) => void;
  /** Pins a text line to Memories, or with `pinned` takes it back (one-to-one chats only). */
  onPin?: (message: Message) => void;
  /** The held line is already pinned: the item reads Unpin. */
  pinned?: boolean;
  /** The chat's BlurTargetView: what the menu blurs on Android. */
  blurTarget: RefObject<ViewInstance | null>;
}

/**
 * The long-press menu, as an iOS context menu (approved prototypes `Menu.dc.html`, `MenuMine.dc.html`,
 * `ChatRewind.dc.html`): the chat blurs, the mascot reactions sit in a glass capsule (each moving to
 * its feeling) over Copy / Edit or Report, then the destructive group, Rewind to here and Delete, in
 * red at the end (HIG Context menus). Items that do not apply are left out, not dimmed. It appears at
 * once; a tap outside closes it.
 */
export function MessageMenu({
  message,
  onClose,
  onReact,
  onCopy,
  onReport,
  onDelete,
  onEdit,
  onRewind,
  onPin,
  pinned,
  blurTarget,
}: MessageMenuProps) {
  const { t } = useTranslation();
  useBackToClose(!!message, onClose);
  if (!message) return null;
  const mine = message.author === 'me';
  const align = mine ? styles.alignMine : styles.alignTheirs;
  const copy = message.text ? { key: 'copy', label: t('chat.copy'), icon: 'copy-outline' as const, onPress: () => onCopy(message) } : null;
  const edit = mine && onEdit ? { key: 'edit', label: t('chat.edit'), icon: 'create-outline' as const, onPress: () => onEdit(message) } : null;
  const pin = onPin
    ? { key: 'pin', label: pinned ? t('chat.unpin') : t('chat.pin'), icon: pinned ? ('pin' as const) : ('pin-outline' as const), onPress: () => onPin(message) }
    : null;
  const report = mine ? null : { key: 'report', label: t('safety.report'), icon: 'flag-outline' as const, onPress: () => onReport(message) };
  const firstGroup = (mine ? [copy, edit, pin] : [copy, pin, report]).filter((row) => row !== null);

  return (
    // An overlay inside the chat, not a Modal: a separate window would sit outside the blur target.
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

      <View style={[styles.stack, align]} pointerEvents="box-none">
        <View style={[styles.glass, styles.reactions]} accessibilityRole="toolbar">
          {REACTIONS.map((name) => {
            const on = message.reaction === name;
            return (
              <PressableScale
                key={name}
                scaleTo={0.85}
                style={[styles.reaction, on && styles.reactionOn]}
                accessibilityRole="button"
                accessibilityLabel={t('chat.react', { name: t(`chat.reactions.${name}`) })}
                accessibilityState={{ selected: on }}
                onPress={() => onReact(message, on ? undefined : name)}>
                <ReactionSticker name={name} style={styles.sticker} />
              </PressableScale>
            );
          })}
        </View>

        {/* No copy of the message under the reactions (owner, 2026-10-16): reactions, then actions. */}
        <View style={[styles.menu, !mine && styles.inset]} accessibilityRole="menu">
          {/* First group: yours Copy, Edit, Pin; theirs Copy, Pin, Report (canvas `MenuPin.dc.html`). */}
          {firstGroup.map((row, i) => (
            <MenuRow key={row.key} label={row.label} icon={row.icon} onPress={row.onPress} line={i < firstGroup.length - 1} />
          ))}
          <View style={styles.gap} />
          {onRewind ? (
            <MenuRow label={t('chat.rewindToHere')} icon="arrow-undo-outline" danger line onPress={() => onRewind(message)} />
          ) : null}
          <MenuRow label={t('chat.deleteMessage')} icon="trash-outline" danger onPress={() => onDelete(message)} />
        </View>
      </View>
    </View>
  );
}

/** Android's back button closes the open menu instead of leaving the chat. */
export function useBackToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);
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
      <Ionicons name={icon} size={19} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 10 },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.10)' },
  stack: { flex: 1, justifyContent: 'center', paddingHorizontal: space.md, gap: space.sm + 2 },
  alignMine: { alignItems: 'flex-end' },
  alignTheirs: { alignItems: 'flex-start' },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassLine,
    ...shadows.raised,
  },
  reactions: { height: 62, borderRadius: 31, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 7 },
  reaction: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  reactionOn: { backgroundColor: colors.primarySoft },
  sticker: { width: 42, height: 42 },
  inset: { marginLeft: THEIRS_INSET },
  menu: {
    width: 250,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: isDark ? 'rgba(37,37,39,0.96)' : 'rgba(249,249,249,0.97)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassLine,
  },
  row: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  rowPressed: { backgroundColor: colors.glassActive },
  rowText: { fontSize: 17, letterSpacing: -0.4 },
  // iOS sets the destructive action apart with a thicker gap.
  gap: { height: space.sm, backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(60,60,67,0.08)' },
});
