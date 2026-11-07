import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseModelReply } from './reply-style';
import { messageText } from '../lib/story-continuity';
import { cleanSetup, offerLines, sameSetup, SETUP_RULES_LINES, setupHistoryText, setupUsable } from './setup-prompt';
import { cleanThreadOps, hasThreadOps, wallTime, wallToIso } from './thread-prompt';

// Saturday, Nov 7 2026, 19:10 on the phone's clock.
const NOW = new Date(2026, 10, 7, 19, 10);

describe('cleanSetup: what the model offered to set up', () => {
  it('keeps a well-formed alarm and plan', () => {
    assert.deepEqual(cleanSetup({ kind: 'alarm', title: 'Uyg‘onish', date: '2026-11-08', time: '07:00', repeat: [] }), {
      kind: 'alarm',
      title: 'Uyg‘onish',
      date: '2026-11-08',
      time: '07:00',
      repeat: [],
    });
    assert.deepEqual(cleanSetup({ kind: 'plan', title: 'Coffee', date: '2026-11-08' }), { kind: 'plan', title: 'Coffee', date: '2026-11-08' });
  });

  it('reads 7:00 as 07:00 and cleans the repeat days', () => {
    const offer = cleanSetup({ kind: 'alarm', title: '', date: '2026-11-09', time: '7:00', repeat: [5, 1, 1, 9, 'x', 3] });
    assert.equal(offer?.time, '07:00');
    assert.deepEqual(offer?.repeat, [1, 3, 5]);
  });

  it('drops what cannot be made, never guesses', () => {
    assert.equal(cleanSetup(undefined), undefined);
    assert.equal(cleanSetup('wake me'), undefined);
    assert.equal(cleanSetup({ kind: 'reminder', title: 'x', date: '2026-11-08', time: '07:00' }), undefined);
    assert.equal(cleanSetup({ kind: 'alarm', title: 'x', date: '2026-11-08' }), undefined, 'an alarm needs a time');
    assert.equal(cleanSetup({ kind: 'alarm', title: 'x', date: '2026-11-08', time: '25:00' }), undefined);
    assert.equal(cleanSetup({ kind: 'plan', title: 'x', date: '2026-02-30' }), undefined);
    assert.equal(cleanSetup({ kind: 'plan', title: '  ', date: '2026-11-08' }), undefined, 'a plan needs a title');
  });

  it('keeps no repeat on a plan', () => {
    assert.equal(cleanSetup({ kind: 'plan', title: 'Gym', date: '2026-11-08', repeat: [1] })?.repeat, undefined);
  });
});

describe('setupUsable: an offer the phone can still make', () => {
  it('a one-time alarm rings on its day only', () => {
    assert.equal(setupUsable({ kind: 'alarm', title: '', date: '2026-11-08', time: '07:00', repeat: [] }, NOW), true);
    assert.equal(setupUsable({ kind: 'alarm', title: '', date: '2026-11-07', time: '22:00', repeat: [] }, NOW), true);
    // 07:00 today has passed, so the alarm would ring tomorrow, not today.
    assert.equal(setupUsable({ kind: 'alarm', title: '', date: '2026-11-07', time: '07:00', repeat: [] }, NOW), false);
    // Monday is two days away: a one-time alarm cannot hold it.
    assert.equal(setupUsable({ kind: 'alarm', title: '', date: '2026-11-09', time: '07:00', repeat: [] }, NOW), false);
  });

  it('a repeating alarm always can', () => {
    assert.equal(setupUsable({ kind: 'alarm', title: '', date: '2026-11-01', time: '07:00', repeat: [1, 2, 3, 4, 5] }, NOW), true);
  });

  it('a plan is usable until its moment', () => {
    assert.equal(setupUsable({ kind: 'plan', title: 'Coffee', date: '2026-11-07', time: '20:00' }, NOW), true);
    assert.equal(setupUsable({ kind: 'plan', title: 'Coffee', date: '2026-11-07', time: '18:00' }, NOW), false);
    assert.equal(setupUsable({ kind: 'plan', title: 'Coffee', date: '2026-11-07' }, NOW), true, 'no time: the whole day');
    assert.equal(setupUsable({ kind: 'plan', title: 'Coffee', date: '2026-11-06' }, NOW), false);
  });
});

describe('the reply carries the offer', () => {
  it('parseModelReply reads setup beside the bubbles', () => {
    const reply = parseModelReply(
      '{"language":"Turkish","crisis":false,"emotion":"happy","intensity":0.5,"messages":["Tamam, 7de uyandırırım"],"setup":{"kind":"alarm","title":"","date":"2026-11-08","time":"07:00","repeat":[]}}',
    );
    assert.deepEqual(reply.bubbles, ['Tamam, 7de uyandırırım']);
    assert.equal(reply.setup?.kind, 'alarm');
    assert.equal(reply.setup?.time, '07:00');
  });

  it('a reply without one, or with a broken one, has none', () => {
    assert.equal(parseModelReply('{"messages":["hi"]}').setup, undefined);
    assert.equal(parseModelReply('{"messages":["hi"],"setup":{"kind":"alarm"}}').setup, undefined);
  });

  it('the rule asks for the user to confirm and never sets things up unasked', () => {
    const rules = SETUP_RULES_LINES.join('\n');
    assert.match(rules, /never on your own/);
    assert.match(rules, /one tap/);
  });
});

describe('a change and where each offer stands (0z136, seen on the A51)', () => {
  const card = (setup: Record<string, unknown>, id: string) =>
    ({ id, conversationId: 'c', author: 'them', kind: 'system', card: 'setup', setup, createdAt: '2026-11-07T14:33:00.000Z' }) as never;

  it('keeps "change" only when it is exactly true', () => {
    assert.equal(cleanSetup({ kind: 'alarm', title: '', date: '2026-11-08', time: '08:30', change: true })?.change, true);
    assert.equal(cleanSetup({ kind: 'alarm', title: '', date: '2026-11-08', time: '08:30', change: 'yes' })?.change, undefined);
  });

  it('names every card in the window with where it stands, oldest first', () => {
    const lines = offerLines([
      { id: 'm1', conversationId: 'c', author: 'me', kind: 'text', text: 'wake me at 7', createdAt: '2026-11-07T14:33:00.000Z' } as never,
      card({ kind: 'alarm', title: 'Sabah işi', date: '2026-11-08', time: '07:00', repeat: [], replaced: true }, 'm2'),
      card({ kind: 'alarm', title: 'Sabah işi', date: '2026-11-08', time: '08:30', repeat: [], madeId: 'alarm_1' }, 'm3'),
      card({ kind: 'plan', title: 'Kahve', date: '2026-11-14' }, 'm4'),
      card({ kind: 'plan', title: 'Sinema', date: '2026-11-15', declined: true }, 'm5'),
    ]);
    assert.equal(lines.length, 5);
    assert.match(lines[1], /alarm "Sabah işi" 2026-11-08 07:00: replaced/);
    assert.match(lines[2], /08:30: they set it/);
    assert.match(lines[3], /plan "Kahve" 2026-11-14: not set yet/);
    assert.match(lines[4], /they said not now/);
  });

  it('reads cards from Us and Alarms in the history, where they happened, not as offers (0z139)', () => {
    const mine = (setup: object, id: string) => ({ ...card({ from: 'app', ...setup }, id), author: 'me' }) as never;
    const set = mine({ kind: 'plan', title: 'Sinema', date: '2026-11-13', time: '20:00', madeId: 'sch_1', removed: true }, 'm1');
    const off = mine({ kind: 'plan', title: 'Sinema', date: '2026-11-13', time: '20:00', madeId: 'sch_1', cancelled: true }, 'm2');
    const wake = mine({ kind: 'alarm', title: '', date: '2026-11-08', time: '07:24', repeat: [1, 2], madeId: 'alarm_1' }, 'm3');
    assert.equal(setupHistoryText(set), '[They set it up in the app: a plan "Sinema", 2026-11-13 20:00] (later cancelled)');
    assert.equal(setupHistoryText(off), '[They cancelled it in the app: a plan "Sinema", 2026-11-13 20:00]');
    assert.equal(setupHistoryText(wake), '[They set it up in the app: an alarm you wake them with, 2026-11-08 07:24, repeats on weekdays 1,2]');
    assert.equal(messageText(off), setupHistoryText(off));
    // The friend's own offers stay in the offers list, not in the history.
    const offered = card({ kind: 'plan', title: 'Kahve', date: '2026-11-14' }, 'm4');
    assert.equal(setupHistoryText(offered), null);
    assert.equal(messageText(offered), null);
    assert.deepEqual(offerLines([set, off, wake]), []);
    assert.equal(offerLines([set, offered]).length, 2);
  });

  it('says nothing without cards, and skips a broken one', () => {
    assert.deepEqual(offerLines([]), []);
    assert.deepEqual(offerLines([card({ kind: 'alarm', date: 'soon' }, 'm1')]), []);
  });
});

describe('the model’s threads reach the app (0z136: they were paid for and never read)', () => {
  it('keeps times on the user clock and drops a zone the model added', () => {
    const ops = cleanThreadOps({
      add: [
        { kind: 'plan', about: 'Sinema', quote: 'yarın 15te sinemaya', happensAt: '2026-11-08T15:00:00Z', touches: [{ at: '2026-11-08 14:00', phase: 'before', why: 'iyi seyirler' }] },
        { kind: 'nonsense', about: 'Exam', quote: '', happensAt: null, touches: [] },
        { quote: 'no about' },
      ],
      move: [{ id: 'th_1', happensAt: '2026-11-08T25:00' }],
      close: [{ id: 'th_2', outcome: 'good' }, { id: 'th_3', outcome: 'maybe' }],
    });
    assert.equal(ops.add.length, 2);
    assert.equal(ops.add[0].happensAt, '2026-11-08T15:00');
    assert.equal(ops.add[0].touches[0].at, '2026-11-08T14:00');
    assert.equal(ops.add[1].kind, 'follow', 'an unknown kind is a plain follow-up');
    assert.equal(ops.move[0].happensAt, undefined, 'hour 25 is dropped');
    assert.deepEqual(ops.close, [{ id: 'th_2', outcome: 'good' }]);
  });

  it('caps a runaway answer and reads nothing from junk', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ about: `t${i}`, touches: [] }));
    assert.equal(cleanThreadOps({ add: many }).add.length, 4);
    assert.equal(hasThreadOps(cleanThreadOps('x')), false);
    assert.equal(wallTime('soon'), undefined);
    assert.equal(wallTime('2026-02-30T10:00'), undefined);
  });

  it('a wall time is read on the device clock', () => {
    const at = new Date(wallToIso('2026-11-08T15:00'));
    assert.equal(at.getHours(), 15);
    assert.equal(at.getDate(), 8);
  });

  it('the reply carries them beside the bubbles, only when there are any', () => {
    const reply = parseModelReply('{"messages":["ok"],"threads":{"close":[{"id":"th_9","outcome":"done"}]}}');
    assert.deepEqual(reply.threads?.close, [{ id: 'th_9', outcome: 'done' }]);
    assert.equal(parseModelReply('{"messages":["ok"],"threads":{}}').threads, undefined);
  });
});

describe('the same thing offered twice stays one (seen on the A51: two 09:00 alarms)', () => {
  it('same kind and moment is the same, whatever the title', () => {
    assert.equal(sameSetup({ kind: 'alarm', date: '2026-11-08', time: '09:00', repeat: [] }, { kind: 'alarm', date: '2026-11-08', time: '09:00', repeat: [] }), true);
    assert.equal(sameSetup({ kind: 'plan', date: '2026-11-08', time: '15:00' }, { kind: 'plan', date: '2026-11-08', time: '15:00' }), true);
  });
  it('another time, day or set of days is another thing', () => {
    assert.equal(sameSetup({ kind: 'alarm', date: '2026-11-08', time: '09:00', repeat: [] }, { kind: 'alarm', date: '2026-11-08', time: '09:30', repeat: [] }), false);
    assert.equal(sameSetup({ kind: 'plan', date: '2026-11-08', time: '15:00' }, { kind: 'plan', date: '2026-11-09', time: '15:00' }), false);
    assert.equal(sameSetup({ kind: 'alarm', date: '2026-11-08', time: '07:00', repeat: [1, 2, 3, 4, 5] }, { kind: 'alarm', date: '2026-11-09', time: '07:00', repeat: [0, 6] }), false);
    assert.equal(sameSetup({ kind: 'alarm', date: '2026-11-08', time: '09:00' }, { kind: 'plan', date: '2026-11-08', time: '09:00' }), false);
  });
});
