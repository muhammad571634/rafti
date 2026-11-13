import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PromptLayout } from '../../../src/ai/prompt-layout.ts';
import { createGate } from './gate.ts';
import { LlmBusyError, type LlmProvider, type LlmResult } from './types.ts';

const layout = { system: [], history: [], turn: 'hi' } as unknown as PromptLayout;

/** A provider whose calls stay open until the test lets them go. */
function held(result: LlmResult = { text: '{}', usage: {} }) {
  const open: (() => void)[] = [];
  let seen = 0;
  const provider: LlmProvider = {
    name: 'held',
    complete() {
      seen += 1;
      return new Promise((resolve) => open.push(() => resolve(result)));
    },
  };
  return { provider, letGo: () => open.shift()?.(), seen: () => seen };
}

/** 1,000,000 input tokens of this model are $0.25 at list price (llm/usage.ts). */
const costing = (usd: number): LlmResult => ({ text: '{}', model: 'gemini-3.1-flash-lite', usage: { input: (usd / 0.25) * 1e6 } });
const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('the model gate', () => {
  it('lets only so many calls run at once and hands a freed slot to whoever waits', async () => {
    const model = held();
    const gate = createGate({ maxInFlight: 2, maxQueued: 5, maxWaitMs: 1000 });
    const provider = gate.wrap(model.provider);
    const calls = [1, 2, 3].map(() => provider.complete(layout, { timeoutMs: 5000 }));
    await tick();
    assert.equal(model.seen(), 2);
    assert.deepEqual({ inFlight: gate.stats().inFlight, queued: gate.stats().queued }, { inFlight: 2, queued: 1 });
    model.letGo();
    await tick();
    assert.equal(model.seen(), 3);
    model.letGo();
    model.letGo();
    await Promise.all(calls);
    assert.deepEqual({ inFlight: gate.stats().inFlight, queued: gate.stats().queued }, { inFlight: 0, queued: 0 });
  });

  it('answers busy when the queue is full or no slot frees in time, and frees nothing it never took', async () => {
    const model = held();
    const gate = createGate({ maxInFlight: 1, maxQueued: 1, maxWaitMs: 30 });
    const provider = gate.wrap(model.provider);
    const first = provider.complete(layout, { timeoutMs: 5000 });
    const second = provider.complete(layout, { timeoutMs: 5000 });
    await assert.rejects(provider.complete(layout, { timeoutMs: 5000 }), LlmBusyError);
    await assert.rejects(second, LlmBusyError);
    assert.equal(gate.stats().turnedAway, 2);
    model.letGo();
    await first;
    assert.equal(gate.stats().inFlight, 0);
    // The slot is whole again: the next call runs at once.
    const next = provider.complete(layout, { timeoutMs: 5000 });
    await tick();
    assert.equal(model.seen(), 2);
    model.letGo();
    await next;
  });

  it('turns side work away first: it never queues and keeps a fifth of the slots for replies', async () => {
    const model = held();
    const gate = createGate({ maxInFlight: 5, maxQueued: 5, maxWaitMs: 1000 });
    const provider = gate.wrap(model.provider);
    const side = [1, 2, 3, 4].map(() => provider.complete(layout, { timeoutMs: 5000, priority: 'side' }));
    await assert.rejects(provider.complete(layout, { timeoutMs: 5000, priority: 'side' }), LlmBusyError);
    const talk = provider.complete(layout, { timeoutMs: 5000 });
    await tick();
    assert.equal(model.seen(), 5);
    for (let i = 0; i < 5; i++) model.letGo();
    await Promise.all([...side, talk]);
  });

  it('pauses side work at 80% of the day’s budget and everything at 100%, until the next day', async () => {
    let now = Date.UTC(2026, 10, 10, 12);
    const gate = createGate({ budgetUsdPerDay: 10 }, { now: () => now });
    const provider = gate.wrap({ name: 'paid', complete: async () => costing(4) });
    await provider.complete(layout, { timeoutMs: 5000 });
    await provider.complete(layout, { timeoutMs: 5000, priority: 'side' });
    assert.equal(gate.stats().spentUsd, 8);
    await assert.rejects(provider.complete(layout, { timeoutMs: 5000, priority: 'side' }), /side work is paused/);
    await provider.complete(layout, { timeoutMs: 5000 });
    await assert.rejects(provider.complete(layout, { timeoutMs: 5000 }), /budget is spent/);
    now += 86_400_000;
    await provider.complete(layout, { timeoutMs: 5000, priority: 'side' });
    assert.equal(gate.stats().spentUsd, 4);
  });

  it('takes the database’s count of the day when it is the larger, and keeps its own when the read fails', async () => {
    let total: number | null = 9;
    let fail = false;
    const gate = createGate({ budgetUsdPerDay: 10 }, { spentToday: async () => (fail ? Promise.reject(new Error('down')) : total) });
    const provider = gate.wrap({ name: 'paid', complete: async () => costing(1) });
    await gate.refresh();
    assert.equal(gate.stats().spentUsd, 9);
    await assert.rejects(provider.complete(layout, { timeoutMs: 5000, priority: 'side' }), LlmBusyError);
    await provider.complete(layout, { timeoutMs: 5000 });
    total = 3;
    await gate.refresh();
    assert.equal(gate.stats().spentUsd, 10);
    fail = true;
    await gate.refresh();
    assert.equal(gate.stats().spentUsd, 10);
  });

  it('gives the model what is left of the deadline after the wait', async () => {
    const model = held();
    const gate = createGate({ maxInFlight: 1, maxQueued: 2, maxWaitMs: 1000 });
    let left = 0;
    const provider = gate.wrap({
      name: 'timed',
      complete(l, opts) {
        left = opts.timeoutMs;
        return model.provider.complete(l, opts);
      },
    });
    const first = provider.complete(layout, { timeoutMs: 5000 });
    const second = provider.complete(layout, { timeoutMs: 5000 });
    await new Promise((resolve) => setTimeout(resolve, 60));
    model.letGo();
    await first;
    await tick();
    assert.ok(left < 5000 && left > 4000, `left ${left}`);
    model.letGo();
    await second;
  });
});
