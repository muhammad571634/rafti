import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { coachGreeting } from './greeting-coach';

describe('greeting coach (0z295)', () => {
  it('shows nothing while the greeting is empty', () => {
    assert.equal(coachGreeting({ greeting: '   ' }), null);
  });

  it('asks for more first when it is a one-liner', () => {
    assert.deepEqual(coachGreeting({ greeting: 'Hi.' }), { score: 0, level: 'weak', tip: 'more' });
  });

  it('then for a scene, then for the user’s move, then for a detail', () => {
    const plain = 'You came after all. I already made tea for both of us, it is still warm on the table.';
    assert.equal(coachGreeting({ greeting: plain })?.tip, 'scene');
    assert.equal(coachGreeting({ greeting: `*looks up from the stove* ${plain}` })?.tip, 'move');
    assert.equal(coachGreeting({ greeting: `*looks up from the stove* ${plain} Sit?` })?.tip, 'detail');
  });

  it('counts the opening line as the scene', () => {
    const text = 'You came after all. I already made tea for both of us, it is still warm on the table. Sit?';
    assert.equal(coachGreeting({ greeting: text, opening: '*smiles*' })?.level, 'good');
  });

  it('rates a long scene that ends on the user’s move as great, in any script', () => {
    const en = '*leans on the doorframe, keys tapping the wood* Took you long enough. The whole street smells like rain and somebody’s bread, and I have been standing here like an idiot for ten minutes. So, coming in or not?';
    assert.deepEqual(coachGreeting({ greeting: en }), { score: 4, level: 'great', tip: null });
    const ja = '*ドアにもたれて鍵をくるくる回している* やっと来た。ずっと待ってたんだよ。雨の匂いと誰かが焼いたパンの匂いがして、なんだか落ち着かなくて、ここで十分も立ってたんだから。入る？';
    assert.equal(coachGreeting({ greeting: ja })?.tip, 'detail');
    assert.equal(coachGreeting({ greeting: 'هل ستأتي معي الليلة إلى المقهى القديم في آخر الشارع؟ أنا هناك منذ ساعة *تبتسم*؟' })?.tip, 'detail');
  });

  it('reads a question before closing quotes or an action as the end', () => {
    const text = '*waits* You came after all. I already made tea for both of us, it is still warm. Sit?” *pulls out a chair*';
    assert.notEqual(coachGreeting({ greeting: text })?.tip, 'move');
  });
});
