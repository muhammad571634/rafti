/**
 * How many model calls one account or one address may make, counted in this process's memory (the
 * API runs on one machine). Above it the app gets "busy" and writes its stand-in. A person texting
 * never gets near; the limits are there for a script with the URL, since accounts start anonymous.
 */
export interface ModelLimits {
  userPerMinute: number;
  userPerDay: number;
  addressPerMinute: number;
  addressPerDay: number;
  /** Lines a friend writes first (`/v1/ai/first-text`), per account a day: nobody is waiting on them. */
  firstTextPerDay: number;
  /** Every other call (wallet, sync, bootstrap), per account and per address a minute. */
  dataPerMinute: number;
  addressDataPerMinute: number;
  /** Replies that carry photos, in flight at once: each holds megabytes while the model reads. */
  photosInFlight: number;
  /** Model work nobody is talking through (streams, writes, the memory pass, drafts), per account a day. */
  sidePerDay: number;
  /**
   * The reply allowance (`mayReply` in app.ts): replies a day an account gets beyond the shells it
   * spent that day (hellos, a version asked for again, a wake-up talk are free), and replies on calls
   * (paid in minutes, not per message).
   */
  freeRepliesPerDay: number;
  callRepliesPerDay: number;
}

export const MODEL_LIMITS: ModelLimits = {
  // A stream line every few seconds, or a group's two calls a message, stays well under this.
  userPerMinute: 60,
  userPerDay: 1500,
  // Higher: many people can share one mobile network's address.
  addressPerMinute: 180,
  addressPerDay: 6000,
  // Measured 2026-11-10: about 5 a user a day; an app open writes at most 5 ahead (`MAX_PER_RUN`).
  firstTextPerDay: 80,
  // An app open is a bootstrap, a wallet read and a few syncs; a spend follows each message.
  dataPerMinute: 240,
  addressDataPerMinute: 1200,
  // Up to 3 photos of 2 MB each a reply: 16 at once is under 100 MB of the machine's 512.
  photosInFlight: 16,
  // A heavy day is ~25 memory passes, a stream or two (20-60 lines) and a few writes.
  sidePerDay: 300,
  // Measured 2026-11-10 over 14 days: an account's replies a day stay within a few of its spends
  // (91 to 98, 62 to 61, 58 to 62); one early day had 37 replies on 5 spends.
  freeRepliesPerDay: 40,
  // About half an hour of a call's turns.
  callRepliesPerDay: 300,
};

/** Old windows are swept once this many keys are held, so an attacker's many keys cannot fill the memory. */
const SWEEP_AT = 50_000;

/**
 * True, and counted, while `key` stays within `limit` units (characters read aloud) in the running
 * window; an amount that would go over is refused and not counted.
 */
export function windowBudget(limit: number, windowMs: number, now: () => number = Date.now) {
  const used = new Map<string, { amount: number; resetAt: number }>();
  return (key: string, amount: number) => {
    const t = now();
    let entry = used.get(key);
    if (!entry || entry.resetAt <= t) {
      if (used.size >= SWEEP_AT) {
        for (const [k, e] of used) if (e.resetAt <= t) used.delete(k);
      }
      entry = { amount: 0, resetAt: t + windowMs };
      used.set(key, entry);
    }
    if (entry.amount + amount > limit) return false;
    entry.amount += amount;
    return true;
  };
}

/** True while `key` has made at most `limit` hits in the running window. */
export function windowLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (key: string) => {
    const t = now();
    const hit = hits.get(key);
    if (hit && hit.resetAt > t) {
      hit.count += 1;
      return hit.count <= limit;
    }
    if (hits.size >= SWEEP_AT) {
      for (const [k, h] of hits) if (h.resetAt <= t) hits.delete(k);
    }
    hits.set(key, { count: 1, resetAt: t + windowMs });
    return true;
  };
}
