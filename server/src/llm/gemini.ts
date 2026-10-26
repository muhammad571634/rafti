import { GoogleGenAI, type Content } from '@google/genai';

import type { PromptLayout } from '../../../src/ai/prompt-layout.ts';
import { LlmBusyError, type LlmProvider } from './types.ts';

/**
 * Google's Gemini (AI Studio key). The system tiers become the system instruction, the history the
 * turns, and this reply's own lines go last, on the user's side. JSON out, as `REPLY_SHAPE` asks.
 *
 * Free-tier requests queue behind paid ones, so a model is sometimes "experiencing high demand" or
 * retired for new keys: `models` is tried in order, each with its own deadline, and the next one
 * answers instead. Only when every one is busy does the app fall back to its stand-in.
 */
export function geminiProvider(apiKey: string, models: readonly string[]): LlmProvider {
  const ai = new GoogleGenAI({ apiKey });
  return {
    name: `gemini:${models[0]}`,
    async complete(layout, { timeoutMs }) {
      const deadline = Date.now() + timeoutMs;
      let last: unknown;
      for (const model of models) {
        const left = deadline - Date.now();
        if (left < 1500) break;
        try {
          const res = await ai.models.generateContent({
            model,
            contents: toContents(layout),
            config: {
              systemInstruction: layout.system.map((block) => block.text).join('\n\n'),
              responseMimeType: 'application/json',
              temperature: 0.9,
              // One model may not take the whole wait: leave room for the next.
              abortSignal: AbortSignal.timeout(Math.min(left, Math.max(6000, timeoutMs / 2))),
            },
          });
          const usage = res.usageMetadata;
          return {
            text: res.text ?? '',
            model,
            usage: { input: usage?.promptTokenCount, cached: usage?.cachedContentTokenCount, output: usage?.candidatesTokenCount },
          };
        } catch (error) {
          last = error;
          console.warn(`[gemini] ${model}: ${String((error as Error).message).slice(0, 140)}`);
        }
      }
      throw new LlmBusyError(String((last as Error | undefined)?.message ?? 'no model answered'));
    },
  };
}

/** The history as Gemini turns; the conversation must open on the user's side. */
export function toContents(layout: PromptLayout): Content[] {
  const out: Content[] = layout.history.map((turn) => ({ role: turn.role === 'assistant' ? 'model' : 'user', parts: [{ text: turn.text }] }));
  if (out[0]?.role !== 'user') out.unshift({ role: 'user', parts: [{ text: '(The chat opens.)' }] });
  if (layout.turn) {
    const last = out[out.length - 1];
    if (last.role === 'user') last.parts = [...(last.parts ?? []), { text: layout.turn }];
    else out.push({ role: 'user', parts: [{ text: layout.turn }] });
  }
  return out;
}
