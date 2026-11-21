import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ARC_LEVELS } from '../lib/world-story';
import { contentProblems } from '../lib/create-character';
import { characters } from './characters';
import { officialLorebooks } from './lorebooks';
import { officialScenes } from './scenes';
import { WORLDS } from './worlds';

const official = characters.filter((c) => c.isOfficial);
const CIRCLES = ['Friends', 'Partners', "It's complicated", 'Around you'];

describe('the official cast (Cast 2.0, docs/cast-2.md)', () => {
  it('is twelve people, each one once', () => {
    assert.equal(official.length, 12);
    assert.equal(new Set(official.map((c) => c.id)).size, 12);
    assert.equal(new Set(official.map((c) => c.handle)).size, 12);
    assert.equal(new Set(official.map((c) => c.name)).size, 12);
  });

  it('has seven men and five women, for her and for him', () => {
    assert.equal(official.filter((c) => c.gender === 'male').length, 7);
    assert.equal(official.filter((c) => c.gender === 'female').length, 5);
  });

  it('groups everyone in one of the four circles, and has no world behind them', () => {
    for (const c of official) assert.ok(CIRCLES.includes(c.series!), `${c.name}: ${c.series}`);
    for (const circle of CIRCLES) assert.ok(official.some((c) => c.series === circle), circle);
    assert.deepEqual(WORLDS, []);
    assert.deepEqual(officialLorebooks, []);
    assert.ok(officialScenes.every((s) => !s.series), 'no world entry scene');
  });

  it('is all adults living now, with a full profile', () => {
    for (const c of official) {
      assert.ok(c.age && c.age >= 21 && c.age <= 35, c.name);
      for (const field of [c.tagline, c.look, c.backstory, c.definition, c.quirk, c.opening] as const) assert.ok(field?.trim(), c.name);
      assert.ok(c.tagline!.length <= 50, `${c.name}: tagline ${c.tagline!.length}`);
      assert.ok(c.look!.length <= 300, `${c.name}: look ${c.look!.length}`);
      assert.ok(c.backstory!.length <= 400, `${c.name}: story ${c.backstory!.length}`);
      assert.ok(c.likes?.length && c.dislikes?.length && c.starters?.length && c.greetings?.length, c.name);
      assert.ok(c.starters!.length <= 3 && c.starters!.every((s) => s.length <= 100), c.name);
      assert.ok([c.greeting, ...c.greetings!].every((g) => g.length <= 200), c.name);
      assert.deepEqual(contentProblems(`${c.bio} ${c.greeting}`), [], c.name);
    }
  });

  it('knows who they are to the user before the first message', () => {
    for (const c of official) {
      for (const field of [c.relation, c.history, c.mask, c.exception] as const) assert.ok(field?.trim(), c.name);
      assert.ok(c.relation!.length <= 30, `${c.name}: relation ${c.relation}`);
      assert.match(c.relation!, /^Your /, c.name);
      assert.ok(c.archetype, c.name);
      assert.ok(c.temper, c.name);
    }
  });

  it('opens with a text that starts in the middle of something, never a hello', () => {
    for (const c of official) {
      for (const line of [c.greeting, ...c.greetings!]) {
        assert.doesNotMatch(line, /^(hi|hello|hey there|nice to meet)\b/i, `${c.name}: ${line}`);
        assert.doesNotMatch(line, /\*/, `${c.name}: a text has no narration`);
      }
    }
  });

  it('holds back a want that opens beat by beat with the bond', () => {
    for (const c of official) {
      assert.deepEqual(c.arc?.beats.map((b) => b.atLevel), [...ARC_LEVELS], c.name);
      assert.ok(c.arc?.secret.trim(), c.name);
      for (const b of c.arc!.beats) {
        assert.ok(b.title.trim() && b.title.length <= 34, `${c.name}: ${b.title}`);
        assert.ok(b.beat.trim() && b.beat.length <= 320, `${c.name}: ${b.beat.length}`);
      }
    }
  });

  it('never writes control, threats or guilt into a jealous or protective one', () => {
    for (const c of official) {
      const text = [c.bio, c.mask, c.exception, c.quirk, c.opening, ...(c.arc?.beats.map((b) => b.beat) ?? [])].join(' ');
      assert.doesNotMatch(text, /\b(forbid|threaten|you owe me|make you|won't let you|not allowed to)\b/i, c.name);
    }
  });
});
