import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { expiryBooked, oneExpiryPerMidnight } from './shells';
import type { LedgerEntry } from '@/types';

const midnight = '2026-11-01T19:00:00.000Z';
const row = (id: string, amount: number, reason: LedgerEntry['reason'], at: string): LedgerEntry => ({ id, amount, reason, at });

describe('free shells expire once a midnight', () => {
  it('sees an expiry already booked for that midnight', () => {
    assert.equal(expiryBooked([row('a', -24, 'expired', midnight)], midnight), true);
  });

  it('does not mistake another midnight or another reason for it', () => {
    assert.equal(expiryBooked([row('a', -24, 'expired', '2026-10-31T19:00:00.000Z')], midnight), false);
    assert.equal(expiryBooked([row('a', -1, 'chat', midnight)], midnight), false);
  });

  it('keeps the newest of the rows a midnight was booked with, and everything else', () => {
    const older = row('old', -30, 'expired', '2026-10-31T19:00:00.000Z');
    const chat = row('c', -1, 'chat', midnight);
    const ledger = [row('n', -24, 'expired', midnight), chat, row('x', -24, 'expired', midnight), row('y', -25, 'expired', midnight), older];
    assert.deepEqual(oneExpiryPerMidnight(ledger).map((e) => e.id), ['n', 'c', 'old']);
  });

  it('hands back the same list when there is nothing to clean', () => {
    const ledger = [row('n', -24, 'expired', midnight), row('c', -1, 'chat', midnight)];
    assert.equal(oneExpiryPerMidnight(ledger), ledger);
  });
});
