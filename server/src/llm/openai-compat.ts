import type { PromptLayout } from '../../../src/ai/prompt-layout.ts';
import { LlmBusyError, type LlmProvider } from './types.ts';

/**
 * Any provider that speaks the OpenAI chat-completions API (DeepSeek, OpenRouter, Groq, Together,
 * Mistral, a self-hosted vLLM or Ollama…): a base URL, a key and a model name in the environment
 * are enough. The system tiers become one system message, the history the turns, and this reply's
 * own lines a last user message.
 */
export function openAiCompatProvider(opts: { baseUrl: string; apiKey: string; model: string; label?: string }): LlmProvider {
  const base = opts.baseUrl.replace(/\/$/, '');
  return {
    name: `${opts.label ?? 'openai'}:${opts.model}`,
    async complete(layout, { timeoutMs }) {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${opts.apiKey}` },
        body: JSON.stringify({ model: opts.model, messages: toMessages(layout), temperature: 0.9, response_format: { type: 'json_object' } }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 429 || res.status === 503 || res.status === 529) throw new LlmBusyError(`${res.status} ${await res.text()}`);
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
      const json = (await res.json()) as {
        model?: string;
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_cache_hit_tokens?: number };
      };
      return {
        text: json.choices?.[0]?.message?.content ?? '',
        model: json.model ?? opts.model,
        usage: { input: json.usage?.prompt_tokens, cached: json.usage?.prompt_cache_hit_tokens, output: json.usage?.completion_tokens },
      };
    },
  };
}

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

export function toMessages(layout: PromptLayout): Message[] {
  const out: Message[] = [{ role: 'system', content: layout.system.map((block) => block.text).join('\n\n') }];
  out.push(...layout.history.map((turn) => ({ role: turn.role, content: turn.text })));
  if (layout.turn) out.push({ role: 'user', content: layout.turn });
  return out;
}

/** Tries each provider in order; the next answers when one is busy or fails. */
export function chainProviders(providers: readonly LlmProvider[]): LlmProvider | null {
  if (!providers.length) return null;
  if (providers.length === 1) return providers[0];
  return {
    name: providers.map((p) => p.name).join(' → '),
    async complete(layout, opts) {
      let last: unknown;
      for (const provider of providers) {
        try {
          return await provider.complete(layout, opts);
        } catch (error) {
          last = error;
          console.warn(`[chain] ${provider.name}: ${String((error as Error).message).slice(0, 140)}`);
        }
      }
      throw last instanceof LlmBusyError ? last : new LlmBusyError(String((last as Error)?.message));
    },
  };
}
