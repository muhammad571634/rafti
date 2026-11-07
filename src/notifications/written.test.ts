import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dueOutbox, landedMarks, toOutbox } from './outbox';
import type { PlannedPush, PushKind } from './plan';
import { PUSH_REACH, pushIdeas, pushLine, pushesToWrite, prunePushLines, withWritten, writesIdeas, writtenCategory, writtenKey, type PushLines } from './written';

const now = new Date(2026, 9, 31, 12, 0);
const hours = (n: number) => new Date(now.getTime() + n * 3_600_000);
const push = (kind: PushKind, id: string, at: Date, extra: Partial<PlannedPush> = {}): PlannedPush => ({
  id,
  kind,
  at,
  characterId: 'c_kai',
  title: 'Kai',
  line: 'stock line',
  route: '/chat/c1',
  channel: 'messages',
  ...extra,
});
const written = (line: string, ago = 1): PushLines[string] => ({ line, writtenAt: new Date(now.getTime() - ago * 3_600_000).toISOString() });

describe('the words of a push (model on)', () => {
  it('uses the line the model wrote', () => {
    const morning = push('morning', 'morning:2026-11-01:morning:c_kai', hours(20));
    assert.deepEqual(withWritten(morning, { [morning.id]: written('Up yet?') }, now).map((p) => p.line), ['Up yet?']);
  });

  it('sends nothing rather than a stock line in their mouth', () => {
    assert.deepEqual(withWritten(push('morning', 'm', hours(20)), {}, now), []);
    assert.deepEqual(withWritten(push('morning', 'm', hours(20)), { m: written('Old.', 30) }, now), []);
    assert.deepEqual(withWritten(push('care', 'c', hours(2)), { c: written('') }, now), []);
  });

  it('keeps the stock words of a reminder the user counts on', () => {
    const remind = push('remind', 'remind:p1', hours(2), { timeSensitive: true });
    assert.deepEqual(withWritten(remind, {}, now).map((p) => p.line), ['stock line']);
  });

  it('leaves app pushes and fixed strings as they are', () => {
    const call = push('call', 'call:x', hours(2), { line: undefined, textKey: 'push.incomingCall' });
    const unread = push('unread', 'unread:x', hours(1));
    assert.deepEqual(withWritten(call, {}, now), [call]);
    assert.deepEqual(withWritten(unread, {}, now), [unread]);
  });

  it('keeps one comeback line for the same step, whatever day it was planned on', () => {
    assert.equal(writtenKey(push('comeback', 'comeback:2026-10-31:3:c_kai', hours(72))), 'comeback:3:c_kai');
    const later = push('comeback', 'comeback:2026-11-02:3:c_kai', hours(100));
    assert.deepEqual(withWritten(later, { 'comeback:3:c_kai': written('Three days.', 200) }, now).map((p) => p.line), ['Three days.']);
  });
});

describe('the replies under a push (model on)', () => {
  const ideas = [
    { label: 'Cones won', text: 'The cones won again, I parked on the grass' },
    { label: 'You first', text: 'You first. What was the dream?' },
  ];
  const kept = { ...written('Up yet?'), ideas };

  it('rides on the push, with a reach so a tap stays free', () => {
    const morning = push('morning', 'm', hours(20));
    const [sent] = withWritten(morning, { m: kept }, now);
    assert.deepEqual(sent.ideas, ideas);
    assert.equal(sent.reach, PUSH_REACH);
  });

  it('keeps the reach a push already has', () => {
    const week = push('week', 'w', hours(5), { reach: 'week' });
    const [sent] = withWritten(week, { w: kept }, now);
    assert.deepEqual(sent.ideas, ideas);
    assert.equal(sent.reach, 'week');
  });

  it('leaves the buttons that do something to the code: a check-in, a thread', () => {
    for (const kind of ['care', 'touch'] as const) {
      const [sent] = withWritten(push(kind, 'x', hours(2), { reach: 'care:sick' }), { x: kept }, now);
      assert.equal(sent.line, 'Up yet?');
      assert.equal(sent.ideas, undefined);
      assert.equal(sent.reach, 'care:sick');
    }
    assert.equal(writesIdeas(push('care', 'x', hours(2))), false);
    assert.equal(writesIdeas(push('touch', 'x', hours(2))), false);
    assert.equal(writesIdeas(push('comeback', 'x', hours(2))), true);
  });

  it('adds nothing when the model wrote no replies', () => {
    const [sent] = withWritten(push('morning', 'm', hours(20)), { m: written('Up yet?') }, now);
    assert.equal(sent.ideas, undefined);
    assert.equal(sent.reach, undefined);
  });

  it('cleans what the model wrote', () => {
    assert.deepEqual(
      pushIdeas([
        { label: '  Cones won ', text: ' The cones won ' },
        { label: 'cones won', text: 'A second one with the same button' },
        { label: 'You first', text: 'You first.' },
        { label: '', text: 'No button' },
        { label: 'Third', text: 'A third.' },
        { label: 'Fourth', text: 'One too many.' },
      ]),
      [
        { label: 'Cones won', text: 'The cones won' },
        { label: 'You first', text: 'You first.' },
        { label: 'Third', text: 'A third.' },
      ],
    );
  });

  it('wants at least two, or none: one button is not a choice', () => {
    assert.equal(pushIdeas([{ label: 'Only', text: 'Only one.' }]), undefined);
    assert.equal(pushIdeas(undefined), undefined);
  });

  it('never puts a line about self-harm on a button', () => {
    const safe = { label: 'You first', text: 'You first.' };
    assert.equal(pushIdeas([{ label: 'Bye', text: 'I want to kill myself' }, safe]), undefined);
  });

  it('shows a line as plain text: bold loses its stars, narration goes', () => {
    assert.equal(pushLine(['Are you **practicing parking** again?', '*sighs* Friday.']), 'Are you practicing parking again? Friday.');
  });

  it('leaves a star that is part of the words alone', () => {
    assert.equal(pushLine(['What the f*ck, 2*3 is six']), 'What the f*ck, 2*3 is six');
  });

  it('keeps the buttons fixed with previews off, as a tap must match what the chat holds', () => {
    const [sent] = withWritten(push('morning', 'm', hours(20)), { m: kept }, now, false);
    assert.equal(sent.line, 'Up yet?');
    assert.equal(sent.ideas, undefined);
    assert.equal(sent.reach, undefined);
  });

  it('leaves the evening question to the code: its buttons say what goes in the diary', () => {
    assert.equal(writesIdeas(push('day', 'x', hours(2))), false);
    assert.equal(writesIdeas(push('life', 'x', hours(2))), false);
  });

  it('names a category the OS accepts, stable for the push', () => {
    const id = 'morning:2026-11-01:morning:c_kai';
    assert.match(writtenCategory(id), /^written_\d+$/);
    assert.equal(writtenCategory(id), writtenCategory(id));
    assert.notEqual(writtenCategory(id), writtenCategory('comeback:2026-11-01:1:c_kai'));
  });

  it('lands in the chat with the push', () => {
    const [item] = toOutbox([push('morning', 'morning:2026-11-01:morning:c_kai', hours(20), { ideas, reach: PUSH_REACH })]);
    assert.deepEqual(item.ideas, ideas);
    assert.equal(item.reach, PUSH_REACH);
  });
});

describe('what to write ahead', () => {
  it('takes the soonest missing lines, a few at a time, and only what is near', () => {
    const plan = [
      push('life', 'l3', hours(9)),
      push('life', 'l1', hours(1)),
      push('life', 'l2', hours(2)),
      push('life', 'far', hours(44)),
      push('unread', 'u', hours(1)),
      push('comeback', 'comeback:2026-10-31:7:c_kai', hours(168)),
    ];
    assert.deepEqual(pushesToWrite(plan, { l2: written('Done.') }, now).map((p) => p.id), ['l1', 'l3', 'comeback:2026-10-31:7:c_kai']);
    assert.equal(pushesToWrite(Array.from({ length: 12 }, (_, i) => push('life', `n${i}`, hours(i + 1))), {}, now).length, 5);
  });

  it('asks again for a line gone stale, not for a skip', () => {
    assert.deepEqual(pushesToWrite([push('life', 'a', hours(3))], { a: written('Old.', 30) }, now).map((p) => p.id), ['a']);
    assert.deepEqual(pushesToWrite([push('life', 'a', hours(3))], { a: written('') }, now), []);
  });

  it('forgets lines too old to use', () => {
    const lines = { fresh: written('A'), old: written('B', 24 * 20) };
    assert.deepEqual(Object.keys(prunePushLines(lines, now)), ['fresh']);
  });
});

describe('a push that reached the phone lands in its chat', () => {
  const plan = [
    push('comeback', 'comeback:2026-10-31:1:c_kai', hours(30)),
    push('morning', 'morning:2026-11-01:morning:c_kai', hours(20), { reach: 'r' }),
    push('gift', 'gift:2026-10-31', hours(8)),
    push('week', 'week:2026-11-01:c_kai', hours(30)),
    push('unread', 'unread:c1:x', hours(1)),
    push('call', 'call:x', hours(3), { line: undefined, textKey: 'push.incomingCall' }),
  ];

  it('holds only lines a chat should get, with the time they go out', () => {
    const outbox = toOutbox(plan);
    assert.deepEqual(outbox.map((o) => o.kind), ['comeback', 'morning', 'week']);
    assert.equal(outbox[1].at, hours(20).toISOString());
    assert.equal(outbox[1].reach, 'r');
  });

  it('lands what is due in time order, the rest waits', () => {
    const outbox = toOutbox(plan);
    assert.deepEqual(dueOutbox(outbox, hours(40)).map((o) => o.kind), ['morning', 'comeback', 'week']);
    assert.deepEqual(dueOutbox(outbox, hours(25)).map((o) => o.kind), ['morning']);
    assert.deepEqual(dueOutbox(outbox, hours(1)), []);
  });

  it('marks what landed, so the app does not write it again', () => {
    const items = toOutbox([
      push('morning', 'morning:2026-11-01:morning:c_kai', hours(20)),
      push('evening', 'evening:2026-10-31:night:c_kai', hours(9)),
      push('brief', 'brief:2026-11-01:morning:c_kai', hours(20), { covers: ['t9'] }),
      push('day', 'day:2026-10-31:night:c_kai', hours(9)),
      push('remind', 'remind:p:1', hours(1)),
      push('followUp', 'followUp:p2', hours(2)),
      push('life', 'life:2026-10-31:c_kai:lunch', hours(1)),
      push('care', 'care:k1', hours(1)),
      push('touch', 'touch:t1', hours(1)),
      push('world', 'world:velvet:ch2', new Date(2026, 9, 31, 17, 0)),
      push('birthday', 'birthday:2026-11-01', new Date(2026, 10, 1, 7, 0)),
      push('comeback', 'comeback:2026-10-31:1:c_kai', hours(30)),
    ]);
    assert.deepEqual(landedMarks(items), {
      slots: ['2026-11-01:morning', '2026-10-31:night', '2026-11-01:morning', '2026-10-31:night'],
      reminded: ['p:1'],
      followedUp: ['p2'],
      life: ['2026-10-31:c_kai:lunch'],
      care: ['k1'],
      touches: ['t9', 't1'],
      worlds: ['velvet:ch2|2026-10-31'],
      birthdayYear: 2026,
    });
  });
});
