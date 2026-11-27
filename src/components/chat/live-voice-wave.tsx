import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ink, inkPeachGlass } from '@/theme/ink';

export const LIVE_WAVE_COUNT = 28;
const MAX_H = 26;
const MIN_H = 3;

export interface LiveVoiceWaveProps {
  /** Normalized loudness bars (0..1), oldest left to newest right. */
  bars: readonly number[];
  /** Optional playback progress (0..1) in review mode; when omitted, renders live recording gradient. */
  progress?: number;
}

/**
 * Lightweight 60fps peach waveform for the chat voice composer:
 * - Recording mode (`progress === undefined`): scrolling bars with a soft left-to-right opacity fade.
 * - Review mode (`progress` 0..1): recorded contour with bright played bars sweeping left to right.
 */
export const LiveVoiceWave = memo(function LiveVoiceWave({ bars, progress }: LiveVoiceWaveProps) {
  const count = bars.length || LIVE_WAVE_COUNT;
  const isReview = typeof progress === 'number';
  const playedUntil = isReview ? Math.floor(progress * count) : -1;

  return (
    <View style={styles.row} pointerEvents="none">
      {bars.map((level, idx) => {
        const clamped = Math.max(0.08, Math.min(1, level));
        const height = Math.round(MIN_H + clamped * (MAX_H - MIN_H));
        const opacity = isReview
          ? idx <= playedUntil && progress > 0
            ? 1
            : 0.34
          : 0.32 + (idx / Math.max(1, count - 1)) * 0.68;
        const backgroundColor = isReview && idx <= playedUntil && progress > 0 ? inkPeachGlass.textBright : ink.accent;
        return <View key={idx} style={[styles.bar, { height, opacity, backgroundColor }]} />;
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flex: 1,
    height: MAX_H + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    overflow: 'hidden',
  },
  bar: {
    width: 2.5,
    borderRadius: 2,
  },
});
