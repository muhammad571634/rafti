import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  countsAsWakeReply,
  likelyLeaveTime,
  readMorningReply,
  readMorningTime,
  readYesNo,
  reminderTimeFor,
} from './morning-chain';

const SEVEN = new Date(2026, 9, 14, 7, 0, 0);

describe('readMorningTime: times said in the morning', () => {
  it('reads 9.30, 9:30, 9am, half past 9 and quarter to 10', () => {
    assert.equal(readMorningTime('i leave at 9.30', SEVEN), '09:30');
    assert.equal(readMorningTime('work 9:30', SEVEN), '09:30');
    assert.equal(readMorningTime('class at 9am', SEVEN), '09:00');
    assert.equal(readMorningTime('half past 9', SEVEN), '09:30');
    assert.equal(readMorningTime('quarter to 10', SEVEN), '09:45');
  });

  it('takes the nearest time still ahead when there is no am/pm', () => {
    assert.equal(readMorningTime('meeting at 5', SEVEN), '17:00');
    assert.equal(readMorningTime('leave at 8', SEVEN), '08:00');
  });

  it('reads "in 30 min" and "in an hour"', () => {
    assert.equal(readMorningTime('leaving in 30 min', SEVEN), '07:30');
    assert.equal(readMorningTime('bus in an hour', SEVEN), '08:00');
  });

  it('does not read "5 more min" as a time', () => {
    assert.equal(readMorningTime('5 more min please', SEVEN), null);
  });
});

describe('readMorningReply: which way the chain goes', () => {
  it('a time (and what for)', () => {
    assert.deepEqual(readMorningReply('work, I leave at 9.30', SEVEN), { kind: 'time', activity: 'Work', time: '09:30' });
  });
  it('an activity without a time', () => {
    assert.deepEqual(readMorningReply('gym then classes', SEVEN), { kind: 'activity', activity: 'Gym' });
  });
  it('too sleepy', () => {
    assert.deepEqual(readMorningReply("nooo so sleepy don't wanna get up", SEVEN), { kind: 'sleepy' });
  });
  it('anything else', () => {
    assert.deepEqual(readMorningReply('had a weird dream about cats', SEVEN), { kind: 'other' });
  });
});

describe('the small rules', () => {
  it('needs three real words to turn the alarm off', () => {
    assert.equal(countsAsWakeReply('k'), false);
    assert.equal(countsAsWakeReply('ok im up'), true);
  });
  it('reminds 20 min before, 5 min before when late, or not at all', () => {
    assert.equal(reminderTimeFor('09:30', SEVEN), '09:10');
    assert.equal(reminderTimeFor('07:15', SEVEN), '07:10');
    assert.equal(reminderTimeFor('07:03', SEVEN), null);
  });
  it('offers a likely leave time on the next half hour', () => {
    assert.equal(likelyLeaveTime(SEVEN), '07:30');
    assert.equal(likelyLeaveTime(new Date(2026, 9, 14, 7, 10)), '08:00');
  });
  it('reads yes and no', () => {
    assert.equal(readYesNo('yes please'), 'yes');
    assert.equal(readYesNo('no thanks'), 'no');
    assert.equal(readYesNo('hmm'), null);
  });
});
