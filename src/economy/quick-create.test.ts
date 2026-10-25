import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FREE_QUICK_CREATES_PER_DAY, quickCreatesLeft, spendQuickCreate } from './quick-create';

describe('quick create allowance', () => {
  it('gives the full allowance on a new day', () => {
    assert.equal(quickCreatesLeft(undefined, '2026-10-25'), FREE_QUICK_CREATES_PER_DAY);
    assert.equal(quickCreatesLeft({ day: '2026-10-24', used: 3 }, '2026-10-25'), FREE_QUICK_CREATES_PER_DAY);
  });

  it('counts down through the day and stops at zero', () => {
    let use = spendQuickCreate(undefined, '2026-10-25');
    assert.deepEqual(use, { day: '2026-10-25', used: 1 });
    use = spendQuickCreate(use!, '2026-10-25');
    use = spendQuickCreate(use!, '2026-10-25');
    assert.equal(quickCreatesLeft(use!, '2026-10-25'), 0);
    assert.equal(spendQuickCreate(use!, '2026-10-25'), null);
    // Yesterday's count does not carry over.
    assert.deepEqual(spendQuickCreate(use!, '2026-10-26'), { day: '2026-10-26', used: 1 });
  });
});
