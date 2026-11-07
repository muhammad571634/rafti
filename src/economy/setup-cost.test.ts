import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ALARM_SETUP_SHELLS, alarmSetupCost, PLAN_SETUP_SHELLS } from './setup-cost';

const alarm = { id: 'a1', characterId: 'c_hana', hour: 7, minute: 0, repeat: [] as number[] };

describe('setting things up with a friend is priced on what it makes them write', () => {
  it('a plan costs about its three texts, an alarm its wake-up talk', () => {
    assert.equal(PLAN_SETUP_SHELLS, 3);
    assert.equal(ALARM_SETUP_SHELLS, 2);
  });

  it('a new alarm with a friend costs; a melody-only one is free', () => {
    assert.equal(alarmSetupCost([], alarm), ALARM_SETUP_SHELLS);
    assert.equal(alarmSetupCost([], { ...alarm, characterId: undefined }), 0);
  });

  it('only a new time, days or friend costs again; a label or sound does not', () => {
    assert.equal(alarmSetupCost([alarm], alarm, 'a1'), 0);
    assert.equal(alarmSetupCost([alarm], { ...alarm, minute: 30 }, 'a1'), ALARM_SETUP_SHELLS);
    assert.equal(alarmSetupCost([alarm], { ...alarm, repeat: [1, 2, 3, 4, 5] }, 'a1'), ALARM_SETUP_SHELLS);
    assert.equal(alarmSetupCost([alarm], { ...alarm, characterId: 'c_kai' }, 'a1'), ALARM_SETUP_SHELLS);
  });
});
