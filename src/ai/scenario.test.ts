import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { characters } from '../mock/characters';
import { currentUser } from '../mock/user';

import { buildDraftPrompt, parseDraft } from './character-draft';
import { buildGroupPrompt } from './rules';

describe('start scene (0z296)', () => {
  const [base, other] = characters;
  const made = { ...base, id: 'u_lena', isOfficial: false, scenario: '{{user}} comes home late; {{char}} is waiting on the stairs with two cups of tea.' };

  it('stays in the persona with both names filled in', () => {
    const prompt = buildGroupPrompt(made, [other], currentUser);
    assert.match(prompt, /How your story with them began/);
    assert.ok(prompt.includes(`${currentUser.displayName} comes home late; ${made.name} is waiting`));
  });

  it('is left out when the creator wrote none', () => {
    assert.doesNotMatch(buildGroupPrompt(base, [other], currentUser), /How your story with them began/);
  });

  it('is written by quick create and kept by the draft reader, cut to its length', () => {
    assert.match(buildDraftPrompt({ idea: 'my roommate', sparks: [], language: 'English' } as never), /scenario: how their story with the user begins/);
    const raw = JSON.stringify({ name: 'Lena', greeting: 'Hi', age: 24, scenario: 'x'.repeat(400) });
    const result = parseDraft(raw);
    assert.ok(result.ok && result.draft.scenario.length === 300);
  });
});
