import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { namesUser, posterWords, userNames } from './moment-poster';

const scene = { title: 'Midnight studio raid', setting: 'The beat is almost done and Milo needs one honest ear.', opening: 'sit. listen. don’t lie to me.' };

describe('posterWords', () => {
  it('shows the title and their line when the line does not name the user', () => {
    assert.deepEqual(posterWords(scene, ['Sam']), { title: scene.title, line: scene.opening });
  });

  it('shows where they are instead when the line names the user, and only the title when that does too', () => {
    const named = { ...scene, opening: 'Sam, sit. listen.' };
    assert.deepEqual(posterWords(named, ['Sam']), { title: scene.title, setting: scene.setting });
    assert.deepEqual(posterWords({ ...named, setting: 'You and Sam are in the studio.' }, ['Sam']), { title: scene.title });
  });

  it('drops even the title when it names the user', () => {
    assert.deepEqual(posterWords({ title: 'Sam’s birthday', setting: 'At Sam’s.', opening: 'happy birthday Sam' }, ['Sam']), { title: '' });
  });

  it('shows the setting when there is no line', () => {
    assert.deepEqual(posterWords({ ...scene, opening: undefined }, []), { title: scene.title, setting: scene.setting });
  });
});

describe('namesUser', () => {
  it('finds a name as a whole word, in any case and script', () => {
    assert.ok(namesUser('hey SAM, come here', ['Sam']));
    assert.ok(namesUser('Привет, Саша!', ['Саша']));
    assert.ok(namesUser('ねえ、ゆき', ['ゆき']));
  });

  it('does not match a name inside another word, or a one-letter name', () => {
    assert.ok(!namesUser('the same old samba', ['Sam']));
    assert.ok(!namesUser('a cat', ['A']));
    assert.ok(!namesUser(undefined, ['Sam']));
  });
});

describe('userNames', () => {
  it('takes the full name, its parts and the personas’ names, without repeats or one-letter parts', () => {
    assert.deepEqual(userNames('Sam J Okoro', ['Sam', 'Nova']), ['Sam J Okoro', 'Sam', 'Okoro', 'Nova']);
    assert.deepEqual(userNames(undefined), []);
  });
});
