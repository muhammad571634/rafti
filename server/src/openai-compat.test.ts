import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { chainProviders, toMessages } from './llm/openai-compat.ts';
import { LlmBusyError, type LlmProvider } from './llm/types.ts';

const layout = { system: [{ tier: 'global' as const, text: 'Rules.' }, { tier: 'character' as const, text: 'Persona.' }], history: [{ role: 'assistant' as const, text: 'Hey!' }, { role: 'user' as const, text: 'Hi' }], turn: 'JSON only.', cut: 0 };

describe('OpenAI-compatible providers', () => {
  it('sends one system message, the turns, then this reply’s lines', () => {
    assert.deepEqual(toMessages(layout), [
      { role: 'system', content: 'Rules.\n\nPersona.' },
      { role: 'assistant', content: 'Hey!' },
      { role: 'user', content: 'Hi' },
      { role: 'user', content: 'JSON only.' },
    ]);
  });

  it('lets the next provider answer when one is busy or fails, and says busy when all are', async () => {
    const busy: LlmProvider = { name: 'a', complete: async () => Promise.reject(new LlmBusyError('quota')) };
    const broken: LlmProvider = { name: 'b', complete: async () => Promise.reject(new Error('500')) };
    const good: LlmProvider = { name: 'c', complete: async () => ({ text: '{"messages":["ok"]}', usage: {} }) };
    assert.equal((await chainProviders([busy, broken, good])!.complete(layout, { timeoutMs: 1000 })).text, '{"messages":["ok"]}');
    await assert.rejects(chainProviders([busy, broken])!.complete(layout, { timeoutMs: 1000 }), LlmBusyError);
    assert.equal(chainProviders([]), null);
    assert.equal(chainProviders([good]), good);
  });
});
