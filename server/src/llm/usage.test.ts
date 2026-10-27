import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PromptLayout } from '../../../src/ai/prompt-layout.ts';
import { costUsd, promptVersion } from './usage.ts';

describe('cost log', () => {
  it('prices a call at the paid tier: new input, cached input and output (with thinking)', () => {
    // 600 new input × $0.25 + 400 cached × $0.025 + 100 output × $1.50, per 1M tokens.
    assert.equal(costUsd('gemini-3.1-flash-lite', { input: 1000, cached: 400, output: 100 }), 0.00031);
    assert.equal(costUsd('gemini-2.5-flash', { input: 2000, output: 200 }), (2000 * 0.3 + 200 * 2.5) / 1e6);
  });

  it('takes the longest matching model name, reads "models/…", and leaves unknown models unpriced', () => {
    assert.equal(costUsd('gemini-2.5-flash-lite', { input: 1e6 }), 0.1);
    assert.equal(costUsd('models/gemini-2.5-flash-preview-09-2025', { output: 1e6 }), 2.5);
    assert.equal(costUsd('deepseek-chat', { input: 1000 }), null);
    assert.equal(costUsd(undefined, { input: 1000 }), null);
  });

  it('versions the prompt by its rules and persona, so editing either shows up in the log', () => {
    const layout = (rules: string, persona: string): PromptLayout => ({
      system: [
        { tier: 'global', text: rules },
        { tier: 'character', text: persona },
        { tier: 'chat', text: 'The user is Sam.' },
      ],
      history: [],
      turn: '',
      cut: 0,
    });
    const v1 = promptVersion(layout('Be kind.', 'Kai swims.'));
    assert.match(v1, /^g[0-9a-f]{8}\.c[0-9a-f]{8}$/);
    assert.equal(promptVersion({ ...layout('Be kind.', 'Kai swims.'), turn: 'new every reply' }), v1);
    assert.notEqual(promptVersion(layout('Be kinder.', 'Kai swims.')).slice(0, 9), v1.slice(0, 9));
    assert.notEqual(promptVersion(layout('Be kind.', 'Kai dives.')).slice(10), v1.slice(10));
    assert.equal(promptVersion({ system: [], history: [], turn: '', cut: 0 }), 'g-.c-');
  });
});
