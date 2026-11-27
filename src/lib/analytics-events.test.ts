import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bucketOf,
  cleanEventBatch,
  cleanProps,
  enqueue,
  EVENT_LIMITS,
  hash32,
  screenName,
  SESSION_GAP_MS,
  sessionFor,
  settle,
  variant,
  type TrackedEvent,
} from './analytics-events.ts';

const NOW = Date.UTC(2026, 10, 19, 12);
const event = (id: string, extra: Partial<TrackedEvent> = {}): TrackedEvent => ({ id, name: 'message_sent', at: NOW - 1000, session: 'sess_1', ...extra });
const batch = (events: unknown[], extra: Record<string, unknown> = {}) => ({
  events,
  app: { version: '1.2.0', channel: 'preview', platform: 'android', locale: 'en-US' },
  bucket: 42,
  ...extra,
});

describe('cleanProps', () => {
  it('keeps short counting props and drops the rest', () => {
    assert.deepEqual(cleanProps({ character: 'c_kai', group: false, seconds: 61 }), { character: 'c_kai', group: false, seconds: 61 });
    // Bad keys, objects, empty texts and NaN go.
    assert.deepEqual(cleanProps({ 'bad key': 1, nested: { a: 1 }, empty: '  ', nan: Number.NaN, ok: 1 }), { ok: 1 });
    assert.equal(cleanProps('text'), undefined);
    assert.equal(cleanProps({}), undefined);
  });

  it('cuts texts and caps how many props one event carries', () => {
    const long = 'x'.repeat(200);
    assert.equal(cleanProps({ name: long })?.name, 'x'.repeat(EVENT_LIMITS.text));
    // A cut never splits an emoji in half.
    const emoji = '\u{1F600}'.repeat(100);
    assert.equal(Array.from(cleanProps({ name: emoji })?.name as string).length, EVENT_LIMITS.text);
    const many = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, i]));
    assert.equal(Object.keys(cleanProps(many) ?? {}).length, EVENT_LIMITS.props);
  });
});

describe('cleanEventBatch', () => {
  it('takes a good batch', () => {
    const clean = cleanEventBatch(batch([event('ev_0001', { props: { character: 'c_kai' } })]), NOW);
    assert.ok(clean);
    assert.equal(clean.events.length, 1);
    assert.equal(clean.skipped, 0);
    assert.equal(clean.bucket, 42);
    assert.deepEqual(clean.app, { version: '1.2.0', channel: 'preview', platform: 'android', locale: 'en-US' });
    assert.deepEqual(clean.events[0], { id: 'ev_0001', name: 'message_sent', session: 'sess_1', at: new Date(NOW - 1000), props: { character: 'c_kai' } });
  });

  it('refuses a broken request as a whole', () => {
    assert.equal(cleanEventBatch(null, NOW), null);
    assert.equal(cleanEventBatch(batch([]), NOW), null);
    assert.equal(cleanEventBatch(batch(Array.from({ length: EVENT_LIMITS.batch + 1 }, (_, i) => event(`ev_${1000 + i}`))), NOW), null);
    assert.equal(cleanEventBatch(batch([event('ev_0001')], { bucket: 100 }), NOW), null);
    assert.equal(cleanEventBatch(batch([event('ev_0001')], { bucket: '4' }), NOW), null);
  });

  it('drops single bad events and counts them', () => {
    const clean = cleanEventBatch(
      batch([
        event('ev_0001'),
        event('ev_0001'), // the same id twice
        event('ev_0002', { name: 'Bad Name' }),
        event('x'), // too short an id
        event('ev_0003', { session: '' }),
        event('ev_0004', { at: NOW - EVENT_LIMITS.maxAgeMs - 1 }), // too old
        'not an event',
      ]),
      NOW,
    );
    assert.equal(clean?.events.length, 1);
    assert.equal(clean?.skipped, 6);
  });

  it('pulls a clock far ahead back to now, and fills a missing time', () => {
    const clean = cleanEventBatch(batch([event('ev_0001', { at: NOW + 86_400_000 }), event('ev_0002', { at: 'soon' as unknown as number })]), NOW);
    assert.equal(clean?.events[0].at.getTime(), NOW + 5 * 60_000);
    assert.equal(clean?.events[1].at.getTime(), NOW);
  });

  it('names unknown app fields unknown instead of refusing', () => {
    const clean = cleanEventBatch(batch([event('ev_0001')], { app: { channel: 'beta', platform: 'tv' } }), NOW);
    assert.deepEqual(clean?.app, { version: 'unknown', channel: 'unknown', platform: 'unknown', locale: 'unknown' });
  });
});

describe('buckets and experiments', () => {
  it('gives the same numbers everywhere', () => {
    assert.equal(hash32(''), 0x811c9dc5);
    assert.equal(hash32('a'), 0xe40c292c);
    assert.equal(bucketOf('install-1'), bucketOf('install-1'));
    assert.ok(bucketOf('install-1') >= 0 && bucketOf('install-1') < 100);
  });

  it('splits installs about evenly and keeps each install in its arm', () => {
    const arms = ['a', 'b'] as const;
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 2000; i += 1) counts[variant(`install-${i}`, 'test', arms)] += 1;
    assert.ok(counts.a > 850 && counts.b > 850, JSON.stringify(counts));
    assert.equal(variant('install-7', 'test', arms), variant('install-7', 'test', arms));
  });

  it('follows weights and reshuffles per experiment', () => {
    let control = 0;
    let same = 0;
    for (let i = 0; i < 2000; i += 1) {
      if (variant(`install-${i}`, 'weighted', ['control', 'new'], [9, 1]) === 'control') control += 1;
      if (variant(`install-${i}`, 'one', ['a', 'b']) === variant(`install-${i}`, 'two', ['a', 'b'])) same += 1;
    }
    assert.ok(control > 1700 && control < 1900, String(control));
    assert.ok(same > 850 && same < 1150, String(same));
  });
});

describe('screens, sessions and the queue', () => {
  it('names a screen without its ids or groups', () => {
    assert.equal(screenName(['chat', '[id]']), '/chat/[id]');
    assert.equal(screenName(['(tabs)', 'us']), '/us');
    assert.equal(screenName([]), '/');
  });

  it('keeps a session until the app was away long enough', () => {
    let n = 0;
    const id = () => `sess_${++n}`;
    const first = sessionFor(null, NOW, id);
    assert.deepEqual(first, { session: { id: 'sess_1', lastAt: NOW }, fresh: true });
    const near = sessionFor(first.session, NOW + SESSION_GAP_MS - 1, id);
    assert.equal(near.fresh, false);
    assert.equal(near.session.id, 'sess_1');
    const later = sessionFor(near.session, near.session.lastAt + SESSION_GAP_MS, id);
    assert.deepEqual(later, { session: { id: 'sess_2', lastAt: near.session.lastAt + SESSION_GAP_MS }, fresh: true });
  });

  it('drops the oldest past the cap and lets sent events go', () => {
    let queue: TrackedEvent[] = [];
    for (let i = 0; i < EVENT_LIMITS.queue + 3; i += 1) queue = enqueue(queue, event(`ev_${10_000 + i}`));
    assert.equal(queue.length, EVENT_LIMITS.queue);
    assert.equal(queue[0].id, 'ev_10003');
    const left = settle(queue, queue.slice(0, 10));
    assert.equal(left.length, EVENT_LIMITS.queue - 10);
    assert.equal(left[0].id, 'ev_10013');
  });
});
