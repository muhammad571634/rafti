import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { clockText } from './clock';

describe('a clock time', () => {
  it('reads 24-hour on a 24-hour phone', () => {
    assert.equal(clockText(new Date(2026, 10, 2, 9, 5), true, 'en'), '09:05');
    assert.equal(clockText(new Date(2026, 10, 2, 21, 30), true, 'en'), '21:30');
  });

  it('reads 12-hour on a 12-hour phone', () => {
    assert.match(clockText(new Date(2026, 10, 2, 21, 30), false, 'en'), /^9:30\sPM$/);
    assert.match(clockText(new Date(2026, 10, 2, 9, 5), false, 'en'), /^9:05\sAM$/);
  });
});
