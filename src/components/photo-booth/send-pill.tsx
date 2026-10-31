import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale, Txt } from '@/components/ui';
import { useFriendName } from '@/hooks/use-friend-name';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { BoothPhoto } from '@/types';

/**
 * Send for a kept picture: it goes to the friend's chat once and they answer it. After that the
 * pill reads Sent (mint) and opens the chat.
 */
export function SendPill({ photo, style }: { photo: BoothPhoto; style?: StyleProp<ViewStyle> }) {
  const friendName = useFriendName();
  const { t } = useTranslation();
  const router = useRouter();
  const sendPhoto = useAppStore((s) => s.sendPhoto);
  const friend = useAppStore((s) => s.characters.find((c) => c.id === photo.characterId));
  const chat = useAppStore((s) => s.conversations.find((c) => c.characterId === photo.characterId));
  const sent = !!photo.sentAt;
  const tint = sent ? colors.bondText : colors.text;

  return (
    <PressableScale
      style={[styles.pill, style, sent && styles.sent]}
      scaleTo={0.94}
      haptic={!sent}
      accessibilityLabel={sent ? t('photoBooth.sent') : t('photoBooth.sendTo', { name: friend ? friendName(friend, true) : '' })}
      onPress={() => {
        if (!sent) sendPhoto(photo.id);
        else if (chat) router.push(`/chat/${chat.id}`);
      }}>
      <Ionicons name={sent ? 'checkmark' : 'paper-plane-outline'} size={14} color={tint} />
      <Txt variant="smallStrong" color={tint}>
        {sent ? t('photoBooth.sent') : t('photoBooth.send')}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  sent: { backgroundColor: colors.bondSoft },
});
