import { FinishReason, GoogleGenAI, HarmBlockThreshold, HarmCategory, type Content, type SafetySetting } from '@google/genai';

import type { PromptLayout } from '../../../src/ai/prompt-layout.ts';
import { LlmBusyError, type LlmProvider } from './types.ts';

/**
 * The output check (SAFETY_LAYERS, docs/content-policy.md): Gemini's own classifier stops only what
 * it rates a high risk, so romance, flirting, swearing, dark fantasy and story violence stay open
 * (the middle road for adults) while explicit sex, real-harm instructions and hate are stopped.
 * Current Gemini models default every category to off, so these add the check, not loosen one.
 * Sexual content with minors is blocked by Google whatever these say. Tested both ways on the
 * content-balance scenarios (server/src/evals) before a threshold changes.
 */
export const SAFETY_SETTINGS: SafetySetting[] = [
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  // Off: villains, roasts, a tsundere's insults and heavy swearing are part of the characters (owner,
  // 2026-11-09: never choke the freedom); hate speech above still stops at a high risk.
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.OFF },
];

/** Finish reasons that mean the filter, not the model, ended the answer. */
const STOPPED: readonly string[] = [FinishReason.SAFETY, FinishReason.PROHIBITED_CONTENT, FinishReason.BLOCKLIST, FinishReason.SPII];

/** Whether Gemini's filter stopped this answer: the user's prompt (`promptFeedback`) or the reply (`finishReason`). */
export function geminiBlocked(res: { promptFeedback?: { blockReason?: string }; candidates?: { finishReason?: string }[] }): 'prompt' | 'reply' | undefined {
  if (res.promptFeedback?.blockReason) return 'prompt';
  return STOPPED.includes(res.candidates?.[0]?.finishReason ?? '') ? 'reply' : undefined;
}

/**
 * Google's Gemini (AI Studio key). The system tiers become the system instruction, the history the
 * turns, and this reply's own lines go last, on the user's side. JSON out, as `REPLY_SHAPE` asks.
 *
 * Free-tier requests queue behind paid ones, so a model is sometimes "experiencing high demand" or
 * retired for new keys: `models` is tried in order, each with its own deadline, and the next one
 * answers instead. Only when every one is busy is the answer "busy", and the app says so: it never
 * puts a stock line in a character's mouth while the model is on. A paid key is the same code: set
 * the `GEMINI_API_KEY` secret (and `CHAT_MODELS` if the models change) on the server.
 * `temperature`: 0.9 for the characters; the eval set's judge reads at a low one.
 */
export function geminiProvider(apiKey: string, models: readonly string[], { temperature = 0.9 } = {}): LlmProvider {
  const ai = new GoogleGenAI({ apiKey });
  return {
    name: `gemini:${models[0]}`,
    async complete(layout, { timeoutMs, temperature: callTemperature }) {
      const deadline = Date.now() + timeoutMs;
      let last: unknown;
      // Round twice: a model that just said "high demand" is often free again a moment later.
      for (const [i, model] of [...models, ...models].entries()) {
        const left = deadline - Date.now();
        if (left < 1500) break;
        const tried = Date.now();
        try {
          const res = await ai.models.generateContent({
            model,
            contents: toContents(layout),
            config: {
              systemInstruction: layout.system.map((block) => block.text).join('\n\n'),
              responseMimeType: 'application/json',
              temperature: callTemperature ?? temperature,
              safetySettings: SAFETY_SETTINGS,
              // One model may not take the whole wait: the first gets half, each next a quarter.
              // Whole milliseconds: a fraction throws before the call is made.
              abortSignal: AbortSignal.timeout(Math.floor(Math.min(left, Math.max(5000, timeoutMs / (i === 0 ? 2 : 4))))),
            },
          });
          const usage = res.usageMetadata;
          const answer = usage?.candidatesTokenCount;
          // Stopped by the filter: the same for every model, so no next model is tried.
          const blocked = geminiBlocked(res);
          return {
            text: blocked ? '' : (res.text ?? ''),
            ...(blocked ? { blocked } : {}),
            // The model that really answered: an alias such as "gemini-flash-latest" is named here.
            model: res.modelVersion ?? model,
            usage: {
              input: usage?.promptTokenCount,
              cached: usage?.cachedContentTokenCount,
              // Thinking is billed as output.
              output: answer === undefined ? undefined : answer + (usage?.thoughtsTokenCount ?? 0),
            },
          };
        } catch (error) {
          last = error;
          console.warn(`[gemini] ${model}: ${String((error as Error).message).slice(0, 140)}`);
          // Turned away at once (a quota, high demand): a short breath before the next.
          if (Date.now() - tried < 1000) await new Promise((resolve) => setTimeout(resolve, 400));
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
  const parts = [...(layout.images ?? []).map(({ mimeType, data }) => ({ inlineData: { mimeType, data } })), ...(layout.turn ? [{ text: layout.turn }] : [])];
  if (parts.length) {
    const last = out[out.length - 1];
    if (last.role === 'user') last.parts = [...(last.parts ?? []), ...parts];
    else out.push({ role: 'user', parts });
  }
  return out;
}
