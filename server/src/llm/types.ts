import type { PromptLayout } from '../../../src/ai/prompt-layout.ts';

/**
 * Every model behind one interface (backend-plan §1.4): swapping Gemini for Claude or a local model
 * is one new file. The prompt arrives already laid out for caching (`layoutPrompt`).
 */
export interface LlmProvider {
  name: string;
  /** `temperature`: the provider's own when missing (0.9, for the characters); low for work that must be exact (the memory pass). */
  complete(layout: PromptLayout, opts: { timeoutMs: number; temperature?: number }): Promise<LlmResult>;
}

export interface LlmResult {
  text: string;
  /** The model that answered (a provider may fall back to another). */
  model?: string;
  /**
   * Tokens, for the cost log (`usage_events`). Input counts the cached tokens too; output counts the
   * answer and any thinking, both billed as output.
   */
  usage: { input?: number; cached?: number; output?: number };
}

/** The provider is out of quota or rate-limited (the free tier's daily cap): try later. */
export class LlmBusyError extends Error {}
