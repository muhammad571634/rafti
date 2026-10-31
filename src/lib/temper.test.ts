import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { askAnswer, askLine, temperComeback } from '../mock/temper';
import { characters } from '../mock/characters';
import { REACH_ASK, askedOnce, shouldAskToReach, sittingCount } from './reach-ask';
import { TEMPERS, temperLines, temperOf } from './temper';
import type { Message } from '@/types';

const byId = (id: string) => characters.find((c) => c.id === id)!;

describe('temper', () => {
  it('comes from the persona: a distinct tag first, then a leaning one', () => {
    assert.equal(temperOf(byId('c_hana')), 'sulky');
    assert.equal(temperOf(byId('c_minu')), 'clingy');
    assert.equal(temperOf(byId('c_iris')), 'shy');
    assert.equal(temperOf(byId('c_theo')), 'teasing');
    assert.equal(temperOf(byId('c_kai')), 'warm');
    assert.equal(temperOf({ tags: [] }), 'warm');
  });

  it('gives the cast all five', () => {
    const seen = new Set(characters.map((c) => temperOf(c)));
    for (const temper of TEMPERS) assert.ok(seen.has(temper), temper);
  });

  it('follows a family role, then a temper the creator picked', () => {
    assert.equal(temperOf(byId('c_hana'), 'Mom'), 'warm');
    assert.equal(temperOf(byId('c_iris'), 'Big brother'), 'teasing');
    assert.equal(temperOf(byId('c_iris'), 'Grandpa'), 'warm');
    assert.equal(temperOf({ tags: ['shy'], temper: 'clingy' }), 'clingy');
  });

  it('tells the model how to text and the line never to cross', () => {
    const lines = temperLines('sulky').join('\n');
    assert.match(lines, /sulky/);
    assert.match(lines, /Never guilt them/);
  });

  it('writes the ask, its answer and the first comeback days in their voice', () => {
    for (const temper of TEMPERS) {
      assert.match(askLine(temper, false, 's'), /text|message|wr(i|o)te/i);
      assert.notEqual(askLine(temper, true, 's'), askLine(temper, false, 's'));
      assert.ok(askAnswer(temper, true, 's') && askAnswer(temper, false, 's'));
      assert.ok(temperComeback(temper, 1, 'my exam', 's'));
      assert.ok(temperComeback(temper, 2, '', 's'));
      assert.equal(temperComeback(temper, 5, '', 's'), null);
    }
  });
});

const at = (min: number) => new Date(Date.UTC(2026, 9, 26, 10, 0) + min * 60_000).toISOString();
const chat = (mine: number, gapAfter = -1): Message[] => {
  const out: Message[] = [];
  let min = 0;
  for (let i = 0; i < mine; i++) {
    min += i === gapAfter ? 120 : 1;
    out.push({ id: `me${i}`, conversationId: 'c', author: 'me', kind: 'text', text: 'hi', createdAt: at(min) });
    min += 1;
    out.push({ id: `them${i}`, conversationId: 'c', author: 'them', kind: 'text', text: 'hey', createdAt: at(min) });
  }
  return out;
};
const now = Date.UTC(2026, 9, 26, 12, 0);

describe('may I text you?', () => {
  it('waits until the user is enjoying the chat', () => {
    const bond = { messagesFirst: false };
    assert.equal(shouldAskToReach({ bond, messages: chat(REACH_ASK.minTotal - 1), now }), false);
    assert.equal(shouldAskToReach({ bond, messages: chat(REACH_ASK.minTotal), now }), true);
    // Eight in all but only three in this sitting.
    assert.equal(sittingCount(chat(8, 5)), 3);
    assert.equal(shouldAskToReach({ bond, messages: chat(8, 5), now }), false);
  });

  it('never asks one who may write already, in a scene, after a crisis or over waiting ideas', () => {
    const messages = chat(10);
    assert.equal(shouldAskToReach({ bond: { messagesFirst: true }, messages, now }), false);
    assert.equal(shouldAskToReach({ bond: { messagesFirst: false }, messages, now, inScene: true }), false);
    const crisis = [...messages, { id: 'h', conversationId: 'c', author: 'them', kind: 'system', card: 'helpline', createdAt: at(30) } as Message];
    assert.equal(shouldAskToReach({ bond: { messagesFirst: false }, messages: crisis, now }), false);
    const waiting = [...messages.slice(0, -1), { ...messages.at(-1)!, ideas: [{ label: 'Yes', text: 'Yes' }] }];
    assert.equal(shouldAskToReach({ bond: { messagesFirst: false }, messages: waiting, now }), false);
  });

  it('asks again after a "Not now" only later and with more messages, three times at most', () => {
    const messages = chat(12);
    const asked = { asks: 1, lastAt: new Date(now - 86_400_000).toISOString(), answer: 'no' as const };
    assert.equal(shouldAskToReach({ bond: { messagesFirst: false, reachAsk: asked }, messages, now }), false);
    const later = now + REACH_ASK.retryAfterMs;
    const fresh = chat(12).map((m) => ({ ...m, createdAt: new Date(Date.parse(m.createdAt) + REACH_ASK.retryAfterMs).toISOString() }));
    assert.equal(shouldAskToReach({ bond: { messagesFirst: false, reachAsk: asked }, messages: [...messages, ...fresh], now: later }), true);
    const done = { asks: REACH_ASK.maxAsks, lastAt: asked.lastAt, answer: 'no' as const };
    assert.equal(shouldAskToReach({ bond: { messagesFirst: false, reachAsk: done }, messages: [...messages, ...fresh], now: later }), false);
    assert.equal(shouldAskToReach({ bond: { messagesFirst: false, reachAsk: { asks: 1, answer: 'yes' } }, messages, now }), false);
  });

  it('counts each ask', () => {
    const first = askedOnce(undefined, new Date(now));
    assert.deepEqual(first, { asks: 1, lastAt: new Date(now).toISOString(), answer: undefined });
    assert.equal(askedOnce({ ...first, answer: 'no' }, new Date(now)).asks, 2);
  });
});
