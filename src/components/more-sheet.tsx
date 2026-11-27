import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { InkText } from '@/components/ink';
import { Sheet } from '@/components/ui';
import { systemColors } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';

/** What plays inside a chat: the chat's own handler runs it (a sheet there, or a screen with its friend). */
export type MoreChatKey = 'truthOrDare' | 'quiz' | 'scene' | 'timeSkip' | 'twist' | 'branches';
type MoreAppKey = 'photoBooth' | 'lore' | 'radio' | 'streams' | 'board' | 'personas';
export type MoreKey = MoreChatKey | MoreAppKey;

const CHAT_KEYS: readonly MoreKey[] = ['truthOrDare', 'quiz', 'scene', 'timeSkip', 'twist', 'branches'];

/** The four groups (audit 2026-11-15 §6.2, approved prototype `docs/prototypes/more-sheet.html`). */
const GROUPS: { title: 'play' | 'story' | 'watch' | 'you'; items: { key: MoreKey; icon: keyof typeof Ionicons.glyphMap; fill: string }[] }[] = [
  {
    title: 'play',
    items: [
      { key: 'truthOrDare', icon: 'dice', fill: systemColors.purple },
      { key: 'quiz', icon: 'help', fill: systemColors.indigo },
      { key: 'photoBooth', icon: 'camera', fill: systemColors.orange },
    ],
  },
  {
    title: 'story',
    items: [
      { key: 'scene', icon: 'film', fill: systemColors.teal },
      { key: 'timeSkip', icon: 'time', fill: systemColors.gray },
      // Something unexpected turns the story (docs/polybuzz-core.md §5.5).
      { key: 'twist', icon: 'shuffle', fill: systemColors.orange },
      // The later lines rewinds kept (0z286); a chat with none hides the row (`hide`).
      { key: 'branches', icon: 'git-branch', fill: systemColors.green },
      { key: 'lore', icon: 'library', fill: systemColors.brown },
    ],
  },
  {
    title: 'watch',
    items: [
      { key: 'radio', icon: 'radio', fill: systemColors.red },
      { key: 'streams', icon: 'videocam', fill: systemColors.pink },
      { key: 'board', icon: 'reader', fill: systemColors.yellow },
    ],
  },
  { title: 'you', items: [{ key: 'personas', icon: 'people-circle', fill: systemColors.cyan }] },
];

/** Each row's name: the chat's own words for what plays in it, the screen's title for the rest. */
const LABEL: Record<MoreKey, string> = {
  truthOrDare: 'chat.attachments.truthOrDare',
  quiz: 'chat.attachments.quiz',
  scene: 'chat.attachments.scene',
  timeSkip: 'chat.attachments.timeSkip',
  twist: 'chat.attachments.twist',
  branches: 'chat.attachments.branches',
  photoBooth: 'photoBooth.title',
  lore: 'lore.title',
  radio: 'radio.title',
  streams: 'streams.title',
  board: 'board.title',
  personas: 'personas.title',
};

export interface MoreSheetProps {
  visible: boolean;
  onClose: () => void;
  /** A chat runs its own: truth or dare, the quiz, a scene, a time skip, a twist. Without it, those rows are left out. */
  onChatPick?: (key: MoreChatKey) => void;
  /** Rows this place has no use for (a group has no scenes). */
  hide?: readonly MoreKey[];
}

/**
 * One "More" for the features people look for rather than meet every day (audit §6.2): five things stay
 * in front of the chat's "+", the rest sit here, as iOS Messages' "+" lists a few apps and then More.
 * The chat's "+" and Us both open it. Apple's grouped list with coloured icon tiles; it appears at once
 * and scrolls inside, never taller than the screen. Nothing was removed, only moved one tap deeper.
 */
export function MoreSheet({ visible, onClose, onChatPick, hide = [] }: MoreSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const open = (key: MoreKey) => {
    onClose();
    if (CHAT_KEYS.includes(key)) {
      onChatPick?.(key as MoreChatKey);
      return;
    }
    switch (key) {
      case 'photoBooth':
        return router.push('/photo-booth');
      case 'lore':
        return router.push('/lore');
      case 'radio':
        return router.push('/radio');
      case 'streams':
        return router.push('/streams');
      case 'board':
        return router.push('/board');
      case 'personas':
        return router.push('/personas');
    }
  };

  const shown = (key: MoreKey) => !hide.includes(key) && (onChatPick || !CHAT_KEYS.includes(key));

  return (
    <Sheet visible={visible} onClose={onClose} title={t('more.title')} scroll>
      {GROUPS.map((group) => {
        const items = group.items.filter((item) => shown(item.key));
        if (!items.length) return null;
        return (
          <View key={group.title}>
            <InkText variant="footnote" accessibilityRole="header" style={styles.head}>
              {t(`more.${group.title}`)}
            </InkText>
            <View style={styles.card}>
              {items.map((item, i) => (
                <Pressable
                  key={item.key}
                  onPress={() => open(item.key)}
                  accessibilityRole="button"
                  accessibilityLabel={t(LABEL[item.key])}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <View style={[styles.tile, { backgroundColor: item.fill }]}>
                    <Ionicons name={item.icon} size={19} color={ink.text} />
                  </View>
                  {/* Two lines at most: a long name ("Wahrheit oder Pflicht") wraps instead of being cut. */}
                  <View style={[styles.body, i < items.length - 1 && styles.line]}>
                    <InkText lines={2} style={styles.grow}>
                      {t(LABEL[item.key])}
                    </InkText>
                    <Ionicons name="chevron-forward" size={16} color={ink.text3} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </Sheet>
  );
}

const TILE = 32;

const styles = StyleSheet.create({
  head: { marginTop: 16, marginBottom: 8, marginHorizontal: 4, textTransform: 'uppercase' },
  card: { borderRadius: inkRadius.field, borderCurve: 'continuous', backgroundColor: ink.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 14, minHeight: 52 },
  pressed: { backgroundColor: ink.raised },
  tile: { width: TILE, height: TILE, borderRadius: 8, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  // The separator starts after the tile (iOS inset rows).
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 14, paddingVertical: 12, minHeight: 52 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.line },
  grow: { flex: 1, minWidth: 0 },
});
