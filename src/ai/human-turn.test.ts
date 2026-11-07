import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { carriedMood, humanTurnLines, turnRhythm } from './human-turn';
import type { HistoryTurn } from './prompt-layout';

const turn = (role: HistoryTurn['role'], text: string): HistoryTurn => ({ role, text });
const NOW = '2026-11-07T18:00:00.000Z';

describe('this turn’s hints when the model writes (0z141)', () => {
  it('sees questions in any script and short answers by length, not by English words', () => {
    const turns = [
      turn('user', 'мне сегодня грустно, всё валится из рук'),
      turn('assistant', 'Что случилось?'),
      turn('user', 'ну'),
      turn('assistant', 'Hey.\n你今天吃饭了吗？'),
      turn('user', '👍'),
      turn('assistant', 'هل أنت بخير؟ 🙂'),
      turn('user', 'تمام'),
    ];
    assert.deepEqual(turnRhythm(turns), { askedInRow: 3, shortInRow: 3 });
    assert.deepEqual(turnRhythm([turn('assistant', 'Is it? No. I made soup.'), turn('user', 'a long message about the whole day at work')]), {
      askedInRow: 0,
      shortInRow: 0,
    });
  });

  it('asks for no question after a run of them, and something of their own when the chat goes flat', () => {
    const turns = [turn('assistant', 'And you?'), turn('user', 'ok'), turn('assistant', 'Why?'), turn('user', 'lol')];
    const text = humanTurnLines({ turns }).join('\n');
    assert.match(text, /^THIS TURN/);
    assert.match(text, /ask nothing/);
    assert.match(text, /going flat/);
    assert.doesNotMatch(humanTurnLines({ turns, noQuestions: true }).join('\n'), /ask nothing/);
  });

  it('never tells the model how to feel from keywords: it carries its own last feeling, faded by time', () => {
    const mood = { emotion: 'annoyed' as const, intensity: 0.8, at: '2026-11-07T17:30:00.000Z' };
    const text = humanTurnLines({ turns: [turn('user', 'sorry about earlier, I was rude')], mood, now: NOW }).join('\n');
    assert.match(text, /still feel annoyed \(0\.7 of 1\), from your last reply less than an hour ago/);
    // Six hours later it has faded back to their usual self.
    assert.equal(carriedMood(mood, Date.parse('2026-11-07T23:30:00.000Z')), null);
    assert.doesNotMatch(humanTurnLines({ turns: [], mood }).join('\n'), /still feel/, 'no clock, no guess');
  });

  it('follows up after a silence without the flat-chat hint', () => {
    const text = humanTurnLines({ turns: [turn('user', 'k'), turn('assistant', 'Fine then.'), turn('user', 'ok')], silence: true }).join('\n');
    assert.match(text, /went quiet/);
    assert.doesNotMatch(text, /going flat/);
  });
});
