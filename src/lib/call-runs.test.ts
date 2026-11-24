import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { callRuns } from './call-runs';

type Call = { id: string; characterId: string; missed: boolean; direction: 'incoming' | 'outgoing' };
const call = (id: string, characterId: string, kind: 'missed' | 'incoming' | 'outgoing'): Call => ({
  id,
  characterId,
  missed: kind === 'missed',
  direction: kind === 'outgoing' ? 'outgoing' : 'incoming',
});
const ids = (runs: Call[][]) => runs.map((r) => r.map((c) => c.id).join(','));

describe('callRuns', () => {
  it('merges back-to-back calls with one friend of one kind', () => {
    const runs = callRuns([call('1', 'milo', 'missed'), call('2', 'milo', 'missed'), call('3', 'milo', 'missed')]);
    assert.deepEqual(ids(runs), ['1,2,3']);
  });

  it('starts a new run on another kind or another friend, keeping the order', () => {
    const runs = callRuns([
      call('1', 'milo', 'missed'),
      call('2', 'milo', 'incoming'),
      call('3', 'milo', 'outgoing'),
      call('4', 'milo', 'outgoing'),
      call('5', 'yuna', 'outgoing'),
      call('6', 'milo', 'outgoing'),
    ]);
    assert.deepEqual(ids(runs), ['1', '2', '3,4', '5', '6']);
  });

  it('gives nothing for no calls', () => {
    assert.deepEqual(callRuns([]), []);
  });
});
