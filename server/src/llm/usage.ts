import { createHash } from 'node:crypto';

import type { PromptLayout } from '../../../src/ai/prompt-layout.ts';
import type { LlmResult } from './types.ts';

/**
 * List prices in USD per 1M tokens: Google's paid tier, standard (not batch), read 2026-10-27 from
 * ai.google.dev/gemini-api/docs/pricing. The free tier pays nothing; the cost log keeps what the same
 * call costs on the paid tier, which is what the unit economics need (backend-plan §9, §13.2).
 * Output includes thinking tokens, billed at the output rate.
 */
const PRICES: Record<string, { input: number; cached: number; output: number }> = {
  'gemini-3.1-flash-lite': { input: 0.25, cached: 0.025, output: 1.5 },
  'gemini-2.5-flash-lite': { input: 0.1, cached: 0.01, output: 0.4 },
  'gemini-2.5-flash': { input: 0.3, cached: 0.03, output: 2.5 },
  'gemini-3-flash': { input: 0.5, cached: 0.05, output: 3 },
  // Until 2026-12-31. From 2027-01-01: $1.50 / $0.15 / $7.50.
  'gemini-3.6-flash': { input: 0.75, cached: 0.075, output: 3.75 },
  'gemini-3.8-flash': { input: 0.75, cached: 0.075, output: 3.75 },
};

/**
 * What a call costs on the paid tier, or null for a model with no list price here. The longest
 * matching name wins, so "gemini-2.5-flash-lite" is not priced as "gemini-2.5-flash". Input counts
 * the cached tokens too, as both Gemini and OpenAI-style APIs report it.
 */
export function costUsd(model: string | undefined, usage: LlmResult['usage']): number | null {
  const name = model?.replace(/^models\//, '');
  const key = name && Object.keys(PRICES).filter((k) => name.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  if (!key) return null;
  const price = PRICES[key];
  const input = usage.input ?? 0;
  const cached = Math.min(usage.cached ?? 0, input);
  return ((input - cached) * price.input + cached * price.cached + (usage.output ?? 0) * price.output) / 1e6;
}

/**
 * Which rules and persona wrote a reply (backend-plan §12.11): a short hash of the global tier (the
 * rules) and of the character tier (persona and world), e.g. "g3f9a1c2e.c7b0d4e19". Editing either
 * changes it, so cost and quality can be tied to a version without anyone bumping a number by hand.
 */
export function promptVersion(layout: PromptLayout): string {
  const hash = (tier: 'global' | 'character') => {
    const text = layout.system.find((block) => block.tier === tier)?.text;
    return text ? createHash('sha256').update(text).digest('hex').slice(0, 8) : '-';
  };
  return `g${hash('global')}.c${hash('character')}`;
}
