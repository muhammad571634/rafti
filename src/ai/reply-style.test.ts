import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TurnPlan } from '@/lib/reply-engine';
import type { Character, User } from '@/types';

import { chatParts } from './chat-prompt';
import { joinParts } from './prompt-layout';
import { bubblesSpeech, cleanIdeas, enforceStyle, enforceStyleBubbles, parseModelReply, REPLY_SHAPE, replyShape, replyStyleLines, splitBubbles, STRUCTURED_NARRATION_SHAPE } from './reply-style';
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

  it('keeps the messages of JSON that broke after them, and never shows raw JSON', () => {
    // Seen on flash-lite (0z333): the list closed, then a stray array before the brace.
    const broken = '{"crisis":false,"emotion":"shy","messages":[{"action":"pulls the apron tighter"},{"speech":"just... I got used to seeing you."}],["not much else to tell."]}';
    const reply = parseModelReply(broken);
    assert.ok(reply.bubbles.length > 0);
    assert.ok(reply.bubbles.every((b) => !b.includes('{') && !b.includes('"speech"')), reply.bubbles.join(' | '));
    assert.equal(reply.emotion, 'shy');
    assert.deepEqual(parseModelReply('{"emotion":"shy","messages":["Hi", oops}').bubbles, []);
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

describe('one-tap replies written with the reply (0z176)', () => {
  it('keeps two short distinct strings and drops the rest', () => {
    assert.deepEqual(cleanIdeas(['  Charchadim  juda ', 'Kino qachon?', 'Kino qachon?', 7, '']), ['Charchadim juda', 'Kino qachon?']);
    assert.deepEqual(cleanIdeas(['x'.repeat(49), 'ok']), ['ok']);
    assert.deepEqual(cleanIdeas('nope'), []);
  });

  it('mends a list the model split in two, so a crisis flag is never lost to broken JSON (0z179)', () => {
    const reply = parseModelReply('{"language":"Spanish","crisis":true,"messages":["Sam, escúchame."],["¿Estás a salvo?"],"ideas":["Estoy en casa."]}');
    assert.equal(reply.crisis, true);
    assert.deepEqual(reply.bubbles, ['Sam, escúchame.', '¿Estás a salvo?']);
  });

  it('reads them off the reply, and leaves them out when there are none', () => {
    assert.deepEqual(parseModelReply('{"messages":["Kel, choy ichamiz."],"ideas":["Kelyapman!","Choy emas, kofe"]}').ideas, ['Kelyapman!', 'Choy emas, kofe']);
    assert.equal(parseModelReply('{"messages":["Hi"]}').ideas, undefined);
  });

  it('never asks for them: the user writes their own replies (owner, 2026-11-17)', () => {
    for (const mode of [undefined, 'chat', 'call'] as const) {
      const parts = chatParts({ character, user, messages: [], ...(mode ? { mode } : {}) });
      assert.equal(parts.some((p) => p.name === 'ideas' || /"ideas"/.test(p.text)), false);
    }
  });
});

describe('structured narration in the reply (0z290)', () => {
  it('asks for structured parts only on Mixed and Story chats, never Talk, Call or Bedtime', () => {
    assert.ok(replyShape('chat', 'story').includes(STRUCTURED_NARRATION_SHAPE));
    assert.ok(replyShape('chat', 'mix').includes(STRUCTURED_NARRATION_SHAPE));
    assert.equal(replyShape('chat', 'talk'), REPLY_SHAPE);
    assert.equal(replyShape('call', 'story'), REPLY_SHAPE);
    assert.equal(replyShape('bedtime', 'story'), REPLY_SHAPE);
  });

  it('parses structured part arrays, single objects and flattened part lists alongside plain strings', () => {
    const nested = parseModelReply(
      '{"emotion":"tender","messages":[[{"action":"*sets the glass down*"},{"speech":"Not closed for you."},{"action":"hands you a towel"},{"speech":"Still cold?"}],"Tea is on."]}',
    );
    assert.deepEqual(nested.bubbles, ['*sets the glass down* Not closed for you. *hands you a towel* Still cold?', 'Tea is on.']);
    assert.deepEqual(nested.parts, [
      [
        { kind: 'action', text: 'sets the glass down' },
        { kind: 'speech', text: 'Not closed for you.' },
        { kind: 'action', text: 'hands you a towel' },
        { kind: 'speech', text: 'Still cold?' },
      ],
      [{ kind: 'speech', text: 'Tea is on.' }],
    ]);

    // Light model drops the outer bracket on a single narrated bubble.
    const flat = parseModelReply('{"messages":[{"action":"laughs softly"},{"speech":"Come in."}]}');
    assert.deepEqual(flat.bubbles, ['*laughs softly* Come in.']);
    assert.deepEqual(flat.parts, [
      [
        { kind: 'action', text: 'laughs softly' },
        { kind: 'speech', text: 'Come in.' },
      ],
    ]);

    // Single object with both action and speech keys.
    const single = parseModelReply('{"messages":[{"action":"smiles","speech":"Hey there."}]}');
    assert.deepEqual(single.bubbles, ['*smiles* Hey there.']);
    assert.deepEqual(single.parts, [
      [
        { kind: 'action', text: 'smiles' },
        { kind: 'speech', text: 'Hey there.' },
      ],
    ]);
  });

  it('strips structured actions on Talk, keeps Story whole, and splits long Mixed bubbles without losing parts', () => {
    const parts = [
      [
        { kind: 'action' as const, text: '(sets the glass down and smiles)' },
        { kind: 'speech' as const, text: 'Not closed for you. Come in right now before you catch a cold. I just put the kettle on for tea. Sit by the heater while I grab a dry towel for you.' },
      ],
    ];
    const bubbles = ['*(sets the glass down and smiles)* Not closed for you. Come in right now before you catch a cold. I just put the kettle on for tea. Sit by the heater while I grab a dry towel for you.'];

    const talk = enforceStyleBubbles(bubbles, parts, 'talk');
    assert.ok(talk.every((b) => !b.parts && !b.text.includes('glass')));
    assert.ok(bubblesSpeech(talk).startsWith('Not closed for you.'));

    const story = enforceStyleBubbles(bubbles, parts, 'story');
    assert.equal(story.length, 1);
    assert.equal(story[0].parts?.[0].kind, 'action');
    assert.equal(bubblesSpeech(story).includes('glass'), false);

    const mix = enforceStyleBubbles(bubbles, parts, 'mix');
    assert.ok(mix.length >= 2);
    assert.equal(mix[0].parts?.[0].kind, 'action');
    assert.equal(mix[0].parts?.[1].kind, 'speech');
    assert.equal(bubblesSpeech(mix).includes('glass'), false);
  });
});
