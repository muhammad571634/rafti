import { LlmBusyError, type LlmProvider } from './types.ts';
import { costUsd } from './usage.ts';

/**
 * The brakes on the model's side (docs/scale-plan.md). Without them a slow provider lets requests
 * pile up until the machine runs out of memory, and nothing stops a day's bill.
 */
export interface GateLimits {
  /** Model calls in flight at once, every kind together. */
  maxInFlight: number;
  /** Replies waiting for a free slot; one more is turned away at once. */
  maxQueued: number;
  /** The longest a reply waits for a slot (and never more than half its own deadline). */
  maxWaitMs: number;
  /** A UTC day's spend at list price, in USD, for the whole service; 0 means no cap. */
  budgetUsdPerDay: number;
}

export const GATE_LIMITS: GateLimits = {
  // ~15 in flight is the estimate for 10,000 installs at the evening peak; this leaves room for a slow provider.
  maxInFlight: 120,
  maxQueued: 240,
  maxWaitMs: 6000,
  budgetUsdPerDay: 0,
};

/**
 * The share of the slots and of the day's budget that side work may use (`priority: 'side'`: lines
 * written ahead, streams, the memory pass, drafts). The rest is kept for a person who is talking.
 */
export const SIDE_SHARE = 0.8;

const DAY_MS = 86_400_000;

export interface GateStats {
  inFlight: number;
  queued: number;
  /** Today's spend at list price, as far as this process knows. */
  spentUsd: number;
  calls: number;
  /** Calls turned away here: no slot in time, or the day's budget spent. */
  turnedAway: number;
}

/**
 * One gate for every provider of a process. `spentToday` reads the day's spend from the database,
 * so the cap holds across restarts and machines; without it only this process's own calls count.
 */
export function createGate(limits: Partial<GateLimits> = {}, { now = Date.now, spentToday }: { now?: () => number; spentToday?: () => Promise<number | null> } = {}) {
  const { maxInFlight, maxQueued, maxWaitMs, budgetUsdPerDay } = { ...GATE_LIMITS, ...limits };
  const sideMax = Math.max(1, Math.floor(maxInFlight * SIDE_SHARE));
  const waiting: { start: () => void }[] = [];
  let inFlight = 0;
  let day = Math.floor(now() / DAY_MS);
  let spent = 0;
  let alerted = 0;
  let calls = 0;
  let turnedAway = 0;

  function rollDay() {
    const today = Math.floor(now() / DAY_MS);
    if (today === day) return;
    day = today;
    spent = 0;
    alerted = 0;
  }

  function note(share: number, level: number) {
    if (!budgetUsdPerDay || alerted >= level || spent < budgetUsdPerDay * share) return;
    alerted = level;
    console.warn(`[alert] model budget ${Math.round(share * 100)}% spent: $${spent.toFixed(2)} of $${budgetUsdPerDay} today${level === 1 ? '; side work pauses' : '; every model call answers busy'}`);
  }

  function add(usd: number) {
    rollDay();
    spent += usd;
    note(SIDE_SHARE, 1);
    note(1, 2);
  }

  const refuse = (why: string) => {
    turnedAway += 1;
    return new LlmBusyError(why);
  };

  /** A slot, or `LlmBusyError` when none frees within `waitMs`. */
  function slot(waitMs: number): Promise<void> {
    if (inFlight < maxInFlight) {
      inFlight += 1;
      return Promise.resolve();
    }
    if (waiting.length >= maxQueued) return Promise.reject(refuse('gate: the queue is full'));
    return new Promise((resolve, reject) => {
      const entry = {
        start: () => {
          clearTimeout(timer);
          resolve();
        },
      };
      const timer = setTimeout(() => {
        const i = waiting.indexOf(entry);
        if (i >= 0) waiting.splice(i, 1);
        reject(refuse('gate: no free slot in time'));
      }, waitMs);
      waiting.push(entry);
    });
  }

  /** The slot goes straight to whoever waits longest; only an empty queue frees it. */
  function release() {
    const next = waiting.shift();
    if (next) next.start();
    else inFlight -= 1;
  }

  return {
    wrap(provider: LlmProvider): LlmProvider {
      return {
        name: provider.name,
        async complete(layout, opts) {
          rollDay();
          const side = opts.priority === 'side';
          if (budgetUsdPerDay && spent >= budgetUsdPerDay * (side ? SIDE_SHARE : 1)) throw refuse(side ? 'budget: side work is paused for today' : "budget: today's budget is spent");
          const started = now();
          if (side) {
            // Side work never queues: it gives way and is asked for again later.
            if (inFlight >= sideMax) throw refuse('gate: busy with replies');
            inFlight += 1;
          } else {
            await slot(Math.min(maxWaitMs, opts.timeoutMs / 2));
          }
          calls += 1;
          try {
            const result = await provider.complete(layout, { ...opts, timeoutMs: Math.max(1000, opts.timeoutMs - (now() - started)) });
            add(costUsd(result.model, result.usage) ?? 0);
            return result;
          } finally {
            release();
          }
        },
      };
    },

    /** Reads the day's spend from the database; the larger of the two counts stands. */
    async refresh() {
      if (!spentToday) return;
      try {
        const total = await spentToday();
        rollDay();
        if (total != null && total > spent) {
          spent = total;
          note(SIDE_SHARE, 1);
          note(1, 2);
        }
      } catch (error) {
        console.warn(`[gate] spend not read: ${String((error as Error).message).slice(0, 120)}`);
      }
    },

    stats: (): GateStats => ({ inFlight, queued: waiting.length, spentUsd: spent, calls, turnedAway }),
  };
}
