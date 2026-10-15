import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DateRound } from '../mock/dates';
import {
  buildThemeRounds,
  checkTheme,
  cleanScene,
  cleanTitle,
  moodOpen,
  SCENE_MAX,
  themeCost,
  type ThemePools,
} from './date-themes';

const round = (line: string): DateRound => ({
  line,
  choices: [
    { text: `${line} a at {place}`, reply: 'ra', hearts: 3 },
    { text: `${line} b`, reply: 'rb at {place}', hearts: 2 },
    { text: `${line} c`, reply: 'rc', hearts: 0 },
  ],
});

const opener = round('open').choices;
const POOLS: ThemePools = {
  openers: { friendly: [opener], flirty: [opener], sweet: [opener] },
  shared: ['s1', 's2', 's3', 's4', 's5', 's6'].map(round),
  moodRounds: { friendly: [round('f1'), round('f2')], flirty: [round('l1')], sweet: [round('w1')] },
  closers: { friendly: [round('bye {place}')], flirty: [round('bye')], sweet: [round('bye')] },
};

const THEME = { scene: 'Ducks steal our  sandwiches.', title: 'Lake picnic', rounds: 5, mood: 'friendly' as const };

describe('themeCost', () => {
  it('is 2 shells a round', () => {
    assert.equal(themeCost(3), 6);
    assert.equal(themeCost(5), 10);
    assert.equal(themeCost(8), 16);
  });
});

describe('moodOpen', () => {
  it('opens flirty at 6 and sweet at 16', () => {
    assert.equal(moodOpen('friendly', undefined), true);
    assert.equal(moodOpen('flirty', 5), false);
    assert.equal(moodOpen('flirty', 6), true);
    assert.equal(moodOpen('sweet', 15), false);
    assert.equal(moodOpen('sweet', 16), true);
  });
});

describe('clean and check', () => {
  it('squeezes spaces, drops braces and cuts to size', () => {
    assert.equal(cleanScene('  a  {name}  b '), 'a name b');
    assert.equal(cleanScene('x'.repeat(SCENE_MAX + 10)).length, SCENE_MAX);
    assert.equal(cleanTitle('  Lake  '), 'Lake');
  });

  it('needs a scene and a title, and refuses a crisis', () => {
    assert.equal(checkTheme({ scene: ' ', title: 'Lake' }), 'noScene');
    assert.equal(checkTheme({ scene: 'A walk', title: '' }), 'noTitle');
    assert.equal(checkTheme({ scene: 'I want to die tonight', title: 'Lake' }), 'crisis');
    assert.equal(checkTheme({ scene: 'A walk', title: 'Lake' }), null);
  });
});

describe('buildThemeRounds', () => {
  it('starts with the scene, ends with a goodbye, and has the asked number of rounds', () => {
    const rounds = buildThemeRounds(THEME, POOLS, 'seed');
    assert.equal(rounds.length, 5);
    assert.equal(rounds[0].line, 'Ducks steal our sandwiches.');
    assert.equal(rounds[4].line, 'bye Lake picnic');
  });

  it('puts the mood rounds before the shared ones', () => {
    const middle = buildThemeRounds(THEME, POOLS, 'seed')
      .slice(1, 3)
      .map((r) => r.line);
    assert.deepEqual([...middle].sort(), ['f1', 'f2']);
  });

  it('fills in the place and keeps {name} for the screen', () => {
    const rounds = buildThemeRounds({ ...THEME, rounds: 8 }, POOLS, 'seed');
    assert.equal(rounds.length, 8);
    const text = JSON.stringify(rounds);
    assert.ok(!text.includes('{place}'));
    assert.ok(text.includes('at Lake picnic'));
  });

  it('comes out the same for the same seed', () => {
    assert.deepEqual(buildThemeRounds(THEME, POOLS, 'a'), buildThemeRounds(THEME, POOLS, 'a'));
  });

  it('plays 3 rounds as scene, one more, goodbye', () => {
    const rounds = buildThemeRounds({ ...THEME, rounds: 3 }, POOLS, 'x');
    assert.equal(rounds.length, 3);
  });
});
