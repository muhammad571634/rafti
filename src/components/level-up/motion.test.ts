import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HEARTBEAT_GAP_SEC, heartbeatScale } from './motion';

describe('level-up heartbeatScale', () => {
  it('stays neutral before and after the double beat', () => {
    assert.equal(heartbeatScale(-0.1), 1);
    assert.equal(heartbeatScale(0), 1);
    assert.equal(heartbeatScale(0.75), 1);
    assert.equal(heartbeatScale(2), 1);
  });

  it('produces two distinct organic peaks (lub then stronger dub)', () => {
    const lubPeak = heartbeatScale(0.045);
    const valley = heartbeatScale(0.145);
    const dubPeak = heartbeatScale(HEARTBEAT_GAP_SEC + 0.05);

    assert.ok(lubPeak > 1.04, `expected lub peak > 1.04, got ${lubPeak}`);
    assert.ok(valley < lubPeak - 0.02, `expected clear dip between beats, got ${valley}`);
    assert.ok(dubPeak > lubPeak, `expected dub (${dubPeak}) stronger than lub (${lubPeak})`);
    assert.ok(dubPeak < 1.1, `expected subtle organic pulse < 1.1, got ${dubPeak}`);
  });
});
