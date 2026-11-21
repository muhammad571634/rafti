import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { HistoryTurn } from './prompt-layout';
import { HISTORY_WINDOW, historyStart, joinParts, layoutPrompt, orderParts, part } from './prompt-layout';

/** A chat of `n` turns that opens with their greeting, as every chat does; each turn `size` characters. */
const chat = (n: number, size = 40) =>
  Array.from({ length: n }, (_, i): HistoryTurn => ({ role: i % 2 ? 'user' : 'assistant', text: String(i).padEnd(size, '.') }));

describe('prompt parts', () => {
  it('run from what never changes to what changes every reply, each tier in its builder’s order', () => {
    const parts = [
      part('hints', 'turn', ['H']),
      part('rules', 'global', ['R']),
      part('empty', 'chat', []),
      part('user', 'chat', ['U']),
      part('persona', 'character', ['P']),
      part('style', 'chat', ['S']),
    ];
    assert.deepEqual(
      orderParts(parts).map((p) => p.name),
      ['rules', 'persona', 'user', 'style', 'hints'],
    );
    assert.equal(joinParts(parts), 'R\n\nP\n\nU\n\nS\n\nH');
  });
});

describe('historyStart', () => {
  const { keep, step } = HISTORY_WINDOW;

  it('keeps a short chat whole, from the user’s first line', () => {
    assert.equal(historyStart(chat(9)), 1);
    assert.equal(historyStart([]), 0);
  });

  it('moves the cut only on whole steps, so a growing chat keeps its start for a step', () => {
    let start = historyStart(chat(1));
    let moves = 0;
    for (let n = 2; n <= 100; n++) {
      const next = historyStart(chat(n));
      if (next !== start) {
        moves++;
        assert.equal((n - keep) % step, 0, `moved at ${n} turns`);
      }
      start = next;
      if (n > keep) assert.ok(n - start >= keep - 1 && n - start <= keep + step - 1, `${n} turns keep ${n - start}`);
    }
    assert.equal(moves, Math.floor((100 - keep) / step));
  });

  it('over the budget moves on by more whole steps, never below the floor', () => {
    // 39 long turns: from turn 20 the rest fits.
    assert.equal(historyStart(chat(39, 1000)), 21);
    // 30 huge ones: one more step, then the floor stops it (9 turns kept, over the budget).
    assert.equal(historyStart(chat(30, 5000)), 21);
    // 25 huge ones: a step would leave 5, under the floor of 6.
    assert.equal(historyStart(chat(25, 5000)), 1);
  });

  it('finds the same cut when the server loads only the recent end', () => {
    const whole = chat(57);
    assert.equal(historyStart(whole), 21);
    assert.equal(historyStart(whole.slice(10), { offset: 10 }), 11);
    assert.deepEqual(layoutPrompt([], whole.slice(10), { offset: 10 }).history, whole.slice(21));
  });
});

describe('layoutPrompt', () => {
  it('gives one block per system tier, the history from its cut and the turn after it', () => {
    const layout = layoutPrompt(
      [part('rules', 'global', ['R']), part('lore', 'turn', ['L']), part('cue', 'turn', ['C']), part('user', 'chat', ['U'])],
      chat(5),
    );
    assert.deepEqual(layout.system, [
      { tier: 'global', text: 'R' },
      { tier: 'chat', text: 'U' },
    ]);
    assert.equal(layout.turn, 'L\n\nC');
    assert.equal(layout.cut, 1);
    assert.deepEqual(layout.history, chat(5).slice(1));
  });
});
