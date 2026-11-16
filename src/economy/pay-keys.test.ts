import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { forgetPay, isPayReason, notePay, PAY_KEY_MS, payFor } from './pay-keys';

describe('pay keys (0z260)', () => {
  it('gives a chat its latest paid line while it is fresh, then nothing', () => {
    notePay('c1', 'pay_a', 'chat', 1000);
    notePay('c1', 'pay_b', 'voice', 2000);
    notePay('g1', 'pay_g', 'photo', 2000);
    assert.deepEqual(payFor('c1', 3000), { key: 'pay_b', reason: 'voice' });
    assert.deepEqual(payFor('g1', 3000), { key: 'pay_g', reason: 'photo' });
    assert.equal(payFor('c2', 3000), undefined);
    assert.deepEqual(payFor('c1', 2000 + PAY_KEY_MS), { key: 'pay_b', reason: 'voice' });
    assert.equal(payFor('c1', 2001 + PAY_KEY_MS), undefined);
    // Gone for good once stale.
    assert.equal(payFor('c1', 2000), undefined);
  });

  it('forgets one chat, or all of them', () => {
    notePay('c1', 'k1', 'chat', 0);
    notePay('c2', 'k2', 'chat', 0);
    forgetPay('c1');
    assert.equal(payFor('c1', 1), undefined);
    assert.ok(payFor('c2', 1));
    forgetPay();
    assert.equal(payFor('c2', 1), undefined);
  });

  it('pays only what the user sends under a key', () => {
    assert.deepEqual(['chat', 'voice', 'photo', 'date', 'note'].map(isPayReason), [true, true, true, false, false]);
  });
});
