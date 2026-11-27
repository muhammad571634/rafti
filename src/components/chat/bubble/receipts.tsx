import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { onPhotoText, useOnPhoto } from '@/components/chat/chat-ground';
import { CharacterAvatar, Txt } from '@/components/ui';
import { space, systemColors } from '@/theme';
import type { Character, Message } from '@/types';

import { bubbleStyles } from './styles';

export function ReadReceipt({ message, time, face }: { message: Message; time?: string; face?: Character }) {
  const { t } = useTranslation();
  const meta = [bubbleStyles.receipt, useOnPhoto() && onPhotoText];
  const read = !message.pending && !!message.readAt;

  return (
    // Read: their small face beside the word, so you see who read it (Instagram's "Seen").
    <View style={styles.receiptRow}>
    <Txt style={meta}>
      {message.editedAt ? (
        <>
          <Txt style={[...meta, bubbleStyles.receiptStrong]}>{t('chat.edited')}</Txt>
          {' · '}
        </>
      ) : null}
      {message.pending ? (
        t('chat.sending')
      ) : message.readAt ? (
        <Txt style={[...meta, bubbleStyles.receiptStrong]}>{t('chat.read')}</Txt>
      ) : (
        <Txt style={[...meta, bubbleStyles.receiptStrong]}>{t('chat.delivered')}</Txt>
      )}
      {time ? ` · ${time}` : null}
    </Txt>
    {read && face ? <CharacterAvatar character={face} size={14} /> : null}
    </View>
  );
}

/** "Edited" under a message you changed (iOS Messages), once a newer one carries the receipt. */
export function EditedNote({ time }: { time?: string }) {
  const { t } = useTranslation();
  const meta = [bubbleStyles.receipt, useOnPhoto() && onPhotoText];
  return (
    <Txt style={meta}>
      <Txt style={[...meta, bubbleStyles.receiptStrong]}>{t('chat.edited')}</Txt>
      {time ? ` · ${time}` : null}
    </Txt>
  );
}

/** iOS Messages' "Not Delivered" in system red under the line; a tap asks for the reply again. */
export function NotDelivered({ onRetry, time }: { onRetry?: () => void; time?: string }) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onRetry}
      disabled={!onRetry}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`${t('chat.notDelivered')}. ${t('chat.tryAgain')}`}
      style={styles.failed}>
      <Ionicons name="alert-circle" size={15} color={systemColors.red} />
      <Txt style={[bubbleStyles.receipt, styles.failedText]}>
        <Txt style={[bubbleStyles.receipt, bubbleStyles.receiptStrong, styles.failedText]}>{t('chat.notDelivered')}</Txt>
        {onRetry ? ` · ${t('chat.tryAgain')}` : null}
        {time ? ` · ${time}` : null}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  receiptRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  failed: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingTop: 3, paddingRight: space.xs },
  failedText: { color: systemColors.red, paddingTop: 0, paddingRight: 0 },
});
