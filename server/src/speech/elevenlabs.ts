import type { SpeakRequest } from '../../../src/ai/session-types.ts';
import { LlmBusyError } from '../llm/types.ts';

/** A voice service: reads a line aloud in a given voice. */
export interface SpeechProvider {
  name: string;
  /** The voice for a character: their own when one is set, else one for their gender. */
  voiceFor(request: SpeakRequest): string;
  /** MP3 bytes; throws `LlmBusyError` when the service is busy. */
  speak(text: string, voiceId: string, timeoutMs: number): Promise<{ audio: Buffer; model: string }>;
}

export interface ElevenLabsOptions {
  apiKey: string;
  /** Flash for calls: about half the price of v3, and fast (`docs/voice-provider-fish-audio.md`). */
  model: string;
  voiceFemale: string;
  voiceMale: string;
  /** Character id → voice id, once each character has a voice picked by ear. */
  voices: Record<string, string>;
}

/** Small enough for a phone on mobile data, clear enough for speech. */
const OUTPUT_FORMAT = 'mp3_22050_32';

/**
 * ElevenLabs text to speech (`POST /v1/text-to-speech/{voice_id}`), the owner's pick from the blind
 * test (2026-10-31). The key stays on the server (`ELEVENLABS_API_KEY`).
 */
export function elevenLabsSpeech(opts: ElevenLabsOptions): SpeechProvider {
  return {
    name: `elevenlabs:${opts.model}`,
    voiceFor: ({ characterId, gender }) => opts.voices[characterId] ?? (gender === 'male' ? opts.voiceMale : opts.voiceFemale),
    async speak(text, voiceId, timeoutMs) {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${OUTPUT_FORMAT}`, {
        method: 'POST',
        headers: { 'xi-api-key': opts.apiKey, 'content-type': 'application/json', accept: 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: opts.model }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 429) throw new LlmBusyError('elevenlabs: busy');
      if (!res.ok) throw new Error(`elevenlabs ${res.status}: ${(await res.text().catch(() => '')).slice(0, 160)}`);
      return { audio: Buffer.from(await res.arrayBuffer()), model: opts.model };
    },
  };
}
