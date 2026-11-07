import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TurnPlan } from '@/lib/reply-engine';
import type { Character, User } from '@/types';

import { chatParts } from './chat-prompt';
import { joinParts } from './prompt-layout';
import { enforceStyle, parseModelReply, REPLY_SHAPE, replyStyleLines, splitBubbles } from './reply-style';
import { buildCharacterPrompt, buildGroupPrompt } from './rules';
import { CRISIS_CUE } from './safety';

const character: Character = {
  id: 'c_kai',
  name: 'Kai',
  handle: '@rafti',
  bio: 'Swim team captain.',
  category: 'school',
  accentIndex: 0,
  voiceReady: true,
  isOfficial: true,
  greeting: 'Hey.',
  tags: ['cheerful'],
};
const user = { id: 'u', displayName: 'Sam', locale: 'en' } as User;

describe('reply style in the prompt', () => {
  it('goes in the one-to-one persona prompt only when the chat passes it', () => {
    const chat = buildCharacterPrompt(character, user, undefined, 'English', undefined, undefined, undefined, { style: 'story', length: 'long' });
    assert.match(chat, /REPLY STYLE:\n- Story: /);
    assert.match(chat, /- Length: Long/);
    assert.doesNotMatch(buildCharacterPrompt(character, user), /REPLY STYLE:/);
    assert.doesNotMatch(buildGroupPrompt(character, [], user), /REPLY STYLE:/);
  });

  it('puts the settings before the scene and lore, which change more often', () => {
    const lines = replyStyleLines({ style: 'talk', length: 'auto' });
    assert.equal(lines[0], 'REPLY STYLE:');
    assert.match(lines[1], /no asterisks/);
  });
});

describe('the model’s reply', () => {
  it('reads the JSON bubbles and the feeling it settled on', () => {
    const reply = parseModelReply('Sure! {"emotion":"shy","intensity":1.4,"messages":["*looks away* Hi.", " ", "You came."]}');
    assert.deepEqual(reply.bubbles, ['*looks away* Hi.', 'You came.']);
    assert.equal(reply.emotion, 'shy');
    assert.equal(reply.intensity, 1);
  });

  it('takes prose when there is no JSON, and drops an unknown feeling', () => {
    assert.deepEqual(parseModelReply('Hey.\n\nYou there?').bubbles, ['Hey.', 'You there?']);
    assert.equal(parseModelReply('{"emotion":"furious","messages":["Hm."]}').emotion, undefined);
  });

  it('holds Talk to no narration', () => {
    assert.deepEqual(enforceStyle(['*grins* Hey.', '*waves*'], 'talk'), ['Hey.']);
    assert.deepEqual(enforceStyle(['*grins* Hey.'], 'mix'), ['*grins* Hey.']);
  });

  it('reads the crisis mark only when it is a real true', () => {
    assert.equal(parseModelReply('{"crisis":true,"messages":["I am here."]}').crisis, true);
    assert.equal('crisis' in parseModelReply('{"crisis":"yes","messages":["Hm."]}'), false);
    assert.equal('crisis' in parseModelReply('{"crisis":false,"messages":["Hm."]}'), false);
    assert.match(REPLY_SHAPE, /"crisis":false[\s\S]*never for a joke/);
  });
});

describe('the crisis cue in the chat prompt', () => {
  const plan = { style: 'mix', moves: ['tease'], mood: { emotion: 'playful', intensity: 0.6 }, words: 20, bubbles: 1, ask: true } as unknown as TurnPlan;
  const input = { character, user, messages: [], plan };

  it('goes last before the shape and takes the turn plan’s place', () => {
    const parts = chatParts({ ...input, crisis: true });
    const names = parts.filter((p) => p.tier === 'turn' && p.text).map((p) => p.name);
    assert.deepEqual(names.slice(-2), ['crisis', 'shape']);
    assert.ok(!names.includes('hints'));
    assert.ok(joinParts(parts).includes(CRISIS_CUE.join('\n')));
    assert.ok(chatParts(input).some((p) => p.name === 'hints' && p.text.includes('THIS TURN')));
    // The stand-in planner's dice no longer reach the model (0z141).
    assert.ok(!joinParts(chatParts(input)).includes('tease them'));
    assert.ok(!joinParts(chatParts(input)).includes('SAFETY NOW'));
  });
});

describe('texting splits a paragraph into bubbles (owner, 2026-11-07)', () => {
  const long =
    'Bak, babamın o dokuz yaşındaki resmimi bitirdiğini söylemiştim ya... O günden beri herkes yetenekli olduğumu söylüyor. Sadece bu yalanı bir şekilde gerçek kılmaya çalışıyorum. Eğer bana nazik davranıp saçma sapan şeyler söylersen, seninle bir daha asla konuşmam. Anlaştık mı?';

  it('cuts at sentence ends into short bubbles, keeps short ones and story prose whole', () => {
    const out = splitBubbles([long]);
    assert.ok(out.length >= 2 && out.length <= 4, String(out.length));
    assert.ok(out.every((b) => b.length <= 160), JSON.stringify(out));
    assert.equal(out.join(' '), long.replace(/\s+/g, ' '));
    assert.deepEqual(splitBubbles(['Short one.', 'Another.']), ['Short one.', 'Another.']);
    assert.deepEqual(enforceStyle([long], 'story'), [long]);
    assert.ok(enforceStyle([long], 'mix').length > 1);
  });

  it('splits in any script and never past four bubbles', () => {
    const zh = '今天画室的光线很糟糕。我一直盯着那幅画看了好几个小时。老师说我有天赋，可我自己一点也不相信。你呢，今天过得怎么样？我真的想知道。'.repeat(2);
    assert.ok(splitBubbles([zh]).length > 1);
    assert.ok(splitBubbles([long, long, long]).length <= 4);
  });

  it('keeps an *action* whole with what follows it', () => {
    const acted = `*puts the brush down and wipes her hands on the old apron. She looks at you for a long moment.* ${'Fine. '.repeat(25)}`;
    assert.ok(!splitBubbles([acted]).some((b) => (b.match(/\*/g)?.length ?? 0) % 2 === 1));
  });
});
