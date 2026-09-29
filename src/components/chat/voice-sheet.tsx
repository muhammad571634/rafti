import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Anim, Sheet, Txt } from '@/components/ui';
import { duration as fmtDuration } from '@/lib/format';
import { colors, radius, shadows, space } from '@/theme';

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
      <View style={styles.body}>
        <View style={styles.meter}>
          {recording ? (
            <Anim name="voiceWave" size={64} tint={colors.primary} />
          ) : (
            <Txt variant="small" color={tooShort ? colors.danger : colors.textMuted}>
              {tooShort ? t('chat.voice.tooShort') : t('chat.voice.hold')}
            </Txt>
          )}
        </View>

        <Txt variant="display" color={recording ? colors.primary : colors.textFaint}>
          {fmtDuration(seconds)}
        </Txt>

        <Pressable
          onPressIn={start}
          onPressOut={stop}
          accessibilityRole="button"
          accessibilityLabel={t('chat.voice.hold')}
          style={[styles.mic, recording && styles.micActive, shadows.fab]}>
          <Ionicons name="mic" size={34} color={colors.white} />
        </Pressable>

        <Txt variant="caption" color={colors.textFaint}>
          {recording ? t('chat.voice.release') : ' '}
        </Txt>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: space.md, paddingVertical: space.md },
  meter: { height: 40, alignItems: 'center', justifyContent: 'center' },
  mic: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micActive: { transform: [{ scale: 1.12 }], backgroundColor: colors.primaryHover },
});
