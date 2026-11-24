import {
  AudioModule,
  AudioQuality,
  IOSOutputFormat,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform } from 'react-native';

import { accessToken } from '@/ai/account';
import { apiBase, serverTranscribe } from '@/ai/server';
import { VOICE_NO_WORDS, VOICE_SECONDS_MAX } from '@/ai/voice-prompt';
import { showAlert } from '@/lib/alert';
import { dropClip, keepNote, readClip } from '@/lib/voice-files';
import { resampleWave, waveFromMeter } from '@/lib/voice-wave';
import { useAppStore } from '@/store/use-app-store';

import { LIVE_WAVE_COUNT } from './live-voice-wave';
import { PLAYBACK_MODE, playUri, stopNote } from './voice-player';

/** Small and clear enough for speech; a minute stays near 240 KB (`CLIP_CHARS_MAX`). Calls record the same. */
export const OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: { ...RecordingPresets.HIGH_QUALITY.ios, outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MEDIUM },
};

const MIN_SECONDS = 1;
const METER_TICK_MS = 70;
const EMPTY_LIVE_BARS: readonly number[] = Array.from({ length: LIVE_WAVE_COUNT }, () => 0.12);

/** Maps dBFS metering into a crisp 0.12..1 bar height for the live scrolling waveform. */
function meterToBar(db: number): number {
  if (!Number.isFinite(db)) return 0.14;
  return Math.max(0.12, Math.min(1, (db + 58) / 46));
}

/**
 * Above this (dB) counts as a voice. The model invents a sentence for silence ("Hey, are you free to
 * talk?", 2026-11-02), so a clip that stays below it never leaves the phone. Android reports the peak
 * since the last look, iOS the average, so they differ.
 */
export const VOICE_DB = Platform.OS === 'ios' ? -40 : -35;
/** Moments (one a look, 5 a second) a clip must be that loud: one click is not speech. */
export const VOICE_MOMENTS = 2;

export interface VoiceNote {
  seconds: number;
  transcript: string;
  /** The kept file (`keepNote`), when it could be kept. */
  audioFile?: string;
  /** The language it was heard in. */
  language?: string;
  /** Its loudness as bars (`waveFromMeter`), drawn as the note's wave. */
  levels?: number[];
}

export type VoicePhase = 'idle' | 'recording' | 'review' | 'sending' | 'failed';
/** Why nothing was sent, for a short line in the composer or the sheet. */
export type VoiceNotice = 'tooShort' | 'noSpeech';

/**
 * A real voice message: records from the microphone, supports live scrolling waveform + pre-send
 * playback review in hands-free mode, has the server write out what was said, and hands the chat
 * the words and the file.
 */
export function useVoiceNote(chatId: string | undefined, onNote: (note: VoiceNote) => void, canRecord?: () => boolean) {
  const { t } = useTranslation();
  const modelOn = useAppStore((s) => s.settings.realAi) && !!apiBase();
  const allowed = useAppStore((s) => s.settings.voiceToAi);
  const setSetting = useAppStore((s) => s.setSetting);
  const recorder = useAudioRecorder(OPTIONS);

  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [notice, setNotice] = useState<VoiceNotice | null>(null);
  const [liveBars, setLiveBars] = useState<readonly number[]>(EMPTY_LIVE_BARS);
  const [reviewLevels, setReviewLevels] = useState<readonly number[]>(EMPTY_LIVE_BARS);
  const [reviewPlaying, setReviewPlaying] = useState(false);
  const [reviewProgress, setReviewProgress] = useState(0);

  /** The finger is still down: a release during the slow start must not leave it recording. */
  const wanted = useRef(false);
  const live = useRef(false);
  const startedAt = useRef(0);
  /** Looks at the meter so far, and those loud enough for a voice. */
  const looks = useRef(0);
  const loud = useRef(0);
  const peak = useRef(-Infinity);
  /** Every meter reading of this clip, for its wave. */
  const meter = useRef<number[]>([]);
  const waiting = useRef<{ uri: string; seconds: number; levels: number[] } | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const inTurn = (job: () => Promise<unknown>) => {
    queue.current = queue.current.then(job).catch((error: unknown) => {
      console.warn(`[voice] ${String((error as Error)?.message).slice(0, 120)}`);
    });
  };
  const latestOnNote = useRef(onNote);
  useEffect(() => {
    latestOnNote.current = onNote;
  });

  const hand = async (clip: { uri: string; seconds: number; levels: number[] }, transcript: string, language?: string) => {
    const audioFile = chatId ? await keepNote(clip.uri, chatId) : undefined;
    latestOnNote.current({ seconds: clip.seconds, transcript, audioFile, language, ...(clip.levels.length ? { levels: clip.levels } : {}) });
  };

  const deliver = async () => {
    const clip = waiting.current;
    if (!clip) return;
    stopNote();
    setReviewPlaying(false);
    setReviewProgress(0);
    setPhase('sending');
    if (!modelOn) {
      waiting.current = null;
      setPhase('idle');
      return hand(clip, VOICE_NO_WORDS);
    }
    const read = await readClip(clip.uri);
    const heard = read ? await accessToken().then((token) => serverTranscribe(read, token)).catch(() => null) : null;
    if (waiting.current !== clip) return;
    if (heard === null) return setPhase('failed');
    waiting.current = null;
    setPhase('idle');
    if (heard.text) return hand(clip, heard.text, heard.language);
    setNotice('noSpeech');
    void dropClip(clip.uri);
  };

  const discard = () => {
    stopNote();
    setReviewPlaying(false);
    setReviewProgress(0);
    setLiveBars(EMPTY_LIVE_BARS);
    const clip = waiting.current;
    waiting.current = null;
    setPhase('idle');
    if (clip) void dropClip(clip.uri);
  };

  const toggleReviewPlay = () => {
    if (phase !== 'review') return;
    if (reviewPlaying) {
      stopNote();
      return;
    }
    const clip = waiting.current;
    if (!clip) return;
    setReviewPlaying(true);
    setReviewProgress(0);
    void playUri(
      clip.uri,
      () => {
        setReviewPlaying(false);
        setReviewProgress(0);
      },
      { onProgress: (at) => setReviewProgress(at) },
    ).then((ok) => {
      if (!ok) setReviewPlaying(false);
    });
  };

  const begin = async () => {
    if (live.current || !wanted.current) return;
    const { granted, canAskAgain } = await AudioModule.getRecordingPermissionsAsync();
    if (!granted) {
      wanted.current = false;
      const answer = await AudioModule.requestRecordingPermissionsAsync();
      if (!answer.granted && !answer.canAskAgain && !canAskAgain) showAlert(t('chat.voice.noMic'));
      return;
    }
    if (!wanted.current) return;
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
    } catch (error) {
      wanted.current = false;
      await setAudioModeAsync(PLAYBACK_MODE).catch(() => {});
      throw error;
    }
    if (!wanted.current) {
      await recorder.stop().catch(() => {});
      await setAudioModeAsync(PLAYBACK_MODE).catch(() => {});
      return;
    }
    recorder.record();
    live.current = true;
    startedAt.current = Date.now();
    looks.current = 0;
    loud.current = 0;
    peak.current = -Infinity;
    meter.current = [];
    setLiveBars(EMPTY_LIVE_BARS);
    setSeconds(0);
    setPhase('recording');
  };

  const start = () => {
    if (wanted.current || live.current || phase === 'sending') return;
    setNotice(null);
    discard();
    if (canRecord && !canRecord()) return;
    if (modelOn && !allowed) {
      showAlert(t('chat.voiceConsent.title'), t('chat.voiceConsent.body'), [
        { text: t('chat.photoConsent.notNow'), style: 'cancel' },
        { text: t('chat.photoConsent.allow'), onPress: () => setSetting('voiceToAi', true) },
      ]);
      return;
    }
    stopNote();
    wanted.current = true;
    inTurn(begin);
  };

  const finish = (send: boolean, stopForReview = false) => {
    wanted.current = false;
    const liftedAt = Date.now();
    inTurn(async () => {
      if (!live.current) return;
      live.current = false;
      const held = Math.min(VOICE_SECONDS_MAX, Math.round((liftedAt - startedAt.current) / 1000));
      console.log(`[voice] ${held}s, ${loud.current} of ${looks.current} looks above ${VOICE_DB} dB, peak ${peak.current.toFixed(1)}`);
      // Sending from the moment the finger lifts (unless entering review), so the row does not blink away first.
      setPhase(send ? (stopForReview ? 'review' : 'sending') : 'idle');
      await recorder.stop().catch((error: unknown) => {
        console.warn(`[voice] could not stop: ${String((error as Error)?.message).slice(0, 120)}`);
      });
      const uri = recorder.uri;
      await setAudioModeAsync(PLAYBACK_MODE).catch(() => {});
      const quiet = looks.current > 0 && loud.current < VOICE_MOMENTS;
      const why = held < MIN_SECONDS ? 'tooShort' : quiet ? 'noSpeech' : null;
      if (!uri || !send || why) {
        setPhase('idle');
        if (send && why) setNotice(why);
        if (uri) void dropClip(uri);
        return;
      }
      const levels = waveFromMeter(meter.current);
      waiting.current = { uri, seconds: held, levels };
      setSeconds(held);
      if (stopForReview) {
        setReviewLevels(levels.length ? resampleWave(levels, LIVE_WAVE_COUNT) : EMPTY_LIVE_BARS);
        setReviewProgress(0);
        setReviewPlaying(false);
        setPhase('review');
        return;
      }
      await deliver();
    });
  };

  const review = () => finish(true, true);

  const latestFinish = useRef(finish);
  useEffect(() => {
    latestFinish.current = finish;
  });

  // The clock, live scrolling wave, loudness gate, and limit.
  useEffect(() => {
    if (phase !== 'recording') return;
    let tickCount = 0;
    const tick = setInterval(() => {
      tickCount += 1;
      const elapsed = (Date.now() - startedAt.current) / 1000;
      const { metering } = recorder.getStatus();
      const bar = typeof metering === 'number' ? meterToBar(metering) : 0.14;
      setLiveBars((prev) => [...prev.slice(1), bar]);

      // Sample loudness at the calibrated ~210ms cadence so VOICE_MOMENTS stays exact.
      if (tickCount % 3 === 0) {
        setSeconds(Math.min(VOICE_SECONDS_MAX, Math.floor(elapsed)));
        if (typeof metering === 'number') {
          looks.current += 1;
          peak.current = Math.max(peak.current, metering);
          meter.current.push(metering);
          if (metering > VOICE_DB) loud.current += 1;
        }
      }
      if (elapsed >= VOICE_SECONDS_MAX) latestFinish.current(true);
    }, METER_TICK_MS);
    return () => clearInterval(tick);
  }, [phase, recorder]);

  // A call or leaving the app takes the microphone: live recording stops; review playback pauses.
  useEffect(() => {
    const away = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        stopNote();
        latestFinish.current(false);
      }
    });
    return () => away.remove();
  }, []);
  useEffect(
    () => () => {
      stopNote();
      latestFinish.current(false);
    },
    [],
  );

  // A line that says why nothing went does not stay.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  return {
    phase,
    seconds,
    notice,
    liveBars,
    reviewLevels,
    reviewPlaying,
    reviewProgress,
    start,
    finish,
    review,
    toggleReviewPlay,
    sendReviewed: deliver,
    retry: deliver,
    discard,
  };
}
