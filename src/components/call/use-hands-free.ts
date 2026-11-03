import { AudioModule, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState } from 'react-native';

import { accessToken } from '@/ai/account';
import { serverTranscribe } from '@/ai/server';
import { VOICE_SECONDS_MAX } from '@/ai/voice-prompt';
import { OPTIONS, VOICE_DB, VOICE_MOMENTS } from '@/components/chat/use-voice-note';
import { PLAYBACK_MODE } from '@/components/chat/voice-player';
import { dropClip, readClip } from '@/lib/voice-files';
import { useAppStore } from '@/store/use-app-store';

/** How often the level is read. */
const LOOK_MS = 150;
/** This long under the voice line after speech ends the turn, as a pause does on a phone call. */
const SILENCE_MS = 1200;
/** Speech shorter than this is a cough or a word to someone else in the room, not a turn. */
const MIN_SPEECH_MS = 500;
/** With no speech for this long the recording starts over, so a clip never carries much silence. */
const IDLE_RESTART_MS = 15_000;

/**
 * `listening`: the mic is open, nobody speaks; `speaking`: the user is talking; `sending`: their
 * words are being written out; `failed`: that did not reach the server (tap to send again).
 */
export type ListenPhase = 'off' | 'listening' | 'speaking' | 'sending' | 'failed';

/**
 * A call's open microphone (0z102): while `on`, it listens, notices when the user starts talking
 * by the level (`VOICE_DB`, read on the A51) and when they stop (`SILENCE_MS` of quiet), and hands
 * the call the words the server wrote out. No button: a call is not a walkie-talkie. Leaving the
 * app or turning `on` off throws away what was being said. The first time, it asks whether the
 * voice may go to the AI service (App Store 5.1.2(i)), as a voice message does.
 */
export function useHandsFree(on: boolean, onWords: (words: { text: string; language?: string }) => void) {
  const { t } = useTranslation();
  const allowed = useAppStore((s) => s.settings.voiceToAi);
  const setSetting = useAppStore((s) => s.setSetting);
  const recorder = useAudioRecorder(OPTIONS);

  const [phase, setPhase] = useState<ListenPhase>('off');
  const [awake, setAwake] = useState(AppState.currentState === 'active');
  const phaseRef = useRef<ListenPhase>('off');
  const go = (next: ListenPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };
  const live = useRef(false);
  const startedAt = useRef(0);
  const lastLoud = useRef(0);
  const loudRun = useRef(0);
  const heardFrom = useRef(0);
  const waiting = useRef<string | null>(null);
  const asked = useRef(false);
  const refused = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const inTurn = (job: () => Promise<unknown>) => {
    queue.current = queue.current.then(job).catch((error: unknown) => {
      console.warn(`[call-mic] ${String((error as Error)?.message).slice(0, 120)}`);
    });
  };
  const latestOnWords = useRef(onWords);
  useEffect(() => {
    latestOnWords.current = onWords;
  });

  const send = async () => {
    const uri = waiting.current;
    if (!uri) return;
    go('sending');
    const clip = await readClip(uri);
    const heard = clip ? await accessToken().then((token) => serverTranscribe(clip, token)).catch(() => null) : null;
    if (waiting.current !== uri) return;
    if (heard === null) return go('failed');
    waiting.current = null;
    void dropClip(uri);
    // The words first, so the call stops wanting the mic before it could open again; noise with
    // no words in it: just listen on.
    if (heard.text) latestOnWords.current({ text: heard.text, language: heard.language });
    go('off');
  };

  const begin = async () => {
    if (live.current || phaseRef.current !== 'off') return;
    // Look before asking: asking opens a system screen even when the answer is yes (0z94).
    const { granted, canAskAgain } = await AudioModule.getRecordingPermissionsAsync();
    if (!granted) {
      // Once a call: a no is not asked again until the next call.
      if (refused.current) return;
      // Ask even when the answer says not to: an "only this time" yes that ran out reads as "never"
      // on Android (seen on the A51), yet the system still shows its prompt.
      const answer = await AudioModule.requestRecordingPermissionsAsync();
      if (!answer.granted) {
        refused.current = true;
        if (!answer.canAskAgain && !canAskAgain) Alert.alert(t('chat.voice.noMic'));
        return;
      }
      // Leaving for the system prompt counts as leaving the app; coming back opens the mic too.
      if (AppState.currentState !== 'active') return;
    }
    // Their voice is never cut by the mic: the call keeps the mic closed while it plays.
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    live.current = true;
    startedAt.current = Date.now();
    lastLoud.current = 0;
    loudRun.current = 0;
    heardFrom.current = 0;
    go('listening');
  };

  /** Stops the mic; `keep` sends what was said, otherwise it is thrown away. */
  const end = (keep: boolean) =>
    inTurn(async () => {
      if (!live.current) return;
      live.current = false;
      await recorder.stop().catch(() => {});
      const uri = recorder.uri;
      await setAudioModeAsync(PLAYBACK_MODE).catch(() => {});
      if (!uri) return go('off');
      if (!keep) {
        void dropClip(uri);
        return go('off');
      }
      waiting.current = uri;
      await send();
    });
  const latestEnd = useRef(end);
  useEffect(() => {
    latestEnd.current = end;
  });

  // The first open mic of a call asks once whether the voice may go to the AI service.
  useEffect(() => {
    if (!on || allowed || asked.current) return;
    asked.current = true;
    Alert.alert(t('chat.voiceConsent.title'), t('chat.voiceConsent.body'), [
      { text: t('chat.photoConsent.notNow'), style: 'cancel' },
      { text: t('chat.photoConsent.allow'), onPress: () => setSetting('voiceToAi', true) },
    ]);
  }, [on, allowed, t, setSetting]);

  // Open the mic whenever the call wants it and nothing else is going on.
  useEffect(() => {
    if (on && allowed && awake && phase === 'off') inTurn(begin);
    if ((!on || !awake) && (phase === 'listening' || phase === 'speaking')) latestEnd.current(false);
    // `begin` and `inTurn` read refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, allowed, awake, phase]);

  // The level: speech starts after a few loud looks and ends after a quiet pause.
  useEffect(() => {
    if (phase !== 'listening' && phase !== 'speaking') return;
    const look = setInterval(() => {
      const now = Date.now();
      const { metering } = recorder.getStatus();
      if (typeof metering === 'number' && metering > VOICE_DB) {
        loudRun.current += 1;
        lastLoud.current = now;
        if (phaseRef.current === 'listening' && loudRun.current >= VOICE_MOMENTS) {
          heardFrom.current = now - loudRun.current * LOOK_MS;
          go('speaking');
        }
      } else loudRun.current = 0;

      if (phaseRef.current === 'speaking') {
        const long = now - startedAt.current >= VOICE_SECONDS_MAX * 1000;
        if (now - lastLoud.current >= SILENCE_MS || long) latestEnd.current(lastLoud.current - heardFrom.current >= MIN_SPEECH_MS || long);
      } else if (now - startedAt.current >= IDLE_RESTART_MS) latestEnd.current(false);
    }, LOOK_MS);
    return () => clearInterval(look);
  }, [phase, recorder]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setAwake(state === 'active'));
    return () => sub.remove();
  }, []);
  useEffect(() => () => latestEnd.current(false), []);

  return {
    phase,
    /** Sends a clip the server did not get again. */
    retry: () => inTurn(send),
  };
}
