import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Wallet } from '@/types';

import { creditFree } from './shells';

const TODAY = '2026-10-13';

describe('creditFree: every free source lands in today\'s bucket', () => {
  it('starts today\'s bucket and adds to the balance', () => {
    const wallet: Wallet = { shells: 300, film: 0 };
    assert.deepEqual(creditFree(wallet, 30, TODAY), { shells: 330, film: 0, free: { day: TODAY, amount: 30 } });
  });

  it('adds check-in, wheel and ad credits of the same day together', () => {
    let wallet: Wallet = { shells: 0, film: 0 };
    for (const amount of [100, 30, 20, 6]) wallet = creditFree(wallet, amount, TODAY);
    assert.deepEqual(wallet.free, { day: TODAY, amount: 156 });
    assert.equal(wallet.shells, 156);
  });

  it('never counts bought shells or yesterday\'s bucket as today\'s free shells', () => {
    const wallet: Wallet = { shells: 500, film: 0, free: { day: '2026-10-12', amount: 40 } };
    const next = creditFree(wallet, 10, TODAY);
    assert.deepEqual(next.free, { day: TODAY, amount: 10 });
    assert.equal(next.shells, 510);
  });
});
