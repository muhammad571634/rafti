import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canRing, consumePhoto, hasPro, photoQuota, photosLeft, PLANS, shellGrant, startSubscription, TRIAL } from './plans';

const NOW = Date.parse('2026-10-13T08:00:00.000Z');
const DAY = 86_400_000;

describe('plans: the credit model (backend-plan §15.10)', () => {
  it('Basic is chat only; Pro monthly and yearly carry the same allowance', () => {
    assert.equal(PLANS.basic.callSeconds + PLANS.basic.voiceSeconds + PLANS.basic.photos, 0);
    const { id: _a, price: _b, amount: _c, termDays: _d, ...pro } = PLANS.pro;
    const { id: _e, price: _f, amount: _g, termDays: _h, ...proAnnual } = PLANS.proAnnual;
    assert.deepEqual(pro, proAnnual);
    assert.equal(PLANS.proAnnual.amount / 12 < PLANS.pro.amount * 0.7, true);
  });
});

describe('canRing: who a character may call on their own', () => {
  it('never rings a free or Basic user', () => {
    assert.equal(canRing(undefined, NOW), false);
    assert.equal(canRing(startSubscription('basic', NOW), NOW), false);
  });

  it('rings on Pro, Pro yearly and the trial', () => {
    assert.equal(canRing(startSubscription('pro', NOW), NOW), true);
    assert.equal(canRing(startSubscription('proAnnual', NOW), NOW), true);
    assert.equal(canRing(startSubscription('basic', NOW, true), NOW), true);
  });

  it('stops ringing once a cancelled plan or the trial has ended', () => {
    const cancelled = { ...startSubscription('pro', NOW - 40 * DAY), willRenew: false };
    assert.equal(canRing(cancelled, NOW), false);
    const trial = { ...startSubscription('basic', NOW - 4 * DAY, true), willRenew: false };
    assert.equal(canRing(trial, NOW), false);
  });
});

describe('shellGrant: plan shells once per period', () => {
  it('pays the plan once per period, yearly month by month', () => {
    const sub = startSubscription('proAnnual', NOW);
    const first = shellGrant(sub, undefined, NOW);
    assert.equal(first?.amount, 5000);
    assert.equal(shellGrant(sub, first!.periodStart, NOW + 10 * DAY), null);
    const next = shellGrant(sub, first!.periodStart, NOW + 31 * DAY);
    assert.equal(next?.amount, 5000);
    assert.notEqual(next?.periodStart, first?.periodStart);
  });

  it('pays Basic its 2,000 and pays nothing during the trial or without a plan', () => {
    assert.equal(shellGrant(startSubscription('basic', NOW), undefined, NOW)?.amount, 2000);
    assert.equal(shellGrant(startSubscription('basic', NOW, true), undefined, NOW), null);
    assert.equal(shellGrant(undefined, undefined, NOW), null);
  });
});

describe('Photo Booth pictures', () => {
  it('Pro has 30 a period, the trial 3, Basic none', () => {
    assert.equal(photosLeft(startSubscription('pro', NOW), NOW), 30);
    assert.equal(photosLeft(startSubscription('basic', NOW, true), NOW), TRIAL.photos);
    assert.equal(photosLeft(startSubscription('basic', NOW), NOW), 0);
    assert.equal(consumePhoto(startSubscription('basic', NOW), NOW), null);
  });

  it('counts down and comes back next period', () => {
    let sub = startSubscription('pro', NOW);
    for (let i = 0; i < 30; i += 1) sub = consumePhoto(sub, NOW)!;
    assert.equal(photosLeft(sub, NOW), 0);
    assert.equal(consumePhoto(sub, NOW), null);
    assert.equal(photosLeft(sub, NOW + 31 * DAY), 30);
  });

  it('photoQuota: none without Pro or the trial; Pro shows left, total and the reset', () => {
    assert.equal(photoQuota(undefined, NOW), null);
    assert.equal(photoQuota(startSubscription('basic', NOW), NOW), null);
    const pro = consumePhoto(startSubscription('pro', NOW), NOW)!;
    assert.deepEqual(photoQuota(pro, NOW), { left: 29, total: 30, resetsAt: NOW + 30 * DAY });
    assert.equal(photoQuota(startSubscription('proAnnual', NOW, true), NOW)?.total, TRIAL.photos);
  });
});

describe('hasPro: Bedtime and the other Pro-only features', () => {
  it('is false without a plan and on Basic, true on Pro, Pro yearly and the trial', () => {
    assert.equal(hasPro(undefined, NOW), false);
    assert.equal(hasPro(startSubscription('basic', NOW), NOW), false);
    assert.equal(hasPro(startSubscription('pro', NOW), NOW), true);
    assert.equal(hasPro(startSubscription('proAnnual', NOW), NOW), true);
    assert.equal(hasPro(startSubscription('proAnnual', NOW, true), NOW), true);
  });
});
