import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cleanNext, FIRST_AFTER_LINES, GAP_LINES, GAP_MS, KIND_REST_MS, NEXT_KINDS, nextChoices, nextParts, type NextContext, type NextLine } from './next-moment.ts';
import { parseModelReply } from './reply-style.ts';

// 14:00 on the phone's clock: no bedtime by day.
const NOON = new Date(2026, 10, 19, 14, 0);
const ctx = (extra: Partial<NextContext> = {}): NextContext => ({ now: NOON, inScene: false, canCall: true, dateOpen: true, ...extra });
const at = (msAgo: number) => new Date(NOON.getTime() - msAgo).toISOString();
const mine = (n: number, msAgo = 60_000): NextLine[] => Array.from({ length: n }, () => ({ author: 'me', kind: 'text', createdAt: at(msAgo) }));
const theirs = (extra: Partial<NextLine> = {}): NextLine => ({ author: 'them', kind: 'text', createdAt: at(60_000), ...extra });

describe('nextChoices', () => {
  it('opens nothing in the first lines of a chat', () => {
    assert.deepEqual(nextChoices([...mine(FIRST_AFTER_LINES - 1), theirs()], ctx()), []);
  });

  it('opens what the user can do, once the chat has some depth', () => {
    const open = nextChoices([...mine(FIRST_AFTER_LINES), theirs()], ctx());
    assert.deepEqual(open, NEXT_KINDS.filter((k) => k !== 'bedtime'));
  });

  it('leaves out a call without minutes, a locked date, and bedtime by day', () => {
    const open = nextChoices(mine(10), ctx({ canCall: false, dateOpen: false }));
    assert.ok(!open.includes('call') && !open.includes('date') && !open.includes('bedtime'));
    const night = nextChoices(mine(10), ctx({ now: new Date(2026, 10, 19, 23, 30) }));
    assert.ok(night.includes('bedtime'));
    const lateNight = nextChoices(mine(10), ctx({ now: new Date(2026, 10, 20, 2, 0) }));
    assert.ok(lateNight.includes('bedtime'));
  });

  it('opens nothing in a scene or near a crisis card', () => {
    assert.deepEqual(nextChoices(mine(10), ctx({ inScene: true })), []);
    assert.deepEqual(nextChoices([...mine(10), { author: 'them', kind: 'system', card: 'helpline', createdAt: at(1000) }], ctx()), []);
  });

  it('waits both the time and the lines after the last one', () => {
    const offered = theirs({ next: 'quiz', createdAt: at(GAP_MS + 1000) });
    // Long ago, but too few lines since.
    assert.deepEqual(nextChoices([...mine(10), offered, ...mine(GAP_LINES - 1)], ctx()), []);
    // Enough lines, but too soon.
    assert.deepEqual(nextChoices([...mine(10), { ...offered, createdAt: at(GAP_MS - 1000) }, ...mine(GAP_LINES)], ctx()), []);
    // Both: open again, without the kind just offered (it rests).
    const open = nextChoices([...mine(10), offered, ...mine(GAP_LINES)], ctx());
    assert.ok(open.length > 0 && !open.includes('quiz'));
  });

  it('lets a kind come back after its rest', () => {
    const old = theirs({ next: 'quiz', createdAt: at(KIND_REST_MS + 1000) });
    assert.ok(nextChoices([...mine(10), old, ...mine(GAP_LINES)], ctx()).includes('quiz'));
  });
});

describe('cleanNext and the prompt', () => {
  it('takes only known keys, and only ones the turn opened', () => {
    assert.equal(cleanNext('quiz'), 'quiz');
    assert.equal(cleanNext(' TruthOrDare '), 'truthOrDare');
    assert.equal(cleanNext('karaoke'), undefined);
    assert.equal(cleanNext(7), undefined);
    assert.equal(cleanNext('call', ['quiz', 'date']), undefined);
    assert.equal(cleanNext('date', ['quiz', 'date']), 'date');
  });

  it('adds the rule only on a texting turn with something open', () => {
    assert.equal(nextParts(undefined, ['quiz'])[0].text.includes('NEXT MOMENT OPEN'), true);
    assert.equal(nextParts(undefined, ['quiz'])[0].text.includes('quiz = a quiz about each other'), true);
    assert.equal(nextParts(undefined, ['quiz'])[0].tier, 'turn');
    assert.equal(nextParts(undefined, [])[0].text, '');
    assert.equal(nextParts('call', ['quiz'])[0].text, '');
  });

  it('reads the field from the model reply', () => {
    assert.equal(parseModelReply('{"messages":["wanna play?"],"next":"truthOrDare"}').next, 'truthOrDare');
    assert.equal(parseModelReply('{"messages":["hey"],"next":"skydive"}').next, undefined);
    assert.equal(parseModelReply('{"messages":["hey"]}').next, undefined);
  });
});
