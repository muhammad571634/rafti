import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canAddMember,
  canRemoveMember,
  groupPreview,
  groupTitle,
  leastRecent,
  namedMembers,
  pickResponders,
  withoutMember,
} from './group-chat';

const NAMES = { c_kai: 'Kai', c_theo: 'Theo', c_hana: 'Hana' };
const MEMBERS = ['c_kai', 'c_theo', 'c_hana'];

describe('groupTitle', () => {
  it('joins two or three names', () => {
    assert.equal(groupTitle(['Kai', 'Theo']), 'Kai & Theo');
    assert.equal(groupTitle(['Kai', 'Theo', 'Hana']), 'Kai, Theo & Hana');
  });

  it('handles one or none', () => {
    assert.equal(groupTitle(['Kai']), 'Kai');
    assert.equal(groupTitle([]), '');
  });
});

describe('namedMembers', () => {
  it('finds names in the order they appear, any case', () => {
    assert.deepEqual(namedMembers('hana, can you ask KAI?', NAMES), ['c_hana', 'c_kai']);
  });

  it('needs a whole word', () => {
    assert.deepEqual(namedMembers('kaiju movie tonight', NAMES), []);
    assert.deepEqual(namedMembers('Theodore says hi', NAMES), []);
    assert.deepEqual(namedMembers('Kai!', NAMES), ['c_kai']);
  });

  it('reads names with letters outside English', () => {
    assert.deepEqual(namedMembers('Привет, Сэм', { c_sam: 'Сэм' }), ['c_sam']);
  });
});

describe('leastRecent', () => {
  it('prefers a member who never spoke, in member order', () => {
    assert.equal(leastRecent(MEMBERS, ['c_kai']), 'c_theo');
  });

  it('otherwise the one whose last line is oldest', () => {
    assert.equal(leastRecent(MEMBERS, ['c_hana', 'c_kai', 'c_theo', 'c_kai']), 'c_hana');
  });
});

describe('pickResponders', () => {
  it('lets a named member answer first', () => {
    assert.deepEqual(pickResponders(MEMBERS, NAMES, 'Hana, help me', [], 0), ['c_hana']);
  });

  it('lets two named members both answer', () => {
    assert.deepEqual(pickResponders(MEMBERS, NAMES, 'Theo and Kai, who is right?', [], 0), ['c_theo', 'c_kai']);
  });

  it('takes turns when nobody is named', () => {
    const speakers = ['c_kai', 'c_theo'];
    assert.deepEqual(pickResponders(MEMBERS, NAMES, 'hi all', speakers, 0), ['c_hana']);
  });

  it('adds a second member on odd turns', () => {
    const speakers = ['c_kai', 'c_theo', 'c_hana'];
    assert.deepEqual(pickResponders(MEMBERS, NAMES, 'so?', speakers, 1), ['c_kai', 'c_theo']);
  });

  it('never repeats the first member as the second', () => {
    const result = pickResponders(MEMBERS, NAMES, 'Kai?', ['c_theo', 'c_hana'], 1);
    assert.equal(result[0], 'c_kai');
    assert.notEqual(result[1], 'c_kai');
    assert.equal(result.length, 2);
  });

  it('skips members without a name (gone from the cast)', () => {
    assert.deepEqual(pickResponders(['c_kai', 'c_gone'], { c_kai: 'Kai' }, 'hey', [], 1), ['c_kai']);
    assert.deepEqual(pickResponders(['c_gone'], {}, 'hey', [], 0), []);
  });
});

describe('members', () => {
  it('keeps a group at two or three', () => {
    assert.equal(canAddMember(['a', 'b']), true);
    assert.equal(canAddMember(['a', 'b', 'c']), false);
    assert.equal(canRemoveMember(['a', 'b', 'c']), true);
    assert.equal(canRemoveMember(['a', 'b']), false);
  });

  it('ends a group left with one member', () => {
    assert.deepEqual(withoutMember(['a', 'b', 'c'], 'b'), ['a', 'c']);
    assert.equal(withoutMember(['a', 'b'], 'a'), null);
    assert.deepEqual(withoutMember(['a', 'b', 'c'], 'x'), ['a', 'b', 'c']);
  });
});

describe('groupPreview', () => {
  it('puts the sender first', () => {
    assert.equal(groupPreview('Kai', 'On my way'), 'Kai: On my way');
    assert.equal(groupPreview(undefined, 'Photo'), 'Photo');
  });
});
