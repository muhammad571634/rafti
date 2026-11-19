import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { InkText } from '@/components/ink';
import { Sheet } from '@/components/ui';
import { showAlert } from '@/lib/alert';
import { branchesOf } from '@/lib/branches';
import { confirmAction } from '@/lib/confirm';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/use-app-store';
import { systemColors } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';

/**
 * A chat's branches (0z286, `src/lib/branches.ts`): the later lines each rewind kept, newest first,
 * as Apple's grouped rows: the branch's first line, then how many lines and when. A tap asks, then
 * switches (where the chat is now is kept as a branch in its turn); the trash removes one for good.
 * A branch whose point an earlier rewind cut away cannot come back: it shows faded, delete only.
 */
export function BranchesSheet({ conversationId, theirName, visible, onClose }: { conversationId: string; theirName: string; visible: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const all = useAppStore((s) => s.branches);
  const messages = useAppStore((s) => s.messages[conversationId]);
  const switchBranch = useAppStore((s) => s.switchBranch);
  const deleteBranch = useAppStore((s) => s.deleteBranch);
  const [busy, setBusy] = useState(false);
  const list = useMemo(() => branchesOf(all, conversationId, messages ?? []), [all, conversationId, messages]);
  const when = (iso: string) => new Date(iso).toLocaleString(i18n.language, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  const pick = (id: string) =>
    confirmAction({
      title: t('chat.branches.switchTitle'),
      message: t('chat.branches.switchLine'),
      action: t('chat.branches.switch'),
      cancel: t('common.cancel'),
      onConfirm: () => {
        if (busy) return;
        setBusy(true);
        void switchBranch(conversationId, id).then((result) => {
          setBusy(false);
          if (result === 'ok') {
            haptic.success();
            onClose();
          } else showAlert(t('chat.branches.failed'));
        });
      },
    });

  const remove = (id: string) =>
    confirmAction({ title: t('chat.branches.deleteTitle'), action: t('common.delete'), cancel: t('common.cancel'), onConfirm: () => deleteBranch(id) });

  return (
    <Sheet visible={visible} onClose={onClose} title={t('chat.attachments.branches')} scroll>
      {list.length ? (
        <View style={styles.card}>
          {list.map((b, i) => (
            <View key={b.id} style={[styles.row, i < list.length - 1 && styles.line]}>
              <Pressable
                disabled={!b.open || busy}
                onPress={() => pick(b.id)}
                accessibilityRole="button"
                accessibilityLabel={`${b.preview} · ${t('chat.branches.count', { count: b.count })}`}
                style={({ pressed }) => [styles.main, pressed && styles.pressed, !b.open && styles.faded]}>
                <View style={styles.tile}>
                  <Ionicons name="git-branch" size={17} color={ink.text} />
                </View>
                <View style={styles.body}>
                  {/* Two lines: the branch's first words, theirs or yours, as the chat shows them. */}
                  <InkText lines={2}>{b.from === 'me' ? `${t('search.you')}: ${b.preview}` : b.preview || theirName}</InkText>
                  <InkText variant="footnote" color={ink.text3} lines={1}>
                    {`${t('chat.branches.count', { count: b.count })} · ${when(b.createdAt)}`}
                  </InkText>
                </View>
              </Pressable>
              <Pressable onPress={() => remove(b.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.delete')} style={styles.trash}>
                <Ionicons name="trash-outline" size={19} color={ink.text3} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <InkText color={ink.text3} style={styles.empty}>
          {t('chat.branches.empty')}
        </InkText>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: inkRadius.field, borderCurve: 'continuous', backgroundColor: ink.card, overflow: 'hidden', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.line },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingVertical: 12, minHeight: 60 },
  pressed: { backgroundColor: ink.raised },
  faded: { opacity: 0.45 },
  tile: { width: 30, height: 30, borderRadius: 8, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: systemColors.green },
  body: { flex: 1, minWidth: 0, gap: 2 },
  trash: { width: 48, minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', marginVertical: 24 },
});
