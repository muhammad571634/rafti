import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, Message, User } from '@/types';

import { chatParts } from './chat-prompt';
import { buildDateRoundsPrompt, buildQuizAnswerPrompt, buildSelfQuizPrompt, streamLineParts } from './content-prompts';
import { firstTextParts, type FirstTextRequest } from './first-text';
import { MODE_BLOCKS, PROMPT_MODES } from './modes';
import { layoutPrompt, orderParts, type PromptPart } from './prompt-layout';
import { groupParts } from './rules';

const kai = { id: 'c_kai', name: 'Kai Arden', handle: '@k', bio: 'Swim-team ace.', category: 'school', accentIndex: 0, voiceReady: false, isOfficial: true, greeting: 'Hey.', tags: ['cheerful'], series: 'Seaside Academy' } as Character;
const theo = { ...kai, id: 'c_theo', name: 'Theo Lancaster' } as Character;
const sam = { id: 'u1', displayName: 'Sam', locale: 'en-US' } as User;
const now = '2026-10-28T19:00:00.000Z';
const hi: Message = { id: 'm1', conversationId: 'c', author: 'me', kind: 'text', text: 'hi', createdAt: now };

const modeText = (parts: PromptPart[]) => parts.filter((p) => p.name === 'mode').map((p) => p.text);

describe('mode templates (backend-plan §12.5)', () => {
  it('has one block per mode, each named on its first line', () => {
    for (const mode of PROMPT_MODES) assert.match(MODE_BLOCKS[mode][0], /^MODE: [A-Z ]+ \(/, mode);
    assert.equal(new Set(PROMPT_MODES.map((m) => MODE_BLOCKS[m][0])).size, PROMPT_MODES.length);
  });

  it('puts the chat block in the cached chat tier: after the user, before pinned memories and the history', () => {
    const parts = chatParts({ character: kai, user: sam, messages: [hi], pinned: [{ id: 'p', characterId: 'c_kai', text: 'Has a dog', createdAt: now } as never] });
    assert.deepEqual(modeText(parts), [MODE_BLOCKS.chat.join('\n')]);
    const names = orderParts(parts).map((p) => p.name);
    assert.ok(names.indexOf('user') < names.indexOf('mode') && names.indexOf('mode') < names.indexOf('pinned'), names.join());
    const layout = layoutPrompt(parts);
    assert.match(layout.system.find((b) => b.tier === 'chat')?.text ?? '', /MODE: CHAT/);
    assert.doesNotMatch(layout.turn, /MODE:/);
  });

  it('gives every builder its own mode, exactly once', () => {
    const request = { kind: 'week', input: { character: kai, user: sam, week: { days: 5, messages: 40, wins: [], winCount: 0, quests: 0, pages: 0 }, now } } as unknown as FirstTextRequest;
    assert.deepEqual(modeText(firstTextParts(request)), [MODE_BLOCKS.initiative.join('\n')]);
    assert.deepEqual(modeText(groupParts(kai, [theo], sam)), [MODE_BLOCKS.group.join('\n')]);
    const stream = streamLineParts({ character: kai, user: sam }, theo, 'pizza toppings', [], { index: 0, total: 4 });
    assert.deepEqual(modeText(stream), [MODE_BLOCKS.stream.join('\n')]);

    const input = { character: kai, user: sam };
    for (const [prompt, mode] of [
      [buildSelfQuizPrompt(input, '2026-W44'), 'game'],
      [buildQuizAnswerPrompt(input, 'Tea or coffee?', ['Tea', 'Coffee']), 'game'],
      [buildDateRoundsPrompt(input, { title: 'Pier', scene: 'Sunset on the pier.', rounds: 3, mood: 'sweet' }), 'date'],
    ] as const) {
      assert.equal(prompt.split('MODE: ').length - 1, 1, mode);
      assert.ok(prompt.includes(MODE_BLOCKS[mode].join('\n')), mode);
    }
  });

  it('keeps the rules pointing at the mode, with texting as the fallback', () => {
    const rules = orderParts(chatParts({ character: kai, user: sam, messages: [] }))[0];
    assert.equal(rules.name, 'rules');
    assert.match(rules.text, /The MODE below sets the form/);
  });
});
