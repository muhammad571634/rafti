import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createApp } from './app.ts';
import { toContents } from './llm/gemini.ts';
import { LlmBusyError, type LlmProvider } from './llm/types.ts';

const kai = { id: 'c_kai', name: 'Kai', handle: '@k', bio: 'Swimmer.', category: 'school', accentIndex: 0, voiceReady: false, isOfficial: true, greeting: 'Hey!', tags: ['cheerful'] };
const body = {
  character: kai,
  user: { id: 'u1', displayName: 'Sam' },
  messages: [
    { id: 'm1', conversationId: 'c', author: 'them', kind: 'text', text: 'Hey!', createdAt: '2026-10-26T10:00:00Z' },
    { id: 'm2', conversationId: 'c', author: 'me', kind: 'text', text: 'I had a long day', createdAt: '2026-10-26T10:01:00Z' },
  ],
  redo: ['Aww, rest then.'],
};

const post = (app: ReturnType<typeof createApp>, json: unknown) =>
  app.request('/v1/chat/reply', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(json) });

describe('sigmazam-api', () => {
  it('lays out the chat prompt, asks the model and returns its bubbles', async () => {
    let seen = '';
    const provider: LlmProvider = {
      name: 'fake',
      async complete(layout) {
        seen = [...layout.system.map((s) => s.text), ...layout.history.map((t) => t.text), layout.turn].join('\n');
        return { text: '{"emotion":"tender","intensity":0.6,"messages":["Come here.","*hands you tea*"]}', usage: {} };
      },
    };
    const res = await post(createApp(provider, { timeoutMs: 1000 }), body);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json.messages, ['Come here.', '*hands you tea*']);
    assert.match(seen, /YOUR PERSONA/);
    assert.match(seen, /I had a long day/);
    assert.match(seen, /NEW VERSION/);
  });

  it('says why when it cannot answer: no model, bad input, the free tier is busy', async () => {
    assert.equal((await post(createApp(null, { timeoutMs: 1000 }), body)).status, 503);
    const busy: LlmProvider = { name: 'fake', complete: async () => Promise.reject(new LlmBusyError('quota')) };
    const res = await post(createApp(busy, { timeoutMs: 1000 }), body);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: 'busy' });
    assert.equal((await post(createApp(busy, { timeoutMs: 1000 }), { messages: [] })).status, 400);
  });

  it('gives Gemini a conversation that opens on the user side, with this turn last', () => {
    const contents = toContents({ system: [], history: [{ role: 'assistant', text: 'Hey!' }, { role: 'user', text: 'Hi' }], turn: 'Reply with JSON only.', cut: 0 });
    assert.deepEqual(
      contents.map((c) => [c.role, c.parts?.map((p) => p.text)]),
      [
        ['user', ['(The chat opens.)']],
        ['model', ['Hey!']],
        ['user', ['Hi', 'Reply with JSON only.']],
      ],
    );
  });
});
