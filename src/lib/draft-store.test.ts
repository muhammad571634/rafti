import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { draftStore, type DraftStorage } from './draft-store';

function memory(start: string | null = null) {
  const saved = { value: start, writes: 0 };
  const storage: DraftStorage = {
    getItem: async () => saved.value,
    setItem: async (_key, value) => {
      saved.value = value;
      saved.writes += 1;
    },
  };
  return { saved, storage };
}

describe('draftStore', () => {
  it('keeps a draft per chat, across a restart', async () => {
    const { saved, storage } = memory();
    const first = draftStore(storage);
    first.save('a', 'half a line');
    first.save('b', 'another');
    assert.equal(await first.read('a'), 'half a line');
    const second = draftStore({ ...storage, getItem: async () => saved.value });
    assert.equal(await second.read('b'), 'another');
    assert.equal(await second.read('none'), '');
  });

  it('keeps the text as typed, line breaks and all', async () => {
    const { storage } = memory();
    const drafts = draftStore(storage);
    drafts.save('a', 'one\ntwo ');
    assert.equal(await drafts.read('a'), 'one\ntwo ');
  });

  it('removes the draft when the field empties or holds only spaces', async () => {
    const { storage } = memory(JSON.stringify({ a: 'x', b: 'y' }));
    const drafts = draftStore(storage);
    drafts.save('a', '');
    drafts.save('b', '  \n ');
    assert.equal(await drafts.read('a'), '');
    assert.equal(await drafts.read('b'), '');
  });

  it('does not lose a save made during the first read', async () => {
    let finish: (value: string) => void = () => {};
    const { saved, storage } = memory();
    const drafts = draftStore({ ...storage, getItem: () => new Promise((done) => (finish = done)) });
    const reading = drafts.read('old');
    drafts.save('new', 'typed early');
    finish(JSON.stringify({ old: 'from before' }));
    assert.equal(await reading, 'from before');
    assert.equal(await drafts.read('new'), 'typed early');
    assert.deepEqual(JSON.parse(saved.value ?? ''), { old: 'from before', new: 'typed early' });
  });

  it('clears one chat, then everything', async () => {
    const { saved, storage } = memory(JSON.stringify({ a: 'x', b: 'y' }));
    const drafts = draftStore(storage);
    drafts.clear('a');
    assert.equal(await drafts.read('a'), '');
    assert.equal(await drafts.read('b'), 'y');
    drafts.clearAll();
    assert.equal(await drafts.read('b'), '');
    assert.equal(saved.value, '{}');
  });

  it('a deleted chat stays empty when its closing screen saves again', async () => {
    const { storage } = memory(JSON.stringify({ a: 'x' }));
    const drafts = draftStore(storage);
    drafts.forget('a');
    drafts.save('a', 'x');
    assert.equal(await drafts.read('a'), '');
  });

  it('writes nothing when nothing changed', async () => {
    const { saved, storage } = memory(JSON.stringify({ a: 'x' }));
    const drafts = draftStore(storage);
    drafts.save('a', 'x');
    drafts.save('none', '');
    drafts.clear('none');
    await drafts.read('a');
    assert.equal(saved.writes, 0);
  });

  it('starts empty from a broken save, or when storage fails', async () => {
    for (const raw of ['not json', '[1]', 'null']) {
      assert.equal(await draftStore(memory(raw).storage).read('a'), '');
    }
    const failing = draftStore({ getItem: async () => Promise.reject(new Error('no')), setItem: async () => Promise.reject(new Error('no')) });
    failing.save('a', 'still fine');
    assert.equal(await failing.read('a'), 'still fine');
  });
});
