import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { throttledJSONStorage } from './throttled-storage';

function memory() {
  const data = new Map<string, string>();
  const writes: string[] = [];
  return {
    data,
    writes,
    storage: {
      getItem: (name: string) => data.get(name) ?? null,
      setItem: (name: string, value: string) => {
        writes.push(value);
        data.set(name, value);
      },
      removeItem: (name: string) => {
        data.delete(name);
      },
    },
  };
}

/** Timers run by hand, so the test controls when the save fires. */
function manualTimers() {
  const due = new Map<number, () => void>();
  let id = 0;
  return {
    timers: {
      set: ((run: () => void) => {
        due.set(++id, run);
        return id;
      }) as unknown as typeof setTimeout,
      clear: ((handle: number) => {
        due.delete(handle);
      }) as unknown as typeof clearTimeout,
    },
    fire: () => {
      const runs = [...due.values()];
      due.clear();
      runs.forEach((run) => run());
    },
    pending: () => due.size,
  };
}

describe('throttledJSONStorage: the store is saved at most once per delay', () => {
  it('many changes in a row make one write, of the newest value', () => {
    const m = memory();
    const t = manualTimers();
    const s = throttledJSONStorage<{ n: number }>(m.storage, 600, t.timers);
    for (let n = 1; n <= 50; n++) s.setItem('k', { state: { n }, version: 1 });
    assert.equal(m.writes.length, 0);
    assert.equal(t.pending(), 1);
    t.fire();
    assert.equal(m.writes.length, 1);
    assert.deepEqual(JSON.parse(m.data.get('k')!), { state: { n: 50 }, version: 1 });
  });

  it('flush writes at once and leaves no timer behind', () => {
    const m = memory();
    const t = manualTimers();
    const s = throttledJSONStorage<{ n: number }>(m.storage, 600, t.timers);
    s.setItem('k', { state: { n: 1 }, version: 1 });
    s.flush();
    assert.equal(m.writes.length, 1);
    assert.equal(t.pending(), 0);
    s.flush();
    assert.equal(m.writes.length, 1);
  });

  it('a cleared store does not come back with the waiting write', () => {
    const m = memory();
    const t = manualTimers();
    const s = throttledJSONStorage<{ n: number }>(m.storage, 600, t.timers);
    s.setItem('k', { state: { n: 1 }, version: 1 });
    s.removeItem('k');
    t.fire();
    assert.equal(m.writes.length, 0);
    assert.equal(m.data.has('k'), false);
  });

  it('reads back what it wrote', async () => {
    const m = memory();
    const s = throttledJSONStorage<{ n: number }>(m.storage);
    assert.equal(await s.getItem('k'), null);
    s.setItem('k', { state: { n: 7 }, version: 3 });
    await s.flush();
    assert.deepEqual(await s.getItem('k'), { state: { n: 7 }, version: 3 });
  });
});
