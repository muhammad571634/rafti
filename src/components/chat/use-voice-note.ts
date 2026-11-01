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
import { Alert, AppState, Platform } from 'react-native';

import { accessToken } from '@/ai/account';
import { apiBase, serverTranscribe } from '@/ai/server';
import { VOICE_NO_WORDS, VOICE_SECONDS_MAX } from '@/ai/voice-prompt';
import { dropClip, keepNote, readClip } from '@/lib/voice-files';
import { useAppStore } from '@/store/use-app-store';

import { PLAYBACK_MODE, stopNote } from './voice-player';

/** Small and clear enough for speech; a minute stays near 240 KB (`CLIP_CHARS_MAX`). */
const OPTIONS: RecordingOptions = {
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
/**
 * Above this (dB) counts as a voice. The model invents a sentence for silence ("Hey, are you free to
 * talk?", 2026-11-02), so a clip that stays below it never leaves the phone. Android reports the peak
 * since the last look, iOS the average, so they differ.
 */
const VOICE_DB = Platform.OS === 'ios' ? -40 : -35;
/** Moments (one a look, 5 a second) a clip must be that loud: one click is not speech. */
const VOICE_MOMENTS = 2;

export interface VoiceNote {
  seconds: number;
  transcript: string;
  /** The kept file (`keepNote`), when it could be kept. */
  audioFile?: string;
}

export type VoicePhase = 'idle' | 'recording' | 'sending' | 'failed';
/** Why nothing was sent, for a short line in the composer or the sheet. */
export type VoiceNotice = 'tooShort' | 'noSpeech';

/**
 * A real voice message: records from the microphone, has the server write out what was said, and
 * hands the chat the words and the file. The first time, with the model on, it asks whether the
 * voice may go to the AI service (App Store rule 5.1.2(i)); a hold that had to ask records nothing.
 * `canRecord` is asked first, so someone out of shells is told before anything is uploaded. A clip
 * the server could not take waits for a retry and costs nothing. Starting and stopping the recorder
 * take time and run strictly in turn: a recorder left prepared refuses every later start.
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
  /** The finger is still down: a release during the slow start must not leave it recording. */
  const wanted = useRef(false);
  const live = useRef(false);
  const startedAt = useRef(0);
  /** Looks at the meter so far, and those loud enough for a voice. */
  const looks = useRef(0);
  const loud = useRef(0);
  const waiting = useRef<{ uri: string; seconds: number } | null>(null);
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

  const hand = async (clip: { uri: string; seconds: number }, transcript: string) => {
    const audioFile = chatId ? await keepNote(clip.uri, chatId) : undefined;
    latestOnNote.current({ seconds: clip.seconds, transcript, audioFile });
  };

  const deliver = async () => {
    const clip = waiting.current;
    if (!clip) return;
    setPhase('sending');
    if (!modelOn) {
      waiting.current = null;
      setPhase('idle');
      return hand(clip, VOICE_NO_WORDS);
    }
    const read = await readClip(clip.uri);
    const words = read ? await accessToken().then((token) => serverTranscribe(read, token)).catch(() => null) : null;
    if (waiting.current !== clip) return;
    if (words === null) return setPhase('failed');
    waiting.current = null;
    setPhase('idle');
    if (words) return hand(clip, words);
    setNotice('noSpeech');
    void dropClip(clip.uri);
  };

  const discard = () => {
    const clip = waiting.current;
    waiting.current = null;
    setPhase('idle');
    if (clip) void dropClip(clip.uri);
  };

  const begin = async () => {
    if (live.current || !wanted.current) return;
    const { granted, canAskAgain } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
      wanted.current = false;
      if (!canAskAgain) Alert.alert(t('chat.voice.noMic'));
      return;
    }
    // Let go during the permission prompt: nothing was meant.
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
    setSeconds(0);
    setPhase('recording');
  };

  const start = () => {
    if (wanted.current || live.current || phase === 'sending') return;
    setNotice(null);
    discard();
    if (canRecord && !canRecord()) return;
    if (modelOn && !allowed) {
      Alert.alert(t('chat.voiceConsent.title'), t('chat.voiceConsent.body'), [
        { text: t('chat.photoConsent.notNow'), style: 'cancel' },
        { text: t('chat.photoConsent.allow'), onPress: () => setSetting('voiceToAi', true) },
      ]);
      return;
    }
    stopNote();
    wanted.current = true;
    inTurn(begin);
  };

  const finish = (send: boolean) => {
    wanted.current = false;
    const liftedAt = Date.now();
    inTurn(async () => {
      if (!live.current) return;
      live.current = false;
      const held = Math.min(VOICE_SECONDS_MAX, Math.round((liftedAt - startedAt.current) / 1000));
      if (__DEV__) console.log(`[voice] ${held}s, ${loud.current} of ${looks.current} looks above ${VOICE_DB} dB`);
      // Sending from the moment the finger lifts, so the row does not blink away first.
      setPhase(send ? 'sending' : 'idle');
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
      waiting.current = { uri, seconds: held };
      await deliver();
    });
  };

  const latestFinish = useRef(finish);
  useEffect(() => {
    latestFinish.current = finish;
  });

  // The clock, the meter, and the limit.
  useEffect(() => {
    if (phase !== 'recording') return;
    const tick = setInterval(() => {
      const elapsed = (Date.now() - startedAt.current) / 1000;
      setSeconds(Math.min(VOICE_SECONDS_MAX, Math.floor(elapsed)));
      const { metering } = recorder.getStatus();
      if (typeof metering === 'number') {
        looks.current += 1;
        if (metering > VOICE_DB) loud.current += 1;
      }
      if (elapsed >= VOICE_SECONDS_MAX) latestFinish.current(true);
    }, 200);
    return () => clearInterval(tick);
  }, [phase, recorder]);

  // A call or leaving the app takes the microphone: what was said so far goes nowhere.
  useEffect(() => {
    const away = AppState.addEventListener('change', (state) => {
      if (state !== 'active') latestFinish.current(false);
    });
    return () => away.remove();
  }, []);
  useEffect(() => () => latestFinish.current(false), []);

  // A line that says why nothing went does not stay.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  return { phase, seconds, notice, start, finish, retry: deliver, discard };
}
