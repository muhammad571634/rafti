import { GoogleGenAI, type Content } from '@google/genai';

import type { PromptLayout } from '../../../src/ai/prompt-layout.ts';
import { LlmBusyError, type LlmProvider } from './types.ts';

/**
 * Google's Gemini (AI Studio key). The system tiers become the system instruction, the history the
 * turns, and this reply's own lines go last, on the user's side. JSON out, as `REPLY_SHAPE` asks.
 */
export function geminiProvider(apiKey: string, model: string): LlmProvider {
  const ai = new GoogleGenAI({ apiKey });
  return {
    name: `gemini:${model}`,
    async complete(layout, { timeoutMs }) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: toContents(layout),
          config: {
            systemInstruction: layout.system.map((block) => block.text).join('\n\n'),
            responseMimeType: 'application/json',
            temperature: 0.9,
            abortSignal: AbortSignal.timeout(timeoutMs),
          },
        });
        const usage = res.usageMetadata;
        return {
          text: res.text ?? '',
          usage: { input: usage?.promptTokenCount, cached: usage?.cachedContentTokenCount, output: usage?.candidatesTokenCount },
        };
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 429 || status === 503) throw new LlmBusyError(String((error as Error).message));
        throw error;
      }
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
