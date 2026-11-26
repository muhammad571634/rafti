import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { VOICE_NO_WORDS } from '@/ai/voice-prompt';
import { useOnPhoto } from '@/components/chat/chat-ground';
import { playNote, seekNote, setNoteRate, stopNote } from '@/components/chat/voice-player';
import { PressableScale, Txt } from '@/components/ui';
import { duration as fmtDuration } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { barsFor, nextVoiceSpeed, resampleWave, type VoiceSpeed } from '@/lib/voice-wave';
import { colors, space } from '@/theme';
import { ink as inkTokens, inkPeachGlass, inkRadius } from '@/theme/ink';
import type { Message } from '@/types';

import { bubbleStyles } from './styles';
import { VoiceWaveScrubber } from './voice-wave-scrubber';

/** A note recorded before levels were kept draws this shape instead (0-1). */
const STILL_WAVE = [0.3, 0.5, 0.7, 0.4, 0.8, 0.6, 0.9, 0.5, 0.3, 0.6, 0.8, 1, 0.7, 0.4, 0.6, 0.8, 0.5, 0.3, 0.7, 0.9, 0.6, 0.4];

export function VoiceBubble({ message, mine, tail, wide }: { message: Message; mine: boolean; tail: boolean; wide?: boolean }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  /** How far it has played (0-1). */
  const [at, setAt] = useState(0);
  const [speed, setSpeed] = useState<VoiceSpeed>(1);
  /** Its file is not on this phone (a chat restored from the server): it opens as text, never a silent "play". */
  const [missing, setMissing] = useState(false);
  // Your own note shows what the model heard, so a wrong hearing is seen and not only answered.
  const [showTranscript, setShowTranscript] = useState(!!message.audioFile && message.transcript !== VOICE_NO_WORDS);
  /** It is this bubble that plays, so scrolling it away stops the sound. */
  const sounding = useRef(false);
  const speedRef = useRef<VoiceSpeed>(1);
  speedRef.current = speed;

  useEffect(
    () => () => {
      if (sounding.current) stopNote();
    },
    [],
  );

  const onPhoto = useOnPhoto();
  const seconds = message.durationSec ?? 0;
  const theirsOnPhoto = !mine && onPhoto;
  const ink = mine ? colors.bubbleSelfText : theirsOnPhoto ? colors.onMedia : colors.bubbleOtherText;
  const faint = mine ? colors.bubbleSelfText : theirsOnPhoto ? colors.onMediaMuted : colors.textSecondary;
  const playable = !!message.audioFile && !missing;
  const hasTranscript = !!message.transcript && message.transcript !== VOICE_NO_WORDS;
  const bars = useMemo(() => resampleWave(message.levels?.length ? message.levels : STILL_WAVE, barsFor(seconds)), [message.levels, seconds]);

  const start = useCallback(
    (from = 0) => {
      if (!message.audioFile) return;
      setPlaying(true);
      setAt(from);
      sounding.current = true;
      const done = () => {
        sounding.current = false;
        setPlaying(false);
        setAt(0);
      };
      void playNote(message.audioFile, done, { from, rate: speedRef.current, onProgress: setAt }).then((found) => {
        if (found) return;
        // Not on this phone: say what it said instead.
        sounding.current = false;
        setPlaying(false);
        setMissing(true);
        setShowTranscript(true);
      });
    },
    [message.audioFile],
  );

  const togglePlay = useCallback(() => {
    // A note with no sound (a friend's spoken line, or one whose file is gone) opens as its words.
    if (!playable) {
      haptic.tap();
      setShowTranscript((v) => !v);
      return;
    }
    haptic.tap();
    if (playing) {
      if (sounding.current) stopNote();
      setAt(0);
      setPlaying(false);
      return;
    }
    start(at >= 0.98 ? 0 : at);
  }, [playable, playing, start, at]);

  const cycleSpeed = useCallback(() => {
    haptic.selection();
    setSpeed((prev) => {
      const next = nextVoiceSpeed(prev);
      if (sounding.current) setNoteRate(next);
      return next;
    });
  }, []);

  const handleScrubStart = useCallback(() => {
    setScrubbing(true);
  }, []);

  const handleScrubMove = useCallback((frac: number) => {
    setAt(frac);
  }, []);

  const handleScrubEnd = useCallback(
    (frac: number) => {
      setScrubbing(false);
      setAt(frac);
      if (playing) seekNote(frac);
      else start(frac);
    },
    [playing, start],
  );

  const shownSeconds = playing || scrubbing || at > 0.002 ? Math.round(seconds * at) : seconds;
  const showSpeed = playable && (playing || scrubbing);

  return (
    <View style={[styles.voiceWrap, mine && styles.voiceWrapMine, wide && bubbleStyles.wide]}>
      <Pressable
        onPress={togglePlay}
        onLongPress={() => {
          if (!hasTranscript) return;
          haptic.tap();
          setShowTranscript((v) => !v);
        }}
        accessibilityRole="button"
        accessibilityLabel={playable ? t('chat.tapToPlay') : t('chat.voiceText')}
        style={[
          bubbleStyles.bubble,
          styles.voiceBubble,
          mine ? bubbleStyles.bubbleMine : bubbleStyles.bubbleTheirs,
          tail && (mine ? bubbleStyles.tailMine : bubbleStyles.tailTheirs),
          theirsOnPhoto && bubbleStyles.photoBubble,
          !mine && scrubbing && styles.scrubbingRim,
        ]}>
        <PressableScale
          onPress={togglePlay}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={playable ? t('chat.tapToPlay') : t('chat.voiceText')}
          style={[styles.play, { backgroundColor: ink }, !playable && styles.playText]}>
          <Ionicons
            name={!playable ? 'text' : playing ? 'pause' : 'play'}
            size={!playable ? 14 : 15}
            color={mine ? colors.bubbleSelf : theirsOnPhoto ? colors.black : colors.bubbleOther}
          />
        </PressableScale>

        <VoiceWaveScrubber
          bars={bars}
          durationSec={seconds}
          progress={at}
          playing={playing}
          playable={playable}
          mine={mine}
          inkColor={ink}
          faintColor={faint}
          onScrubStart={handleScrubStart}
          onScrubMove={handleScrubMove}
          onScrubEnd={handleScrubEnd}
        />

        <View style={styles.metaCol}>
          <Txt style={styles.voiceLength} color={faint} lines={1}>
            {fmtDuration(shownSeconds)}
          </Txt>
          {showSpeed ? (
            <PressableScale
              onPress={cycleSpeed}
              scaleTo={0.92}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`${speed}x`}
              style={[styles.speedPill, mine ? styles.speedMine : styles.speedTheirs]}>
              <Txt style={styles.speedText} color={mine ? colors.bubbleSelfText : inkTokens.accent} lines={1}>
                {`${speed}×`}
              </Txt>
            </PressableScale>
          ) : null}
        </View>

        {hasTranscript && playable ? (
          <PressableScale
            onPress={() => {
              haptic.tap();
              setShowTranscript((v) => !v);
            }}
            scaleTo={0.9}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('chat.voiceText')}
            accessibilityState={{ expanded: showTranscript }}
            style={[
              styles.trBtn,
              mine ? styles.trBtnMine : styles.trBtnTheirs,
              showTranscript && (mine ? styles.trBtnMineOn : styles.trBtnTheirsOn),
            ]}>
            <Ionicons
              name="document-text-outline"
              size={13}
              color={showTranscript ? (mine ? colors.bubbleSelfText : inkTokens.accent) : faint}
            />
          </PressableScale>
        ) : null}
      </Pressable>

      {showTranscript && message.transcript ? (
        <View style={[bubbleStyles.bubble, styles.transcript]}>
          <Txt variant="small" color={colors.bubbleTranscriptText}>
            {message.transcript}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  voiceWrap: { alignItems: 'flex-start', gap: space.xs, maxWidth: '82%' },
  voiceWrapMine: { alignItems: 'flex-end' },
  voiceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    width: 274,
    maxWidth: '100%',
    minHeight: 50,
    paddingVertical: 7,
    paddingLeft: 8,
    paddingRight: 11,
    borderRadius: 22,
    overflow: 'visible',
  },
  scrubbingRim: {
    borderColor: inkPeachGlass.rim,
  },
  play: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  playText: { paddingLeft: 0, opacity: 0.85 },
  metaCol: { alignItems: 'flex-end', justifyContent: 'center', gap: 2, minWidth: 34 },
  voiceLength: { fontSize: 12, lineHeight: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  speedPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedMine: { backgroundColor: inkTokens.onAccentWash },
  speedTheirs: { backgroundColor: inkTokens.tintFill },
  speedText: { fontSize: 10.5, lineHeight: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  trBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trBtnMine: { backgroundColor: inkTokens.onAccentWash },
  trBtnMineOn: { backgroundColor: inkTokens.onAccentWash, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bubbleSelfText },
  trBtnTheirs: { backgroundColor: inkTokens.hairlineFill },
  trBtnTheirsOn: { backgroundColor: inkTokens.tintFill, borderWidth: StyleSheet.hairlineWidth, borderColor: inkPeachGlass.rim },
  transcript: {
    backgroundColor: colors.bubbleTranscript,
    maxWidth: '100%',
  },
});
