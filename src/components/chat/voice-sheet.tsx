import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Anim, Sheet, Txt } from '@/components/ui';
import { duration as fmtDuration } from '@/lib/format';
import { colors, space } from '@/theme';

const MIN_SECONDS = 1;
const MAX_SECONDS = 60;

/**
 * Hold-to-talk recorder. The skeleton measures how long you held and sends a voice
 * note of that length; real builds capture audio with expo-audio and upload it.
 */
export function VoiceSheet({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (seconds: number) => void;
}) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [tooShort, setTooShort] = useState(false);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!recording) return;
    const tick = setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      setSeconds(Math.min(MAX_SECONDS, Math.floor(elapsed)));
    }, 200);
    return () => clearInterval(tick);
  }, [recording]);

  const start = () => {
    startedAt.current = Date.now();
    setSeconds(0);
    setTooShort(false);
    setRecording(true);
  };

  const stop = () => {
    if (!recording) return;
    setRecording(false);
    const held = Math.min(MAX_SECONDS, Math.round((Date.now() - startedAt.current) / 1000));
    if (held < MIN_SECONDS) return setTooShort(true);
    onSend(held);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('chat.voice.title')}>
      {/* Voice Memos look (approved prototype `SheetVoice.dc.html`): big timer, red wave, red record button. */}
      <View style={styles.body}>
        <Txt style={[styles.timer, recording && styles.timerLive]}>{fmtDuration(seconds)}</Txt>

        <View style={styles.meter}>
          {recording ? (
            <Anim name="voiceWave" size={72} tint={RECORD_RED} />
          ) : (
            <Txt style={styles.hint} color={tooShort ? colors.danger : colors.textSecondary}>
              {tooShort ? t('chat.voice.tooShort') : t('chat.voice.hold')}
            </Txt>
          )}
        </View>

        <Pressable
          onPressIn={start}
          onPressOut={stop}
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
const RECORD_RED = '#FF3B30';

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
