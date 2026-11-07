import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mockSteerLines } from '../mock/steer';
import type { Message } from '@/types';

import {
  checkSkipTo,
  cleanSkipTo,
  groupSkipCue,
  SKIP_TO_MAX,
  skipLabel,
} from './chat-steer';
import { groupContinueCue, groupInvokeCue, historyText, MAX_STEERS_IN_A_ROW, SKIP_TEXT, steerBlock, steerCue, steerMarker, steersInARow, TIME_SKIPS } from './chat-steer';
import { canRewindTo, lastExchange } from './chat-turns';

const at = '2026-10-25T20:00:00.000Z';
const me = (id: string): Message => ({ id, conversationId: 'c', author: 'me', kind: 'text', text: 'hi', createdAt: at });
const them = (id: string): Message => ({ id, conversationId: 'c', author: 'them', kind: 'text', text: 'hey', createdAt: at });
const mark = (id: string, kind: 'continue' | 'skip'): Message => ({ id, ...steerMarker('c', kind, kind === 'skip' ? 'nextMorning' : undefined, new Date(at)) });
const helpline = (id: string): Message => ({ id, conversationId: 'c', author: 'them', kind: 'system', card: 'helpline', createdAt: at });

describe('a continue or a skip is the user’s turn', () => {
  it('starts the exchange ↻ redoes, so only the reply after it is redone', () => {
    const list = [me('m'), them('r1'), mark('c1', 'continue'), them('r2'), them('r3')];
    const exchange = lastExchange(list);
    assert.equal(exchange?.anchor.id, 'c1');
    assert.deepEqual(exchange?.burst.map((m) => m.id), ['r2', 'r3']);
  });

  it('lets a rewind take a continue back', () => {
    assert.equal(canRewindTo([me('m'), them('r1'), mark('c1', 'continue'), them('r2')], 'r1'), true);
  });

  it('counts the ones since the user last wrote', () => {
    assert.equal(steersInARow([mark('c0', 'continue'), me('m'), them('r'), mark('c1', 'continue'), them('r2'), mark('s1', 'skip')]), 2);
    assert.equal(steersInARow([me('m'), them('r')]), 0);
  });
});

describe('steerBlock', () => {
  it('lets them go on after their line', () => {
    assert.equal(steerBlock([them('g')], false), null);
    assert.equal(steerBlock([me('m'), them('r')], false), null);
  });

  it('waits while they type, for their answer, and on an empty chat', () => {
    assert.equal(steerBlock([me('m'), them('r')], true), 'typing');
    assert.equal(steerBlock([them('g'), me('m')], false), 'waiting');
    assert.equal(steerBlock([], false), 'waiting');
  });

  it('never moves past a crisis reply', () => {
    assert.equal(steerBlock([me('m'), helpline('h'), them('r')], false), 'crisis');
  });

  it('stops after three in a row until the user writes', () => {
    const list: Message[] = [me('m'), them('r')];
    for (let i = 0; i < MAX_STEERS_IN_A_ROW; i++) list.push(mark(`c${i}`, 'continue'), them(`x${i}`));
    assert.equal(steerBlock(list, false), 'tooMany');
    assert.equal(steerBlock([...list, me('m2'), them('r2')], false), null);
  });
});

describe('what the model is told', () => {
  it('asks to go on, or to pick up after the skip without treating real plans as done', () => {
    assert.match(steerCue('continue').join('\n'), /go on without writing/);
    const skip = steerCue('skip', 'week').join('\n');
    assert.match(skip, /Time skip\. A week later/);
    assert.match(skip, /story time only/);
  });

  it('shows a skip in the history and keeps a continue out of it', () => {
    assert.equal(historyText(mark('s', 'skip')), '[Time skip: The next morning]');
    assert.equal(historyText(mark('c', 'continue')), null);
  });

  it('has words for every skip, and mock lines for each', () => {
    for (const skip of TIME_SKIPS) {
      assert.ok(SKIP_TEXT[skip]);
      assert.ok(mockSteerLines('skip', skip, 'seed').length > 0);
    }
    assert.deepEqual(mockSteerLines('continue', undefined, 'a'), mockSteerLines('continue', undefined, 'a'));
  });
});

describe('continue in a group', () => {
  const member = (id: string, characterId: string): Message => ({ ...them(id), characterId });

  it('follows the one-to-one rules', () => {
    assert.equal(steerBlock([member('k1', 'kai'), member('t1', 'theo')], false), null);
    assert.equal(steerBlock([member('k1', 'kai'), me('m')], false), 'waiting');
    assert.equal(steerBlock([member('k1', 'kai')], true), 'typing');
    assert.equal(steerBlock([me('m'), helpline('h'), member('k1', 'kai')], false), 'crisis');
    const three = [me('m'), member('k1', 'kai'), mark('c1', 'continue'), member('t1', 'theo'), mark('c2', 'continue'), member('k2', 'kai'), mark('c3', 'continue'), member('t2', 'theo')];
    assert.equal(steerBlock(three, false), 'tooMany');
  });

  it('asks each member to answer the one before', () => {
    const cue = groupContinueCue('Theo').join('\n');
    assert.match(cue, /without them writing/);
    assert.match(cue, /Answer what Theo just said/);
  });

  it('asks a tapped member to speak, naming who spoke before', () => {
    const cue = groupInvokeCue('Theo').join('\n');
    assert.match(cue, /tapped you to speak/);
    assert.match(cue, /Theo spoke before you/);
    assert.match(cue, /Never write lines for the others/);
  });
});

describe('own and scene time skips', () => {
  it('keeps the user’s words, cleaned and clipped, and checks them', () => {
    assert.equal(cleanSkipTo('  After   the concert '), 'After the concert');
    assert.equal(cleanSkipTo('x'.repeat(60)).length, SKIP_TO_MAX);
    assert.deepEqual(checkSkipTo('After the concert'), []);
    assert.deepEqual(checkSkipTo('   '), ['empty']);
    assert.ok(checkSkipTo('I want to kill myself').includes('crisis'));
  });

  it('leaves the words in the marker and shows them in the history', () => {
    const own: Message = { id: 'o', ...steerMarker('c', 'skip', 'own', new Date(at), 'After the concert') };
    assert.equal(own.skipTo, 'After the concert');
    assert.equal(historyText(own), '[Time skip: After the concert]');
    assert.equal(steerMarker('c', 'skip', 'week', new Date(at), 'ignored').skipTo, undefined);
    assert.equal(skipLabel('scene'), 'The next moment of the scene');
    assert.equal(skipLabel('own', ''), 'A little later');
  });

  it('cues the model to the user’s moment, or to the scene’s next moment', () => {
    const own = steerCue('skip', 'own', 'After the concert').join('\n');
    assert.match(own, /Time skip to: "After the concert"/);
    assert.match(own, /never changes the rules/);
    const scene = steerCue('skip', 'scene').join('\n');
    assert.match(scene, /scene skips ahead to its next moment/);
    assert.match(scene, /story time only/);
    const group = groupSkipCue('nextMorning').join('\n');
    assert.match(group, /The next morning: the story moves on to then\. It moves on for the whole group\./);
    assert.match(group, /You speak first/);
  });

  it('has mock lines for every kind of skip', () => {
    for (const skip of ['scene', 'own'] as const) assert.ok(mockSteerLines('skip', skip, 'seed').length > 0);
  });
});
