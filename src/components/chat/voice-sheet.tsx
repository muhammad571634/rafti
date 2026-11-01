import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Anim, Sheet, Txt } from '@/components/ui';
import { duration as fmtDuration } from '@/lib/format';
import { colors, space, systemColors } from '@/theme';

import { useVoiceNote, type VoiceNote } from './use-voice-note';

/** The recorder a tap on the mic or "+" opens: hold the red button to talk, let go to send. */
export function VoiceSheet({
  visible,
  onClose,
  onSend,
  chatId,
  canRecord,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (note: VoiceNote) => void;
  chatId?: string;
  canRecord?: () => boolean;
}) {
  const { t } = useTranslation();
  const voice = useVoiceNote(chatId, onSend, canRecord);
  const recording = voice.phase === 'recording';
  const close = () => {
    voice.finish(false);
    voice.discard();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} title={t('chat.voice.title')}>
      {/* Voice Memos look (approved prototype `SheetVoice.dc.html`): big timer, red wave, red record button. */}
      <View style={styles.body}>
        <Txt style={[styles.timer, recording && styles.timerLive]}>{fmtDuration(voice.seconds)}</Txt>

        <View style={styles.meter}>
          {recording ? (
            <Anim name="voiceWave" size={72} tint={RECORD_RED} />
          ) : voice.phase === 'sending' ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : voice.phase === 'failed' ? (
            <Pressable onPress={() => void voice.retry()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('chat.tryAgain')}>
              <Txt style={styles.hint} color={colors.danger}>
                {t('chat.notDelivered')} · {t('chat.tryAgain')}
              </Txt>
            </Pressable>
          ) : (
            <Txt style={styles.hint} color={voice.notice ? colors.danger : colors.textSecondary}>
              {voice.notice === 'tooShort' ? t('chat.voice.tooShort') : voice.notice === 'noSpeech' ? t('chat.voice.noSpeech') : t('chat.voice.hold')}
            </Txt>
          )}
        </View>

        <Pressable
          onPressIn={voice.start}
          onPressOut={() => voice.finish(true)}
          accessibilityRole="button"
          accessibilityLabel={t('chat.voice.hold')}
          style={styles.ring}>
          <View style={[styles.mic, recording && styles.micActive]}>
            <Ionicons name="mic" size={30} color={colors.white} />
          </View>
        </Pressable>

        <Txt style={styles.hint} color={colors.textSecondary}>
          {recording ? t('chat.voice.release') : ' '}
        </Txt>
      </View>
    </Sheet>
  );
}

/** iOS system red: the record button, as in Voice Memos. */
const RECORD_RED = systemColors.red;

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: space.md, paddingTop: space.sm },
  timer: { fontSize: 56, lineHeight: 64, fontWeight: '300', letterSpacing: -1, fontVariant: ['tabular-nums'], color: colors.textSecondary },
  timerLive: { color: colors.text },
  meter: { height: 56, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 15 },
  ring: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mic: { width: 64, height: 64, borderRadius: 32, backgroundColor: RECORD_RED, alignItems: 'center', justifyContent: 'center' },
  // While held the red button shrinks a little, like Voice Memos' record-to-stop.
  micActive: { transform: [{ scale: 0.86 }] },
});
