import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View, type ViewInstance } from 'react-native';

import { LinkRow } from '@/components/character/kit';
import { useFriends } from '@/components/group/friend-row';
import { CharacterAvatar, PressableScale, Sheet, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { shareImage } from '@/lib/share';
import { useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors, systemGround } from '@/theme';

const FACE = 60;

/**
 * Where a date's polaroid goes (0z157), the way iOS's share sheet reads: your other friends' faces
 * on top (a tap sends the polaroid to their chat and they answer it), then "Share as a picture",
 * which sends the polaroid itself through the system sheet. Before, Share sent one line of text.
 */
export function DateShareSheet({
  visible,
  onClose,
  dateId,
  partnerId,
  caption,
  polaroid,
  fallback,
}: {
  visible: boolean;
  onClose: () => void;
  dateId: string;
  /** The friend the date was with: never offered as a recipient. */
  partnerId: string;
  caption: string;
  /** The view captured as the picture. */
  polaroid: RefObject<ViewInstance | null>;
  /** What goes as text where a picture cannot be made. */
  fallback: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const sendDatePhoto = useAppStore((s) => s.sendDatePhoto);
  const friends = useFriends().filter((f) => f.character.id !== partnerId);
  const [sent, setSent] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const send = (friendId: string) => {
    if (sent.includes(friendId)) return;
    const result = sendDatePhoto(dateId, friendId, caption);
    if (result === 'noShells') {
      onClose();
      router.push('/store/shell?tab=shells');
      return;
    }
    if (result !== 'sent') return;
    haptic.success();
    setSent((list) => [...list, friendId]);
  };

  const asPicture = async () => {
    if (busy) return;
    setBusy(true);
    // The sheet steps aside first so the system sheet is not opened over it.
    onClose();
    await shareImage(polaroid, fallback);
    setBusy(false);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('date.share')} scroll>
      {friends.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faces} style={styles.facesScroll}>
          {friends.map((friend) => {
            const done = sent.includes(friend.character.id);
            return (
              <PressableScale
                key={friend.character.id}
                scaleTo={0.92}
                disabled={done}
                onPress={() => send(friend.character.id)}
                accessibilityRole="button"
                accessibilityState={{ disabled: done }}
                accessibilityLabel={done ? `${friend.name}, ${t('photoBooth.sent')}` : t('photoBooth.sendTo', { name: friend.name })}
                style={styles.face}>
                <View>
                  <CharacterAvatar character={friend.character} size={FACE} />
                  {done ? (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />
                    </View>
                  ) : null}
                </View>
                <Txt style={styles.faceName} lines={1} maxFontSizeMultiplier={1.2}>
                  {done ? t('photoBooth.sent') : shortName(friend.name)}
                </Txt>
              </PressableScale>
            );
          })}
        </ScrollView>
      ) : null}
      <View style={styles.ways}>
        <LinkRow icon="share-social" fill={systemColors.blue} label={t('common.shareAsPicture')} onPress={() => void asPicture()} last />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  // The sheet pads its content; the faces row runs to its edges so it can scroll off them.
  facesScroll: { marginHorizontal: -space.xl, marginBottom: space.md },
  faces: { gap: space.md, paddingHorizontal: space.xl },
  face: { width: 72, alignItems: 'center', gap: 6 },
  faceName: { fontSize: 12, fontWeight: '600', color: colors.text, textAlign: 'center' },
  check: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.primaryFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ways: { borderRadius: 16, overflow: 'hidden', backgroundColor: systemGround.card },
});
