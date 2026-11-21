import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { carriedMood, humanTurnLines, lengthLine, textSize, turnRhythm } from './human-turn';
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

  it('reads a short answer by its own last feeling: after a clash it is the message, after small talk it is just an ok (0z177)', () => {
    const turns = [turn('user', 'you said my sketch was lazy, that hurt'), turn('assistant', 'Don’t whatever me.'), turn('user', 'ok')];
    const tense = { emotion: 'annoyed' as const, intensity: 0.7, at: '2026-11-07T17:59:00.000Z' };
    const after = humanTurnLines({ turns, mood: tense, now: NOW }).join('\n');
    assert.match(after, /short answer is the message/, 'one short answer after a clash is enough');
    assert.doesNotMatch(after, /going flat/);
    // Calm, or the feeling faded: a lone "ok" gets no hint; two in a row carry the talk, no remark.
    const calm = { emotion: 'calm' as const, intensity: 0.9, at: '2026-11-07T17:59:00.000Z' };
    assert.doesNotMatch(humanTurnLines({ turns, mood: calm, now: NOW }).join('\n'), /is the message|going flat/);
    const small = humanTurnLines({ turns: [turn('user', 'hi'), turn('assistant', 'Coach kept us late.'), turn('user', 'ok')], mood: calm, now: NOW }).join('\n');
    assert.match(small, /do not remark on how little they wrote/);
    // Faded (hours later), on a call (its replies never update the feeling), or a continue (their
    // "ok" was already answered): no call-out.
    assert.doesNotMatch(humanTurnLines({ turns, mood: tense, now: '2026-11-08T03:00:00.000Z' }).join('\n'), /is the message/);
    assert.doesNotMatch(humanTurnLines({ turns, mood: tense, now: NOW, call: true }).join('\n'), /is the message/);
    const continued = [...turns, turn('assistant', 'Fine. Be like that.')];
    assert.doesNotMatch(humanTurnLines({ turns: continued, mood: tense, now: NOW }).join('\n'), /is the message|going flat/);
  });

  it('lets their own news lead when their message has something in it (owner, 2026-11-09)', () => {
    const news = humanTurnLines({ turns: [turn('user', 'im so tired today. tomorrow im going to a wedding')] }).join('\n');
    assert.match(news, /brings something of their own .* keep your own life out of it/);
    assert.doesNotMatch(humanTurnLines({ turns: [turn('user', 'ok')] }).join('\n'), /brings something of their own/);
    // Two questions in a row and their news: ask nothing, answer them (never "say something of your own").
    const asked = humanTurnLines({ turns: [turn('assistant', 'Did you sleep?'), turn('user', 'no'), turn('assistant', 'Why not?'), turn('user', 'im so tired, tomorrow i go to a wedding')] }).join('\n');
    assert.match(asked, /ask nothing; answer what they said/);
    assert.doesNotMatch(asked, /say something of your own/);
    // A time skip is a marker in the history, not their message.
    assert.doesNotMatch(humanTurnLines({ turns: [turn('user', '[Time skip: The next morning]')], steered: true }).join('\n'), /brings something/);
    // A whisper: one soft bubble.
    assert.match(humanTurnLines({ turns: [turn('user', 'i really like you')], whisper: true }).join('\n'), /About 8 words, in one bubble/);
    // A continue goes on from your own line.
    assert.doesNotMatch(humanTurnLines({ turns: [turn('user', 'im so tired today, a wedding tomorrow'), turn('assistant', 'A wedding?')] }).join('\n'), /brings something/);
  });

  it('counts a short answer in words, so a whole sentence in a dense script is not an "ok"', () => {
    assert.equal(turnRhythm([turn('user', '对不起，我刚才太过分了')]).shortInRow, 0);
    assert.equal(turnRhythm([turn('user', '嗯')]).shortInRow, 1);
    assert.equal(turnRhythm([turn('user', 'ok fine')]).shortInRow, 1);
  });

  it('follows up after a silence without the flat-chat hint', () => {
    const text = humanTurnLines({ turns: [turn('user', 'k'), turn('assistant', 'Fine then.'), turn('user', 'ok')], silence: true }).join('\n');
    assert.match(text, /went quiet/);
    assert.doesNotMatch(text, /going flat/);
  });
});

describe('the size of a reply (owner, 2026-11-07: "short" still came back as paragraphs)', () => {
  it('counts words in any script, two characters a word where there are no spaces', () => {
    assert.equal(textSize('мне сегодня грустно'), 3);
    assert.equal(textSize('你今天吃饭了吗'), 4);
    assert.equal(textSize(''), 0);
  });

  it('gives the model a number: short stays short, auto follows them, story is prose', () => {
    assert.match(lengthLine({ style: 'mix', length: 'short' }, []), /About 18 words in all, in up to 2 bubbles/);
    assert.match(lengthLine({ style: 'talk', length: 'auto' }, [turn('user', 'ok')]), /About 10 words in all, in one bubble/);
    assert.match(lengthLine({ style: 'mix', length: 'auto' }, [turn('user', 'word '.repeat(80))]), /About 40 words/);
    assert.match(lengthLine({ style: 'story', length: 'auto' }, []), /prose/);
    assert.match(humanTurnLines({ turns: [], prefs: { style: 'mix', length: 'short' } }).join('\n'), /Never a paragraph/);
  });
});
