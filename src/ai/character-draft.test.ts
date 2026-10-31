import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { checkCreation, DEFINITION_MAX, GREETING_MAX, TAGLINE_MAX } from '../lib/create-character';
import { mockDraft, mockDraftReply, mockFieldReply } from '../mock/character-drafts';
import type { Character, User } from '@/types';

import {
  buildDraftPrompt,
  buildFieldPrompt,
  chatToDefinition,
  checkIdea,
  definitionForPrompt,
  definitionFromDialog,
  definitionToText,
  type DraftField,
  fillNames,
  ideaText,
  parseDefinition,
  parseDraft,
  parseField,
  pickOpening,
  SPARKS,
  textToDefinition,
} from './character-draft';
import { buildCharacterPrompt } from './rules';

const good = {
  name: 'Mira',
  tagline: 'Keeps the lighthouse and your secrets',
  bio: 'I keep the old lighthouse and write letters to the sea.',
  look: 'Auburn hair, a yellow raincoat.',
  age: 27,
  gender: 'female',
  speakingStyle: 'gentle',
  role: 'friend',
  tags: ['calm', 'caring', 'not-a-trait'],
  greeting: 'You made it up all those stairs, {{user}}? Sit, the kettle is on.',
  greetings: ['Storm tonight. Stay?', 'Storm tonight. Stay?', 'You made it up all those stairs, {{user}}? Sit, the kettle is on.'],
  dialog: [
    { from: 'other', text: 'Do you ever get lonely up here?' },
    { from: 'char', text: 'The gulls gossip enough for ten people.' },
    { from: 'someone', text: 'dropped' },
  ],
  starters: ['Read me a letter?', 'How was the sea today?'],
};

describe('checkIdea', () => {
  it('passes a plain idea with up to three sparks', () => {
    assert.deepEqual(checkIdea('A lighthouse keeper who writes letters to the sea', ['calmUntilHurt']), []);
  });

  it('flags empty, long, too many or unknown sparks, minors and explicit set-ups', () => {
    assert.deepEqual(checkIdea('  ', []), ['empty']);
    assert.deepEqual(checkIdea('x'.repeat(301), []), ['long']);
    assert.deepEqual(checkIdea('A baker', SPARKS.slice(0, 4)), ['sparks']);
    assert.deepEqual(checkIdea('A baker', ['nope']), ['sparks']);
    assert.deepEqual(checkIdea('A shy high school student', []), ['minors']);
    assert.deepEqual(checkIdea('An nsfw roommate', []), ['explicit']);
  });
});

describe('ideaText', () => {
  it('carries the sparks after the idea, as one description', () => {
    assert.equal(ideaText(' A baker ', []), 'A baker');
    assert.match(ideaText('A baker', ['bluntThenSorry']), /^A baker\nPersonality: blunt first, sorry right after\.$/);
  });
});

describe('prompts', () => {
  it('asks for the whole character as JSON, with the idea, role and language', () => {
    const prompt = buildDraftPrompt({ idea: 'A night-shift baker', sparks: ['teasesWhenNervous'], role: 'crush', language: 'Uzbek' });
    assert.match(prompt, /REPLY LANGUAGE: Uzbek/);
    assert.match(prompt, /A night-shift baker\nPersonality: teases/);
    assert.match(prompt, /their crush/);
    assert.match(prompt, /"refused":"realPerson"/);
    assert.match(prompt, /Shape: \{"name"/);
  });

  it('asks for one field from what the form holds', () => {
    const prompt = buildFieldPrompt('greeting', { name: 'Mira', bio: 'Keeps a lighthouse.' }, 'English');
    assert.match(prompt, /Name: Mira\nBio: Keeps a lighthouse\./);
    assert.match(prompt, /- greeting: /);
    assert.match(prompt, /Shape: \{"value":""\}/);
  });
});

describe('parseDraft', () => {
  it('keeps what fits and drops what does not', () => {
    const result = parseDraft(`\`\`\`json\n${JSON.stringify(good)}\n\`\`\``);
    assert.ok(result.ok);
    const { draft } = result;
    assert.equal(draft.name, 'Mira');
    assert.deepEqual(draft.tags, ['calm', 'caring']);
    // The copy of the main greeting and the duplicate go.
    assert.deepEqual(draft.greetings, ['Storm tonight. Stay?']);
    assert.equal(
      draft.definition,
      '{{random_user_1}}: Do you ever get lonely up here?\n{{char}}: The gulls gossip enough for ten people.',
    );
    assert.equal(draft.gender, 'female');
  });

  it('clips long fields at a word and falls back on unknown choices', () => {
    const result = parseDraft(
      JSON.stringify({ ...good, tagline: 'word '.repeat(30), greeting: 'hey '.repeat(80), speakingStyle: 'loud', role: 'boss', gender: 'robot' }),
    );
    assert.ok(result.ok);
    assert.ok(result.draft.tagline.length <= TAGLINE_MAX && result.draft.tagline.endsWith('…'));
    assert.ok(result.draft.greeting.length <= GREETING_MAX);
    assert.equal(result.draft.speakingStyle, 'casual');
    assert.equal(result.draft.role, 'friend');
    assert.equal(result.draft.gender, undefined);
  });

  it('reports refusals, minors, explicit text and broken JSON', () => {
    assert.deepEqual(parseDraft('{"refused":"realPerson"}'), { ok: false, problem: 'realPerson' });
    assert.deepEqual(parseDraft('{"refused":"minor"}'), { ok: false, problem: 'minors' });
    assert.deepEqual(parseDraft(JSON.stringify({ ...good, age: 16 })), { ok: false, problem: 'minors' });
    assert.deepEqual(parseDraft(JSON.stringify({ ...good, bio: 'She is a teenager.' })), { ok: false, problem: 'minors' });
    assert.deepEqual(parseDraft(JSON.stringify({ ...good, look: 'nude' })), { ok: false, problem: 'explicit' });
    assert.deepEqual(parseDraft(JSON.stringify({ ...good, name: '' })), { ok: false, problem: 'format' });
    assert.deepEqual(parseDraft('not json'), { ok: false, problem: 'format' });
  });
});

describe('parseField', () => {
  it('returns the rewritten field, or null when it is unusable', () => {
    assert.equal(parseField('tagline', '{"value":"Night owl with a soft spot"}'), 'Night owl with a soft spot');
    assert.deepEqual(parseField('starters', '{"values":["Hi!","Hi!","Up late?"]}'), ['Hi!', 'Up late?']);
    assert.equal(parseField('dialog', '{"dialog":[{"from":"char","text":"Hm."}]}'), '{{char}}: Hm.');
    assert.equal(parseField('bio', '{"value":""}'), null);
    assert.equal(parseField('bio', '{"refused":"owned"}'), null);
    assert.equal(parseField('bio', '{"value":"A high school kid"}'), null);
  });
});

describe('definitions', () => {
  it('stops before the limit, keeping whole lines from the start', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ from: 'char', text: `Line ${i} ${'x'.repeat(60)}` }));
    const definition = definitionFromDialog(many);
    assert.ok(definition.length <= DEFINITION_MAX);
    assert.ok(definition.startsWith('{{char}}: Line 0 '));
  });

  it('splits turns by speaker; lines below a speaker carry on their turn', () => {
    assert.deepEqual(parseDefinition('A note first\n{{char}}: Hi\nstill me\n\nproducer: Next caller'), [
      { speaker: '', text: 'A note first' },
      { speaker: '{{char}}', text: 'Hi\nstill me' },
      { speaker: 'producer', text: 'Next caller' },
    ]);
  });

  it('fills the names and keeps whole turns while they fit', () => {
    const names = { char: 'Mira', user: 'Sam' };
    assert.equal(fillNames('{{char}} waves at {{user}} and {{random_user_2}}', names), 'Mira waves at Sam and Person 2');
    assert.equal(definitionForPrompt('{{random_user_1}}: Hi\n{{char}}: Hello {{user}}', names), 'Person 1: Hi\nMira: Hello Sam');
    assert.equal(definitionForPrompt('{{char}}: one\n{{char}}: two', names, 12), 'Mira: one');
    assert.equal(definitionForPrompt(undefined, names), '');
  });
});

describe('pickOpening', () => {
  it('picks the greeting or an extra one, the same for the same seed', () => {
    const character = { greeting: 'Hi.', greetings: ['Hey.', ' '] };
    const first = pickOpening(character, 'conv_1');
    assert.ok(['Hi.', 'Hey.'].includes(first));
    assert.equal(pickOpening(character, 'conv_1'), first);
    assert.equal(pickOpening({ greeting: '' }, 'x'), '');
  });
});

describe('mockDraft', () => {
  it('fills every field the same way each time, within the limits', () => {
    const input = { idea: 'He runs a night bakery, 29 years old', sparks: ['bluntThenSorry', 'remembersEverything'] as const, language: 'English' };
    const draft = mockDraft({ ...input, sparks: [...input.sparks] });
    assert.deepEqual(mockDraft({ ...input, sparks: [...input.sparks] }), draft);
    assert.equal(draft.gender, 'male');
    assert.equal(draft.age, 29);
    assert.deepEqual(draft.tags, ['sarcastic', 'sweet']);
    assert.equal(draft.greetings.length, 3);
    assert.equal(draft.voicePreset, 'calm');
    assert.equal(parseDefinition(draft.definition).length, 4);
    assert.equal(draft.starters.length, 3);
  });
});

describe('buildCharacterPrompt with a quick-create character', () => {
  it('carries the tagline, the look and the sample dialog with names filled in', () => {
    const character = {
      id: 'c_1',
      name: 'Mira',
      handle: '@you',
      bio: 'Keeps a lighthouse.',
      category: 'original',
      accentIndex: 0,
      voiceReady: true,
      isOfficial: false,
      greeting: 'Hi.',
      tags: ['calm'],
      tagline: 'Keeps your secrets',
      look: 'A yellow raincoat.',
      definition: '{{random_user_1}}: Lonely?\n{{char}}: Never with gulls around.',
    } as Character;
    const prompt = buildCharacterPrompt(character, { displayName: 'Sam', locale: 'en-US' } as User);
    assert.match(prompt, /In a few words: Keeps your secrets/);
    assert.match(prompt, /How you look: A yellow raincoat\./);
    assert.match(prompt, /HOW YOU TALK[^\n]*\nPerson 1: Lonely\?\nMira: Never with gulls around\./);
  });
});

describe('chatToDefinition', () => {
  it('adds the latest chat lines, the user as another person', () => {
    const lines = [
      { author: 'me' as const, text: 'old' },
      ...Array.from({ length: 9 }, (_, i) => ({ author: (i % 2 ? 'me' : 'them') as 'me' | 'them', text: `line ${i}` })),
    ];
    const { definition, added } = chatToDefinition('{{char}}: Hi.', lines);
    assert.equal(added, 8);
    assert.ok(definition.startsWith('{{char}}: Hi.\n{{random_user_1}}: line 1\n{{char}}: line 2'));
    assert.ok(!definition.includes('old'));
  });

  it('adds nothing when no line fits', () => {
    const full = 'x'.repeat(DEFINITION_MAX - 5);
    assert.deepEqual(chatToDefinition(full, [{ author: 'them', text: 'too long to fit' }]), { definition: full, added: 0 });
    assert.equal(chatToDefinition('', []).added, 0);
  });
});

describe('the dialog editor text', () => {
  const labels = { char: 'Mira', other: 'Someone' };
  it('shows names for slots and turns them back, so typing round-trips', () => {
    const definition = '{{char}}: Hi.\n{{random_user_2}}: Hey.\nMira says: not a slot';
    const text = definitionToText(definition, labels);
    assert.equal(text, 'Mira: Hi.\nSomeone: Hey.\nMira says: not a slot');
    assert.equal(textToDefinition(text, labels), '{{char}}: Hi.\n{{random_user_1}}: Hey.\nMira says: not a slot');
    assert.equal(definitionToText(textToDefinition(text, labels), labels), text);
  });

  it('copes with names that read as patterns', () => {
    const odd = { char: 'J.R. (Kid)', other: 'Someone' };
    assert.equal(textToDefinition('J.R. (Kid): yo', odd), '{{char}}: yo');
  });
});

describe('the mock provider', () => {
  it('writes a draft reply the real checker accepts', () => {
    const result = parseDraft(mockDraftReply({ idea: 'A quiet florist', sparks: ['calmUntilHurt'], language: 'English' }));
    assert.ok(result.ok);
    assert.ok(result.draft.definition.startsWith('{{random_user_1}}: '));
    // The chat's first card (D110): a story, a few loves and can't stand, a height in range.
    assert.ok(result.draft.backstory.length > 0);
    assert.equal(result.draft.likes.length, 4);
    assert.ok(result.draft.dislikes.length >= 2);
    assert.ok(result.draft.heightCm && result.draft.heightCm >= 140 && result.draft.heightCm <= 220);
  });

  it('drops a height out of range and caps the loves', () => {
    const result = parseDraft(JSON.stringify({ ...good, heightCm: 400, likes: ['a', 'b', 'c', 'd', 'e', 'a'] }));
    assert.ok(result.ok);
    assert.equal(result.draft.heightCm, undefined);
    assert.deepEqual(result.draft.likes, ['a', 'b', 'c', 'd']);
  });

  it('writes every field again, a different take each time', () => {
    const fields: DraftField[] = ['tagline', 'bio', 'look', 'greeting', 'greetings', 'dialog', 'starters', 'backstory', 'likes', 'dislikes'];
    const context = { name: 'Mira', role: 'crush' as const, tags: ['teasing'], greeting: 'Hi.' };
    for (const field of fields) {
      const first = parseField(field, mockFieldReply(field, context, 1));
      const second = parseField(field, mockFieldReply(field, context, 2));
      assert.ok(first, field);
      assert.notDeepEqual(first, second, field);
    }
  });
});

describe('checkCreation with quick-create fields', () => {
  const base = { name: 'Mira', age: '27', bio: 'Keeps a lighthouse.', greeting: 'Hi.', photoRights: false, voice: { kind: 'preset', preset: 'warm' } as const, voiceConsent: false };
  it('lets their looks stand in for a photo', () => {
    assert.deepEqual(checkCreation({ ...base, hasPhoto: false }), ['photo']);
    assert.deepEqual(checkCreation({ ...base, hasPhoto: false, look: 'Auburn hair.' }), []);
    assert.deepEqual(checkCreation({ ...base, hasPhoto: true, look: 'Auburn hair.' }), ['photoRights']);
  });

  it('checks the other texts too', () => {
    assert.deepEqual(checkCreation({ ...base, hasPhoto: false, look: 'x', more: ['a high school senior'] }), ['minors']);
  });
});
